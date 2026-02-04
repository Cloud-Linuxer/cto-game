import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrustHistory, TrustChangeFactor } from '../database/entities/trust-history.entity';
import { TrustHistoryResponseDto } from '../common/dto';

/**
 * 신뢰도 변화 히스토리 기록 요청
 */
export interface RecordTrustChangeRequest {
  gameId: string;
  turnNumber: number;
  trustBefore: number;
  trustAfter: number;
  change: number;
  factors: TrustChangeFactor[];
}

/**
 * TrustHistoryService
 *
 * 신뢰도 변화 히스토리를 추적하고 관리합니다.
 */
@Injectable()
export class TrustHistoryService {
  private readonly logger = new Logger(TrustHistoryService.name);

  // 최대 저장 턴 수 (DB 용량 제한)
  private readonly MAX_TURNS = 25;

  constructor(
    @InjectRepository(TrustHistory)
    private readonly trustHistoryRepository: Repository<TrustHistory>,
  ) {}

  /**
   * 신뢰도 변화 기록
   */
  async record(request: RecordTrustChangeRequest): Promise<TrustHistory> {
    const { gameId, turnNumber, trustBefore, trustAfter, change, factors } = request;

    // 변화가 없으면 기록하지 않음
    if (change === 0 && factors.length === 0) {
      this.logger.debug(`No trust change in turn ${turnNumber}, skipping record`);
      return null;
    }

    const history = new TrustHistory();
    history.gameId = gameId;
    history.turnNumber = turnNumber;
    history.trustBefore = trustBefore;
    history.trustAfter = trustAfter;
    history.change = change;
    history.factors = factors;

    const saved = await this.trustHistoryRepository.save(history);
    this.logger.log(
      `Trust history recorded: gameId=${gameId}, turn=${turnNumber}, change=${change}`,
    );

    return saved;
  }

  /**
   * 게임의 전체 신뢰도 히스토리 조회
   */
  async getHistory(gameId: string): Promise<TrustHistoryResponseDto[]> {
    const histories = await this.trustHistoryRepository.find({
      where: { gameId },
      order: { turnNumber: 'ASC' },
      take: this.MAX_TURNS,
    });

    return histories.map((h) => this.toDto(h));
  }

  /**
   * 특정 턴의 신뢰도 히스토리 조회
   */
  async getHistoryForTurn(gameId: string, turnNumber: number): Promise<TrustHistoryResponseDto | null> {
    const history = await this.trustHistoryRepository.findOne({
      where: { gameId, turnNumber },
    });

    return history ? this.toDto(history) : null;
  }

  /**
   * 게임의 모든 신뢰도 히스토리 삭제
   */
  async deleteHistory(gameId: string): Promise<void> {
    await this.trustHistoryRepository.delete({ gameId });
    this.logger.log(`Trust history deleted: gameId=${gameId}`);
  }

  /**
   * 교육적 메시지 생성
   *
   * 신뢰도 변화 요인에 따라 자동으로 학습 메시지를 생성합니다.
   */
  generateLesson(factors: TrustChangeFactor[]): string {
    // 가장 큰 영향을 준 요인 찾기
    const sortedFactors = [...factors].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

    if (sortedFactors.length === 0) {
      return '신뢰도 변화가 없습니다.';
    }

    const primaryFactor = sortedFactors[0];

    // 요인 타입별 교육적 메시지
    const lessons: Record<string, string[]> = {
      choice: [
        '전략적 선택이 투자자 신뢰에 직접적인 영향을 미칩니다.',
        '비즈니스 의사결정은 단기 성과뿐 아니라 장기 신뢰도를 고려해야 합니다.',
        '투자자는 CTO의 기술적 판단과 리스크 관리 능력을 주시하고 있습니다.',
      ],
      recovery: [
        '회복 메커니즘을 통해 신뢰도를 회복할 수 있습니다.',
        '적극적인 대응이 투자자의 신뢰를 회복시킵니다.',
        '위기 상황에서의 빠른 복구 능력이 장기적 신뢰를 구축합니다.',
      ],
      penalty: [
        '서비스 장애는 신뢰도를 빠르게 떨어뜨립니다. 사전 대비가 중요합니다.',
        '용량 초과는 기술적 부채의 신호입니다. 인프라 투자를 고려하세요.',
        '시스템 불안정은 투자자의 우려를 증가시킵니다.',
        '반복적인 문제는 CTO의 역량에 대한 의문을 불러일으킵니다.',
        '기술적 실패는 비즈니스 신뢰도에 직접적인 타격을 줍니다.',
      ],
      bonus: [
        '지속적인 안정 운영이 장기적 신뢰를 구축합니다.',
        '인프라 투자는 기술적 안정성뿐 아니라 투자자 신뢰도를 높입니다.',
        '예방적 조치가 장기적으로 더 큰 신뢰를 만들어냅니다.',
        '탁월한 시스템 안정성은 투자자에게 강력한 신호입니다.',
      ],
    };

    const typeMessages = lessons[primaryFactor.type] || [];

    if (typeMessages.length === 0) {
      return '신뢰도가 변화했습니다.';
    }

    // 랜덤하게 하나 선택 (시드 기반으로 일관성 유지 가능)
    const messageIndex = Math.abs(primaryFactor.amount) % typeMessages.length;
    return typeMessages[messageIndex];
  }

  /**
   * Entity to DTO 변환
   */
  private toDto(history: TrustHistory): TrustHistoryResponseDto {
    return {
      id: history.id,
      gameId: history.gameId,
      turnNumber: history.turnNumber,
      trustBefore: history.trustBefore,
      trustAfter: history.trustAfter,
      change: history.change,
      factors: history.factors,
      createdAt: history.createdAt,
    };
  }
}
