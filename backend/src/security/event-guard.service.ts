import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { Game, GameStatus } from '../database/entities/game.entity';

/**
 * 이벤트 실행 권한 검증 서비스
 *
 * 이벤트 실행 권한, 속도 제한, 비정상 패턴 탐지
 */
@Injectable()
export class EventGuardService {
  private readonly logger = new Logger(EventGuardService.name);

  // 속도 제한: 게임별 최근 요청 타임스탬프 추적
  private readonly requestHistory = new Map<string, RequestMetrics>();

  // 속도 제한 설정
  private readonly RATE_LIMITS = {
    MAX_REQUESTS_PER_MINUTE: 60,
    MAX_REQUESTS_PER_HOUR: 600,
    MIN_REQUEST_INTERVAL_MS: 100, // 요청 간 최소 간격 (0.1초)
    BURST_THRESHOLD: 10, // 10초 내 최대 요청 수
    BURST_WINDOW_MS: 10_000,
  };

  // 의심스러운 패턴 임계값
  private readonly ANOMALY_THRESHOLDS = {
    MAX_SAME_CHOICE_STREAK: 5, // 동일 선택 연속 실행 최대 횟수
    MAX_RAPID_TURNS: 20, // 1분 내 최대 턴 진행 수
    MAX_TURN_REVERSION_COUNT: 3, // 턴 역행 시도 최대 허용 횟수
  };

  /**
   * 이벤트 실행 권한 검증
   *
   * @param gameId 게임 ID
   * @param userId 사용자 ID (인증 구현 시 사용)
   * @param game 게임 상태
   * @throws ForbiddenException 권한이 없는 경우
   */
  async checkEventPermission(
    gameId: string,
    userId: string | null,
    game: Game,
  ): Promise<void> {
    // 1. 게임 상태 검증
    if (game.status !== GameStatus.PLAYING) {
      this.logger.warn(
        `Event execution denied: game ${gameId} is not in PLAYING state (status: ${game.status})`,
      );
      throw new ForbiddenException(
        `게임이 종료되었습니다. 이벤트를 실행할 수 없습니다. (상태: ${game.status})`,
      );
    }

    // 2. 속도 제한 검증
    await this.checkRateLimit(gameId);

    // 3. 사용자 권한 검증 (Phase 1+: Cognito 인증 구현 시)
    // TODO: Implement user ownership verification
    // if (userId && game.ownerId !== userId) {
    //   throw new ForbiddenException('You do not have permission to modify this game');
    // }

    this.logger.verbose(`Event permission granted for game ${gameId}`);
  }

  /**
   * 속도 제한 검증 (Rate Limiting)
   *
   * @param gameId 게임 ID
   * @throws ForbiddenException 속도 제한 초과 시
   */
  async checkRateLimit(gameId: string): Promise<void> {
    const now = Date.now();
    let metrics = this.requestHistory.get(gameId);

    // 초기화
    if (!metrics) {
      metrics = {
        gameId,
        requestTimestamps: [],
        lastRequestTime: 0,
        totalRequests: 0,
        anomalyScore: 0,
      };
      this.requestHistory.set(gameId, metrics);
    }

    // 1분 이내 요청만 유지 (메모리 관리)
    const oneMinuteAgo = now - 60_000;
    metrics.requestTimestamps = metrics.requestTimestamps.filter(
      (ts) => ts > oneMinuteAgo,
    );

    // 1. 최소 요청 간격 검증 (Burst protection)
    if (metrics.lastRequestTime > 0) {
      const interval = now - metrics.lastRequestTime;
      if (interval < this.RATE_LIMITS.MIN_REQUEST_INTERVAL_MS) {
        this.logger.warn(
          `Rate limit violation: too fast request for game ${gameId} (interval: ${interval}ms)`,
        );
        throw new ForbiddenException(
          `요청이 너무 빠릅니다. ${this.RATE_LIMITS.MIN_REQUEST_INTERVAL_MS}ms 후 다시 시도하세요.`,
        );
      }
    }

    // 2. 분당 요청 제한
    const requestsInLastMinute = metrics.requestTimestamps.length;
    if (requestsInLastMinute >= this.RATE_LIMITS.MAX_REQUESTS_PER_MINUTE) {
      this.logger.warn(
        `Rate limit violation: too many requests for game ${gameId} (${requestsInLastMinute}/min)`,
      );
      throw new ForbiddenException(
        `요청 한도를 초과했습니다. 잠시 후 다시 시도하세요. (분당 최대: ${this.RATE_LIMITS.MAX_REQUESTS_PER_MINUTE})`,
      );
    }

    // 3. Burst 제한 (10초 내 과도한 요청)
    const burstWindowStart = now - this.RATE_LIMITS.BURST_WINDOW_MS;
    const burstRequests = metrics.requestTimestamps.filter(
      (ts) => ts > burstWindowStart,
    ).length;
    if (burstRequests >= this.RATE_LIMITS.BURST_THRESHOLD) {
      this.logger.warn(
        `Burst limit violation: too many requests in short time for game ${gameId} (${burstRequests} in 10s)`,
      );
      throw new ForbiddenException(
        `짧은 시간 내 요청이 너무 많습니다. 잠시 후 다시 시도하세요.`,
      );
    }

    // 요청 기록 업데이트
    metrics.requestTimestamps.push(now);
    metrics.lastRequestTime = now;
    metrics.totalRequests++;

    this.logger.verbose(
      `Rate limit check passed for game ${gameId} (${requestsInLastMinute + 1}/min)`,
    );
  }

  /**
   * 비정상 패턴 탐지
   *
   * @param gameId 게임 ID
   * @param choiceId 선택한 선택지 ID
   * @param currentTurn 현재 턴
   * @returns 의심 점수 (0~100, 높을수록 의심)
   */
  detectAnomalousPattern(
    gameId: string,
    choiceId: number,
    currentTurn: number,
  ): number {
    const metrics = this.requestHistory.get(gameId);
    if (!metrics) {
      return 0;
    }

    let anomalyScore = 0;

    // 1. 동일 선택 연속 실행 탐지
    if (!metrics.choiceHistory) {
      metrics.choiceHistory = [];
    }

    metrics.choiceHistory.push(choiceId);

    // 최근 5개만 유지
    if (metrics.choiceHistory.length > this.ANOMALY_THRESHOLDS.MAX_SAME_CHOICE_STREAK) {
      metrics.choiceHistory.shift();
    }

    const allSame = metrics.choiceHistory.every((id) => id === choiceId);
    if (allSame && metrics.choiceHistory.length >= this.ANOMALY_THRESHOLDS.MAX_SAME_CHOICE_STREAK) {
      anomalyScore += 30;
      this.logger.warn(
        `Anomaly detected: same choice repeated ${metrics.choiceHistory.length} times for game ${gameId}`,
      );
    }

    // 2. 급격한 턴 진행 탐지
    if (!metrics.turnHistory) {
      metrics.turnHistory = [];
    }

    metrics.turnHistory.push({ turn: currentTurn, timestamp: Date.now() });

    // 1분 이내 턴만 유지
    const oneMinuteAgo = Date.now() - 60_000;
    metrics.turnHistory = metrics.turnHistory.filter(
      (entry) => entry.timestamp > oneMinuteAgo,
    );

    if (metrics.turnHistory.length > this.ANOMALY_THRESHOLDS.MAX_RAPID_TURNS) {
      anomalyScore += 40;
      this.logger.warn(
        `Anomaly detected: rapid turn progression for game ${gameId} (${metrics.turnHistory.length} turns in 1 min)`,
      );
    }

    // 3. 턴 역행 탐지 (시간여행 공격)
    if (metrics.lastTurn && currentTurn < metrics.lastTurn) {
      anomalyScore += 50;
      metrics.turnReversionCount = (metrics.turnReversionCount || 0) + 1;
      this.logger.error(
        `Critical anomaly: turn reversion detected for game ${gameId} (${metrics.lastTurn} -> ${currentTurn})`,
      );

      if (metrics.turnReversionCount >= this.ANOMALY_THRESHOLDS.MAX_TURN_REVERSION_COUNT) {
        throw new ForbiddenException(
          `비정상적인 게임 상태 변경이 감지되었습니다. 게임을 다시 시작하세요.`,
        );
      }
    }

    metrics.lastTurn = currentTurn;
    metrics.anomalyScore = anomalyScore;

    if (anomalyScore > 0) {
      this.logger.warn(
        `Anomaly score for game ${gameId}: ${anomalyScore}/100`,
      );
    }

    return anomalyScore;
  }

  /**
   * 선택지 유효성 검증
   *
   * @param choiceId 선택지 ID
   * @param turnNumber 현재 턴
   * @param choiceTurn 선택지가 속한 턴
   * @throws ForbiddenException 유효하지 않은 선택지인 경우
   */
  validateChoiceForTurn(
    choiceId: number,
    turnNumber: number,
    choiceTurn: number,
  ): void {
    if (choiceTurn !== turnNumber) {
      this.logger.warn(
        `Invalid choice: choiceId ${choiceId} is for turn ${choiceTurn}, but current turn is ${turnNumber}`,
      );
      throw new ForbiddenException(
        `현재 턴(${turnNumber})에 맞지 않는 선택지입니다. (선택지 턴: ${choiceTurn})`,
      );
    }
  }

  /**
   * 게임 메트릭 기록 정리 (메모리 관리)
   *
   * 24시간 이상 활동이 없는 게임의 메트릭 삭제
   */
  cleanupStaleMetrics(): void {
    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    let cleaned = 0;

    for (const [gameId, metrics] of this.requestHistory.entries()) {
      if (now - metrics.lastRequestTime > ONE_DAY_MS) {
        this.requestHistory.delete(gameId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} stale game metrics`);
    }
  }

  /**
   * 특정 게임의 메트릭 조회 (디버깅용)
   *
   * @param gameId 게임 ID
   * @returns 메트릭 정보
   */
  getMetrics(gameId: string): RequestMetrics | null {
    return this.requestHistory.get(gameId) || null;
  }

  /**
   * 특정 게임의 메트릭 초기화
   *
   * @param gameId 게임 ID
   */
  resetMetrics(gameId: string): void {
    this.requestHistory.delete(gameId);
    this.logger.debug(`Metrics reset for game ${gameId}`);
  }
}

/**
 * 요청 메트릭 인터페이스
 */
interface RequestMetrics {
  gameId: string;
  requestTimestamps: number[];
  lastRequestTime: number;
  totalRequests: number;
  anomalyScore: number;
  choiceHistory?: number[];
  turnHistory?: Array<{ turn: number; timestamp: number }>;
  lastTurn?: number;
  turnReversionCount?: number;
}
