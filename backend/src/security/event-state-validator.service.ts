import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { Game, GameStatus } from '../database/entities/game.entity';

/**
 * 게임 상태 무결성 검증 서비스
 *
 * 이벤트 실행 전후 게임 상태의 일관성과 무결성을 검증
 * 클라이언트 조작 및 데이터 위변조 탐지
 */
@Injectable()
export class EventStateValidatorService {
  private readonly logger = new Logger(EventStateValidatorService.name);

  // 게임 메트릭 한계값
  private readonly LIMITS = {
    MAX_USERS: 100_000_000, // 1억
    MIN_USERS: 0,
    MAX_CASH: 1_000_000_000_000, // 1조
    MIN_CASH: -100_000_000_000, // -1000억 (최대 부채)
    MAX_TRUST: 100,
    MIN_TRUST: 0,
    MAX_TURN: 100,
    MIN_TURN: 1,
    MAX_INFRASTRUCTURE: 50,
    MAX_STAFF: 20,
    MAX_RESILIENCE_STACKS: 3,
    MAX_CONSECUTIVE_NEGATIVE_TURNS: 10,
  };

  /**
   * 게임 상태 무결성 검증
   *
   * @param game 검증할 게임 객체
   * @returns 검증 결과 및 오류 메시지
   */
  validateGameState(game: Game): ValidationResult {
    const errors: string[] = [];

    // 1. 기본 필드 존재성 검증
    if (!game.gameId) {
      errors.push('gameId is required');
    }

    // 2. 숫자 범위 검증
    if (!this.isInRange(game.users, this.LIMITS.MIN_USERS, this.LIMITS.MAX_USERS)) {
      errors.push(
        `users out of range: ${game.users} (expected: ${this.LIMITS.MIN_USERS} ~ ${this.LIMITS.MAX_USERS})`,
      );
    }

    if (!this.isInRange(game.cash, this.LIMITS.MIN_CASH, this.LIMITS.MAX_CASH)) {
      errors.push(
        `cash out of range: ${game.cash} (expected: ${this.LIMITS.MIN_CASH} ~ ${this.LIMITS.MAX_CASH})`,
      );
    }

    if (!this.isInRange(game.trust, this.LIMITS.MIN_TRUST, this.LIMITS.MAX_TRUST)) {
      errors.push(
        `trust out of range: ${game.trust} (expected: ${this.LIMITS.MIN_TRUST} ~ ${this.LIMITS.MAX_TRUST})`,
      );
    }

    if (!this.isInRange(game.currentTurn, this.LIMITS.MIN_TURN, this.LIMITS.MAX_TURN)) {
      errors.push(
        `currentTurn out of range: ${game.currentTurn} (expected: ${this.LIMITS.MIN_TURN} ~ ${this.LIMITS.MAX_TURN})`,
      );
    }

    // 3. 배열 크기 검증
    if (!Array.isArray(game.infrastructure)) {
      errors.push('infrastructure must be an array');
    } else if (game.infrastructure.length > this.LIMITS.MAX_INFRASTRUCTURE) {
      errors.push(
        `infrastructure array too large: ${game.infrastructure.length} (max: ${this.LIMITS.MAX_INFRASTRUCTURE})`,
      );
    }

    if (!Array.isArray(game.hiredStaff)) {
      errors.push('hiredStaff must be an array');
    } else if (game.hiredStaff.length > this.LIMITS.MAX_STAFF) {
      errors.push(
        `hiredStaff array too large: ${game.hiredStaff.length} (max: ${this.LIMITS.MAX_STAFF})`,
      );
    }

    // 4. 논리적 일관성 검증
    if (game.users > game.maxUserCapacity * 10) {
      errors.push(
        `users (${game.users}) exceeds 10x maxUserCapacity (${game.maxUserCapacity}): suspicious state`,
      );
    }

    if (game.resilienceStacks > this.LIMITS.MAX_RESILIENCE_STACKS) {
      errors.push(
        `resilienceStacks (${game.resilienceStacks}) exceeds maximum (${this.LIMITS.MAX_RESILIENCE_STACKS})`,
      );
    }

    if (game.consecutiveNegativeCashTurns > this.LIMITS.MAX_CONSECUTIVE_NEGATIVE_TURNS) {
      errors.push(
        `consecutiveNegativeCashTurns (${game.consecutiveNegativeCashTurns}) exceeds maximum (${this.LIMITS.MAX_CONSECUTIVE_NEGATIVE_TURNS})`,
      );
    }

    // 5. Enum 값 검증
    if (!Object.values(GameStatus).includes(game.status)) {
      errors.push(`Invalid game status: ${game.status}`);
    }

    // 6. 비즈니스 규칙 검증
    if (game.equityPercentage < 0 || game.equityPercentage > 100) {
      errors.push(
        `equityPercentage out of range: ${game.equityPercentage} (expected: 0 ~ 100)`,
      );
    }

    if (game.userAcquisitionMultiplier < 0 || game.userAcquisitionMultiplier > 10) {
      errors.push(
        `userAcquisitionMultiplier out of range: ${game.userAcquisitionMultiplier} (expected: 0 ~ 10)`,
      );
    }

    if (game.trustMultiplier < 0 || game.trustMultiplier > 10) {
      errors.push(
        `trustMultiplier out of range: ${game.trustMultiplier} (expected: 0 ~ 10)`,
      );
    }

    const isValid = errors.length === 0;

    if (!isValid) {
      this.logger.warn(
        `Game state validation failed for ${game.gameId}: ${errors.join(', ')}`,
      );
    } else {
      this.logger.verbose(`Game state validation passed for ${game.gameId}`);
    }

    return {
      isValid,
      errors,
      gameId: game.gameId,
      timestamp: new Date(),
    };
  }

  /**
   * 상태 변화 일관성 검증
   *
   * 이벤트 실행 전후 상태 변화가 허용 범위 내인지 검증
   *
   * @param before 이벤트 전 게임 상태
   * @param after 이벤트 후 게임 상태
   * @returns 검증 결과
   */
  validateStateTransition(before: Game, after: Game): ValidationResult {
    const errors: string[] = [];

    if (before.gameId !== after.gameId) {
      errors.push('gameId mismatch: state transition must be for the same game');
      return {
        isValid: false,
        errors,
        gameId: before.gameId,
        timestamp: new Date(),
      };
    }

    // 1. 턴 진행 검증 (1턴씩만 진행 가능)
    const turnDiff = after.currentTurn - before.currentTurn;
    if (turnDiff < 0 || turnDiff > 5) {
      errors.push(
        `Invalid turn progression: ${before.currentTurn} -> ${after.currentTurn} (diff: ${turnDiff})`,
      );
    }

    // 2. 메트릭 변화량 검증 (단일 이벤트로 인한 과도한 변화 탐지)
    const MAX_USER_CHANGE = 5_000_000; // 단일 이벤트 최대 유저 변화
    const MAX_CASH_CHANGE = 100_000_000_000; // 단일 이벤트 최대 자금 변화 (1000억)
    const MAX_TRUST_CHANGE = 50; // 단일 이벤트 최대 신뢰도 변화

    const userChange = Math.abs(after.users - before.users);
    if (userChange > MAX_USER_CHANGE) {
      errors.push(
        `Suspicious user change: ${before.users} -> ${after.users} (change: ${userChange}, max: ${MAX_USER_CHANGE})`,
      );
    }

    const cashChange = Math.abs(after.cash - before.cash);
    if (cashChange > MAX_CASH_CHANGE) {
      errors.push(
        `Suspicious cash change: ${before.cash} -> ${after.cash} (change: ${cashChange}, max: ${MAX_CASH_CHANGE})`,
      );
    }

    const trustChange = Math.abs(after.trust - before.trust);
    if (trustChange > MAX_TRUST_CHANGE) {
      errors.push(
        `Suspicious trust change: ${before.trust} -> ${after.trust} (change: ${trustChange}, max: ${MAX_TRUST_CHANGE})`,
      );
    }

    // 3. 상태 전환 검증 (종료된 게임은 재시작 불가)
    if (before.status !== GameStatus.PLAYING && after.status === GameStatus.PLAYING) {
      errors.push(
        `Invalid status transition: ${before.status} -> ${after.status} (cannot resume finished game)`,
      );
    }

    // 4. 타임스탬프 검증
    if (after.updatedAt < before.updatedAt) {
      errors.push(
        `Timestamp regression: ${before.updatedAt.toISOString()} -> ${after.updatedAt.toISOString()}`,
      );
    }

    const isValid = errors.length === 0;

    if (!isValid) {
      this.logger.warn(
        `State transition validation failed for ${before.gameId}: ${errors.join(', ')}`,
      );
    } else {
      this.logger.verbose(`State transition validation passed for ${before.gameId}`);
    }

    return {
      isValid,
      errors,
      gameId: before.gameId,
      timestamp: new Date(),
    };
  }

  /**
   * 게임 상태 해시 생성 (무결성 검증용)
   *
   * @param game 게임 객체
   * @returns SHA-256 해시
   */
  generateStateHash(game: Game): string {
    const stateData = JSON.stringify({
      gameId: game.gameId,
      currentTurn: game.currentTurn,
      users: game.users,
      cash: game.cash,
      trust: game.trust,
      infrastructure: game.infrastructure.sort(), // 정렬하여 순서 무관
      status: game.status,
      maxUserCapacity: game.maxUserCapacity,
      hiredStaff: game.hiredStaff.sort(),
      resilienceStacks: game.resilienceStacks,
    });

    const hash = createHash('sha256')
      .update(stateData)
      .digest('hex');

    this.logger.debug(
      `Generated state hash for ${game.gameId}: ${hash.substring(0, 16)}...`,
    );

    return hash;
  }

  /**
   * 상태 해시 비교
   *
   * @param game 검증할 게임
   * @param expectedHash 예상 해시
   * @returns 해시 일치 여부
   */
  verifyStateHash(game: Game, expectedHash: string): boolean {
    const actualHash = this.generateStateHash(game);
    const isValid = actualHash === expectedHash;

    if (!isValid) {
      this.logger.error(
        `State hash mismatch for ${game.gameId}: expected ${expectedHash.substring(0, 16)}..., got ${actualHash.substring(0, 16)}...`,
      );
    }

    return isValid;
  }

  /**
   * 이벤트 실행 가능 여부 검증
   *
   * @param game 게임 상태
   * @returns 실행 가능 여부 및 사유
   */
  canExecuteEvent(game: Game): ValidationResult {
    const errors: string[] = [];

    // 1. 게임 상태 검증
    if (game.status !== GameStatus.PLAYING) {
      errors.push(`Game is not in PLAYING state: ${game.status}`);
    }

    // 2. 턴 범위 검증
    if (game.currentTurn < this.LIMITS.MIN_TURN || game.currentTurn > this.LIMITS.MAX_TURN) {
      errors.push(`Current turn out of bounds: ${game.currentTurn}`);
    }

    // 3. 파산 상태 체크
    if (game.cash < this.LIMITS.MIN_CASH) {
      errors.push(`Cash below minimum threshold: ${game.cash}`);
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      gameId: game.gameId,
      timestamp: new Date(),
    };
  }

  /**
   * 숫자 범위 검증 헬퍼
   */
  private isInRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  }
}

/**
 * 검증 결과 인터페이스
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  gameId: string;
  timestamp: Date;
}
