import { Injectable, Logger } from '@nestjs/common';
import { Game } from '../database/entities/game.entity';
import { GAME_CONSTANTS } from './game-constants';

/**
 * 대안 투자 경로 서비스
 *
 * Series 투자 미달 시 브릿지 파이낸싱, 정부 지원금 등의 대안 경로를 제공합니다.
 *
 * EPIC-04 Feature 6: Alternative Investment Path
 */

export type SeriesTier = 'A' | 'B' | 'C';

export interface AlternativeInvestmentOption {
  type: 'BRIDGE_FINANCING' | 'GOVERNMENT_GRANT';
  available: boolean;
  reason?: string; // Why unavailable
}

@Injectable()
export class AlternativeInvestmentService {
  private readonly logger = new Logger(AlternativeInvestmentService.name);

  /**
   * 브릿지 파이낸싱 사용 가능 여부 체크
   *
   * 조건:
   * - 게임당 최대 2회
   * - Series A/B/C 턴에서만 사용 가능
   */
  canUseBridgeFinancing(game: Game): boolean {
    return game.bridgeFinancingUsed < GAME_CONSTANTS.ALTERNATIVE_INVESTMENT.BRIDGE_MAX_USES;
  }

  /**
   * 정부 지원금 사용 가능 여부 체크
   *
   * 조건:
   * - 게임당 1회만
   * - EKS 또는 AI 인프라(Bedrock/SageMaker) 보유 필요
   * - Series A/B 턴에서만 사용 가능 (Series C는 너무 늦음)
   */
  canUseGovernmentGrant(game: Game): boolean {
    if (game.governmentGrantUsed) {
      return false;
    }

    // Check for required infrastructure (EKS or AI services)
    const hasRequiredInfra =
      game.infrastructure.includes('EKS') ||
      game.infrastructure.includes('Bedrock') ||
      game.infrastructure.includes('SageMaker');

    return hasRequiredInfra;
  }

  /**
   * 대안 투자 옵션 가능 여부 및 사유 조회
   */
  getAvailableOptions(game: Game): {
    bridgeFinancing: AlternativeInvestmentOption;
    governmentGrant: AlternativeInvestmentOption;
  } {
    const bridgeAvailable = this.canUseBridgeFinancing(game);
    const grantAvailable = this.canUseGovernmentGrant(game);

    return {
      bridgeFinancing: {
        type: 'BRIDGE_FINANCING',
        available: bridgeAvailable,
        reason: bridgeAvailable
          ? undefined
          : `이미 ${game.bridgeFinancingUsed}회 사용 (최대 ${GAME_CONSTANTS.ALTERNATIVE_INVESTMENT.BRIDGE_MAX_USES}회)`,
      },
      governmentGrant: {
        type: 'GOVERNMENT_GRANT',
        available: grantAvailable,
        reason: grantAvailable
          ? undefined
          : game.governmentGrantUsed
            ? '이미 정부 지원금을 받았습니다'
            : 'EKS 또는 AI 인프라(Bedrock/SageMaker)가 필요합니다',
      },
    };
  }

  /**
   * 브릿지 파이낸싱 실행
   *
   * 효과:
   * - 정규 투자의 30% 현금 획득
   * - Equity 추가 희석 -5%
   * - Trust 변화 없음
   *
   * @param game 게임 상태
   * @param seriesTier Series 라운드 (A/B/C)
   * @returns 획득한 현금 금액
   */
  executeBridgeFinancing(game: Game, seriesTier: SeriesTier): number {
    if (!this.canUseBridgeFinancing(game)) {
      throw new Error('브릿지 파이낸싱을 더 이상 사용할 수 없습니다');
    }

    const baseAmounts = GAME_CONSTANTS.ALTERNATIVE_INVESTMENT.SERIES_BASE_AMOUNTS;
    const amount = Math.floor(baseAmounts[seriesTier] * GAME_CONSTANTS.ALTERNATIVE_INVESTMENT.BRIDGE_FUNDING_RATIO);

    game.cash += amount;
    game.equityPercentage -= GAME_CONSTANTS.ALTERNATIVE_INVESTMENT.BRIDGE_EQUITY_DILUTION;
    game.bridgeFinancingUsed++;

    this.logger.log(
      `브릿지 파이낸싱 실행: Series ${seriesTier}, 금액=${amount.toLocaleString()}원, ` +
      `Equity 희석=${GAME_CONSTANTS.ALTERNATIVE_INVESTMENT.BRIDGE_EQUITY_DILUTION}%, ` +
      `사용 횟수=${game.bridgeFinancingUsed}/${GAME_CONSTANTS.ALTERNATIVE_INVESTMENT.BRIDGE_MAX_USES}`,
    );

    return amount;
  }

  /**
   * 정부 지원금 실행
   *
   * 효과:
   * - 고정 2억 원 획득
   * - Equity 희석 없음
   * - Trust +3
   * - 다음 턴에 보고서 제출 필요
   *
   * @param game 게임 상태
   * @returns 획득한 현금 금액
   */
  executeGovernmentGrant(game: Game): number {
    if (!this.canUseGovernmentGrant(game)) {
      throw new Error('정부 지원금을 사용할 수 없습니다');
    }

    const amount = GAME_CONSTANTS.ALTERNATIVE_INVESTMENT.GOVERNMENT_GRANT_AMOUNT;
    const trustBonus = GAME_CONSTANTS.ALTERNATIVE_INVESTMENT.GOVERNMENT_GRANT_TRUST_BONUS;

    game.cash += amount;
    game.trust = Math.min(100, game.trust + trustBonus);
    game.governmentGrantUsed = true;
    game.governmentReportRequired = true;

    this.logger.log(
      `정부 지원금 실행: 금액=${amount.toLocaleString()}원, Trust +${trustBonus}, 보고서 제출 필요`,
    );

    return amount;
  }

  /**
   * 정부 보고서 제출 처리
   *
   * @param game 게임 상태
   */
  submitGovernmentReport(game: Game): void {
    if (!game.governmentReportRequired) {
      throw new Error('제출할 보고서가 없습니다');
    }

    game.governmentReportRequired = false;
    this.logger.log('정부 기술 보고서 제출 완료');
  }

  /**
   * Series 라운드에서 trust 기반으로 대안 투자 필요 여부 판단
   *
   * @param currentTrust 현재 신뢰도
   * @param requiredTrust 투자에 필요한 최소 신뢰도
   * @returns true if alternative investment is needed
   */
  needsAlternativeInvestment(currentTrust: number, requiredTrust: number): boolean {
    // Trust가 요구 수준의 60% 미만이면 대안 투자 경로 필요
    const threshold = requiredTrust * GAME_CONSTANTS.ALTERNATIVE_INVESTMENT.TRUST_THRESHOLD_RATIO;
    return currentTrust < threshold;
  }

  /**
   * 브릿지 파이낸싱 선택지 텍스트 생성
   */
  getBridgeFinancingChoiceText(seriesTier: SeriesTier, game: Game): string {
    const baseAmounts = GAME_CONSTANTS.ALTERNATIVE_INVESTMENT.SERIES_BASE_AMOUNTS;
    const amount = Math.floor(baseAmounts[seriesTier] * GAME_CONSTANTS.ALTERNATIVE_INVESTMENT.BRIDGE_FUNDING_RATIO);
    const remaining = GAME_CONSTANTS.ALTERNATIVE_INVESTMENT.BRIDGE_MAX_USES - game.bridgeFinancingUsed;

    return `브릿지 파이낸싱 (기존 투자자 추가 투자)

📈 예상 효과:
- 현금 +${(amount / 100000000).toFixed(1)}억 원
- Equity 추가 희석 -${GAME_CONSTANTS.ALTERNATIVE_INVESTMENT.BRIDGE_EQUITY_DILUTION}%
- 신뢰도 변화 없음

⚠️ 제한: 게임당 ${GAME_CONSTANTS.ALTERNATIVE_INVESTMENT.BRIDGE_MAX_USES}회까지만 사용 가능 (잔여: ${remaining}회)

💼 설명: 기존 투자자들이 다음 라운드까지의 자금을 지원합니다.
정규 투자보다 금액은 적지만, 빠르게 자금을 확보할 수 있습니다.`;
  }

  /**
   * 정부 지원금 선택지 텍스트 생성
   */
  getGovernmentGrantChoiceText(): string {
    const amount = GAME_CONSTANTS.ALTERNATIVE_INVESTMENT.GOVERNMENT_GRANT_AMOUNT;
    const trustBonus = GAME_CONSTANTS.ALTERNATIVE_INVESTMENT.GOVERNMENT_GRANT_TRUST_BONUS;

    return `중소벤처기업부 기술개발 지원 사업 신청

📈 예상 효과:
- 현금 +${(amount / 100000000).toFixed(1)}억 원 (무상 지원)
- Equity 희석 없음
- 신뢰도 +${trustBonus} (정부 인증 효과)

⚠️ 조건:
- 다음 턴에 기술 보고서 제출 필요
- 게임당 1회만 사용 가능

💼 설명: 정부 지원금은 equity를 포기하지 않아도 되지만,
금액이 제한적이고 보고 의무가 있습니다.`;
  }

  /**
   * 정부 보고서 제출 선택지 텍스트 생성
   */
  getGovernmentReportChoiceText(): string {
    return `정부 기술 보고서 제출 (필수)

📝 내용:
- 기술 개발 현황 보고
- 자금 사용 내역 제출

💼 설명: 정부 지원금을 받은 후 의무적으로 제출해야 하는 보고서입니다.
보고서 제출 후 정상적으로 다음 턴을 진행할 수 있습니다.`;
  }
}
