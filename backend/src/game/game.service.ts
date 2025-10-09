import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game, GameStatus } from '../database/entities/game.entity';
import { Choice } from '../database/entities/choice.entity';
import { ChoiceHistory } from '../database/entities/choice-history.entity';
import { GameResponseDto } from '../common/dto';

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,
    @InjectRepository(Choice)
    private readonly choiceRepository: Repository<Choice>,
    @InjectRepository(ChoiceHistory)
    private readonly historyRepository: Repository<ChoiceHistory>,
  ) {}

  /**
   * 새 게임 시작
   */
  async startGame(): Promise<GameResponseDto> {
    const game = new Game();
    game.currentTurn = 1;
    game.users = 0;
    game.cash = 10000000; // 초기 자금 1000만원
    game.trust = 0; // 초기 신뢰도 0
    game.infrastructure = ['EC2'];
    game.status = GameStatus.PLAYING;
    game.investmentRounds = 0; // 투자 라운드 0회
    game.equityPercentage = 100; // 지분율 100%
    game.multiChoiceEnabled = false; // 멀티 선택 비활성화
    game.userAcquisitionMultiplier = 1.0; // 유저 획득 기본 배율
    game.trustMultiplier = 1.0; // 신뢰도 획득 기본 배율
    game.maxUserCapacity = 10000; // 초기 EC2 용량 (2배 상향)
    game.hiredStaff = []; // 채용된 인원 목록

    const savedGame = await this.gameRepository.save(game);
    return this.toDto(savedGame);
  }

  /**
   * 게임 상태 조회
   */
  async getGame(gameId: string): Promise<GameResponseDto> {
    const game = await this.gameRepository.findOne({ where: { gameId } });

    if (!game) {
      throw new NotFoundException(`게임을 찾을 수 없습니다: ${gameId}`);
    }

    return this.toDto(game);
  }

  /**
   * 선택 실행
   */
  async executeChoice(
    gameId: string,
    choiceId: number,
  ): Promise<GameResponseDto> {
    // 1. 게임 조회 및 검증
    const game = await this.gameRepository.findOne({ where: { gameId } });

    if (!game) {
      throw new NotFoundException(`게임을 찾을 수 없습니다: ${gameId}`);
    }

    if (game.status !== GameStatus.PLAYING) {
      throw new BadRequestException(
        `게임이 이미 종료되었습니다: ${game.status}`,
      );
    }

    // 2. 선택지 조회 및 검증
    const choice = await this.choiceRepository.findOne({
      where: { choiceId },
    });

    if (!choice) {
      throw new NotFoundException(`선택지를 찾을 수 없습니다: ${choiceId}`);
    }

    if (choice.turnNumber !== game.currentTurn) {
      throw new BadRequestException(
        `현재 턴(${game.currentTurn})의 선택지가 아닙니다`,
      );
    }

    // 3. 투자 유치 신뢰도 조건 체크
    // 턴 2: 초기 투자자 피칭 (choice ID 8)
    const isEarlyPitching = game.currentTurn === 2 && choiceId === 8;
    let earlyPitchingFailed = false;

    // 시리즈 A, B, C 투자
    const isSeriesAInvestment = game.currentTurn === 12 && choice.effects.cash > 100000000; // 시리즈 A: 5억+ 투자
    const isSeriesBInvestment = game.currentTurn === 18 && choice.effects.cash > 1000000000; // 시리즈 B: 20억+ 투자
    const isSeriesCInvestment = game.currentTurn === 23 && choice.effects.cash > 3000000000; // 시리즈 C: 50억+ 투자

    // 초기 피칭 실패 시 효과 무효화
    if (isEarlyPitching && game.trust < 6) {
      earlyPitchingFailed = true;
      console.log(`[WARNING] 초기 투자 피칭 실패: 신뢰도 ${game.trust}% < 6%`);
    }

    // 신뢰도 조건 미달 시 투자 실패
    if (isSeriesAInvestment && game.trust < 30) {
      throw new BadRequestException(
        `시리즈 A 투자 유치 실패: 신뢰도가 ${game.trust}%로 최소 요구치인 30%에 미달합니다.`,
      );
    }
    if (isSeriesBInvestment && game.trust < 50) {
      throw new BadRequestException(
        `시리즈 B 투자 유치 실패: 신뢰도가 ${game.trust}%로 최소 요구치인 50%에 미달합니다.`,
      );
    }
    if (isSeriesCInvestment && game.trust < 70) {
      throw new BadRequestException(
        `시리즈 C 투자 유치 실패: 신뢰도가 ${game.trust}%로 최소 요구치인 70%에 미달합니다.`,
      );
    }

    // 4. 먼저 현재 용량으로 초과 체크 (인프라 개선 전)
    let capacityExceeded = false;
    if (game.users > game.maxUserCapacity) {
      game.trust = Math.max(0, game.trust - 10);
      capacityExceeded = true;
      console.log(`[CAPACITY CHECK] 턴 시작 시 용량 초과 지속 페널티: users=${game.users}, maxCapacity=${game.maxUserCapacity}, trust penalty=-10`);
    }

    // 5. 인프라 개선 적용 (페널티 적용 후)
    game.infrastructure = this.mergeInfrastructure(
      game.infrastructure,
      choice.effects.infra,
    );

    // DR 구성 여부 체크
    if (choice.effects.infra.includes('dr-configured')) {
      game.hasDR = true;
    }

    // 인프라 개선 감지 - 최대 용량 증가
    // Route53(DNS), CloudWatch(모니터링)은 용량과 무관, S3는 스토리지
    const infraCapacityMap = {
      'EC2': 10000,  // 기본 서버 용량 (2배 상향)
      'Route53': 10000,  // DNS는 용량과 무관, EC2 유지
      'CloudWatch': 10000,  // 모니터링은 용량과 무관, EC2 유지
      'RDS': 25000,  // 데이터베이스 분리 효과
      'S3': 25000,  // 정적 파일 분리 효과
      'Auto Scaling': 50000,  // 자동 확장
      'ECS': 80000,  // 컨테이너 오케스트레이션
      'Aurora': 100000,  // 고성능 DB
      'Redis': 100000,  // 캐시 레이어 추가
      'EKS': 150000,  // 쿠버네티스 클러스터
      'Karpenter': 150000,  // 동적 노드 스케일링
      'Lambda': 200000,  // 서버리스 (2배 상향)
      'Bedrock': 200000,  // AI 서비스
      'Aurora Global DB': 300000,  // 글로벌 DB (2배 상향)
      'CloudFront': 500000,  // CDN (2배 상향)
      'dr-configured': 600000,  // 재해 복구 (2배 상향)
      'multi-region': 1000000,  // 멀티 리전 (2배 상향)
    };

    // 현재 인프라에서 최대 용량 계산
    let maxCapacity = 10000; // 기본값 (EC2 초기 용량 - 2배 상향)
    for (const infra of game.infrastructure) {
      if (infraCapacityMap[infra] && infraCapacityMap[infra] > maxCapacity) {
        maxCapacity = infraCapacityMap[infra];
      }
    }
    game.maxUserCapacity = maxCapacity;

    // 6. 효과 적용
    // 초기 피칭 실패 시 효과 무효화
    if (earlyPitchingFailed) {
      // 피칭 실패: 자금과 신뢰도 효과 무효화
      game.trust = 0; // 신뢰도 0으로 초기화
      console.log(`[PITCHING FAILED] 초기 투자 피칭 실패로 신뢰도 0으로 초기화`);
    } else {
      // 정상 효과 적용
      // 유저 획득 배율 적용 (디자이너 고용 효과)
      const userGain = Math.floor(choice.effects.users * game.userAcquisitionMultiplier);
      const newUserCount = game.users + userGain;

      // 최대 용량 초과 시 장애 발생 (신뢰도 급락)
      if (newUserCount > game.maxUserCapacity) {
        game.users = newUserCount; // 유저는 증가하지만
        game.trust = Math.max(0, game.trust - 10); // 신뢰도 -10 (용량 초과 장애)
        capacityExceeded = true;
        console.log(`[WARNING] 용량 초과! users=${newUserCount}, maxCapacity=${game.maxUserCapacity}, trust penalty=-10`);
      } else {
        game.users = newUserCount;
      }

      game.cash += choice.effects.cash;

      // 신뢰도 배율 적용 (기획자 고용 효과) - 장애 페널티 이후 적용
      const trustGain = Math.floor(choice.effects.trust * game.trustMultiplier);
      game.trust += trustGain;
    }

    // 개발자 고용 감지 (text에 "개발자"와 "채용"이 포함)
    if (choice.text.includes('개발자') && choice.text.includes('채용')) {
      game.multiChoiceEnabled = true;
      if (!game.hiredStaff.includes('개발자')) {
        game.hiredStaff.push('개발자');
      }
      console.log(`[HIRING] 개발자 채용 완료! multiChoiceEnabled=${game.multiChoiceEnabled}`);
    }

    // 디자이너 고용 감지 (text에 "디자이너"와 "채용"이 포함)
    if (choice.text.includes('디자이너') && choice.text.includes('채용')) {
      game.userAcquisitionMultiplier = 2.0; // 2배로 변경
      if (!game.hiredStaff.includes('디자이너')) {
        game.hiredStaff.push('디자이너');
      }
      console.log(`[HIRING] 디자이너 채용 완료! userAcquisitionMultiplier=${game.userAcquisitionMultiplier}`);
    }

    // 기획자 고용 감지 (text에 "기획자"와 "채용"이 포함)
    if (choice.text.includes('기획자') && choice.text.includes('채용')) {
      game.trustMultiplier = 2.0; // 신뢰도 2배
      if (!game.hiredStaff.includes('기획자')) {
        game.hiredStaff.push('기획자');
      }
      console.log(`[HIRING] 기획자 채용 완료! trustMultiplier=${game.trustMultiplier}`);
    }

    // 4. 선택 히스토리 저장
    const history = new ChoiceHistory();
    history.gameId = gameId;
    history.turnNumber = game.currentTurn;
    history.choiceId = choiceId;
    await this.historyRepository.save(history);

    // 4-1. 외부 전문가 투입 선택시 특별 처리 (Choice 68)
    // executeChoice는 인프라 재계산이 없으므로 직접 처리
    let consultingMessage: string | undefined;
    if (choiceId === 68) {
      const oldCapacity = game.maxUserCapacity;
      game.maxUserCapacity = game.maxUserCapacity * 3;
      consultingMessage = `🎯 AWS Solutions Architect 컨설팅 효과가 발생했습니다!\n\n아키텍처의 성능이 극대화되어 병목 현상이 해소되었습니다.\n인프라 수용량이 ${oldCapacity.toLocaleString()}명에서 ${game.maxUserCapacity.toLocaleString()}명으로 3배 증가했습니다.`;
      console.log(`[CONSULTING] 외부 전문가 투입 효과: 수용량 ${oldCapacity} -> ${game.maxUserCapacity} (3배 증가)`);
      console.log(`[CONSULTING] consultingMessage 설정됨:`, consultingMessage);
    }

    // 5. 턴 진행
    let nextTurn = choice.nextTurn;

    // 25턴이 최대 턴이므로, 25턴을 넘어가지 못하도록 제한
    if (nextTurn > 25 && nextTurn !== 888 && nextTurn !== 950) {
      console.log(`[TURN LIMIT] nextTurn(${nextTurn})이 최대 턴(25)을 초과 - 25로 제한`);
      nextTurn = 25; // 25턴에서 게임 종료 처리를 위해 25로 고정
    }

    // 특수 선택지 처리
    if (choiceId === 9502) {
      // 계속하기 선택: IPO 달성 턴으로 돌아가기
      const returnTurn = game.ipoAchievedTurn || game.currentTurn + 1;

      // 25턴 이후로는 갈 수 없으므로 체크
      if (returnTurn > 25) {
        console.log(`[IPO] 계속하기 불가 - 복귀 턴(${returnTurn})이 최대 턴(25)을 초과`);
        // 게임 종료 처리 (IPO 성공과 동일하게 처리)
        game.status = GameStatus.WON_IPO;
        nextTurn = 25; // 25턴에서 종료
      } else {
        nextTurn = returnTurn;
        game.ipoConditionMet = false; // IPO 조건 플래그 해제
        console.log(`[IPO] 계속하기 선택 - 턴 ${nextTurn}으로 복귀`);
      }
    }

    // 긴급 이벤트 체크 (현재 턴이 긴급 이벤트가 아닐 때만)
    const currentIsEmergency = game.currentTurn >= 888 && game.currentTurn <= 890;
    if (nextTurn === 19 && !game.hasDR && !currentIsEmergency) {
      // 턴 18 다음 턴(19)으로 가는데 DR이 없으면 긴급 이벤트 발생
      nextTurn = 888; // 리전 장애 긴급 이벤트 턴
    }

    // IPO 조건 달성 체크 (턴 950이 아닐 때만)
    if (game.currentTurn !== 950 && !game.ipoConditionMet) {
      const ipoConditionsMet = this.checkFullIPOConditions(game);
      if (ipoConditionsMet) {
        game.ipoConditionMet = true;
        game.ipoAchievedTurn = nextTurn; // 다음 턴 번호를 저장 (950으로 이동하기 전 원래 가야 할 턴)
        nextTurn = 950; // IPO 선택 턴으로 이동
        console.log(`[IPO] 조건 달성! 턴 950으로 이동 (복귀 턴: ${game.ipoAchievedTurn})`);
      }
    }

    console.log(`[DEBUG] Before: currentTurn=${game.currentTurn}, nextTurn=${nextTurn}, choiceId=${choiceId}`);

    // 절대적 보장: 게임은 25턴을 넘을 수 없음
    if (nextTurn > 25 && nextTurn !== 888 && nextTurn !== 950) {
      console.log(`[TURN LIMIT ENFORCED] Preventing advancement beyond turn 25. Attempted: ${nextTurn}`);
      nextTurn = 25;
    }

    game.currentTurn = nextTurn;
    console.log(`[DEBUG] After: game.currentTurn=${game.currentTurn}`);

    // 25턴 도달 시 단일 선택만 가능하도록 제한 (24턴에서 25턴으로 진입하는 경우)
    if (game.currentTurn === 25) {
      game.multiChoiceEnabled = false;
      console.log(`[TURN 25] 최종 턴 도달 - 단일 선택만 가능하도록 강제 설정`);
    }

    // 7. 승패 조건 체크 (Turn 950에서는 체크하지 않음 - 선택 턴이므로)
    if (game.currentTurn !== 950) {
      game.status = this.checkGameStatus(game);
      console.log(`[DEBUG] Game status after check: ${game.status}`);
    } else {
      console.log(`[DEBUG] Turn 950 - IPO 선택 턴, 상태 체크 건너뜀`);
    }

    // 25턴 완료 시 게임 종료 처리
    // 25턴에서 선택을 완료한 경우 (어떤 선택이든 게임 종료)
    const previousTurn = history.turnNumber; // 방금 선택한 턴
    if (previousTurn === 25 && game.status === GameStatus.PLAYING) {
      // 25턴에서 선택을 완료한 경우 - nextTurn과 관계없이 게임 종료
      const hasIPO = this.checkIPOConditions(game);
      if (!hasIPO) {
        game.status = GameStatus.LOST_FIRED_CTO;
        console.log(`[TURN 25 COMPLETED] IPO 조건 미충족 - CTO 해고`);
        console.log(`[TURN 25 COMPLETED] users=${game.users}, cash=${game.cash}, trust=${game.trust}`);
      } else {
        // IPO 조건을 충족한 경우
        game.status = GameStatus.WON_IPO;
        console.log(`[TURN 25 COMPLETED] IPO 조건 충족 - IPO 성공!`);
        console.log(`[TURN 25 COMPLETED] users=${game.users}, cash=${game.cash}, trust=${game.trust}`);
      }
    }

    // 7. 게임 상태 저장
    const updatedGame = await this.gameRepository.save(game);
    const dto = this.toDto(updatedGame);

    // 투자 실패 정보 추가
    if (earlyPitchingFailed) {
      dto.investmentFailed = true;
      dto.investmentFailureMessage = '투자에 실패하였습니다. 신뢰도가 부족합니다.';
    }

    // 용량 초과 정보 추가 (게임이 종료된 경우에도 마지막 메시지 표시)
    if (capacityExceeded) {
      dto.capacityExceeded = true;
      dto.capacityExceededMessage = `인프라 용량(${game.maxUserCapacity.toLocaleString()}명)을 초과하여 서비스 장애가 발생했습니다.`;
    }

    // 컨설팅 효과 메시지 추가
    if (consultingMessage) {
      dto.consultingMessage = consultingMessage;
    }

    return dto;
  }

  /**
   * 여러 선택 동시 실행 (1턴에 2개 행동)
   */
  async executeMultipleChoices(
    gameId: string,
    choiceIds: number[],
  ): Promise<GameResponseDto> {
    // 1. 게임 조회 및 검증
    const game = await this.gameRepository.findOne({ where: { gameId } });

    if (!game) {
      throw new NotFoundException(`게임을 찾을 수 없습니다: ${gameId}`);
    }

    if (game.status !== GameStatus.PLAYING) {
      throw new BadRequestException(
        `게임이 이미 종료되었습니다: ${game.status}`,
      );
    }

    const currentTurn = game.currentTurn;
    let capacityExceeded = false;
    let consultingMessage: string | undefined;
    let hasConsultingEffect = false;
    let nextTurn = currentTurn;

    // 2. 모든 선택지 효과를 누적 적용
    for (const choiceId of choiceIds) {
      const choice = await this.choiceRepository.findOne({
        where: { choiceId },
      });

      if (!choice) {
        throw new NotFoundException(`선택지를 찾을 수 없습니다: ${choiceId}`);
      }

      if (choice.turnNumber !== currentTurn) {
        throw new BadRequestException(
          `현재 턴(${currentTurn})의 선택지가 아닙니다`,
        );
      }

      // 인프라 개선 적용
      game.infrastructure = this.mergeInfrastructure(
        game.infrastructure,
        choice.effects.infra,
      );

      // DR 구성 체크
      if (choice.effects.infra.includes('dr-configured')) {
        game.hasDR = true;
      }

      // 효과 누적
      const userGain = Math.floor(choice.effects.users * game.userAcquisitionMultiplier);
      game.users += userGain;
      game.cash += choice.effects.cash;
      const trustGain = Math.floor(choice.effects.trust * game.trustMultiplier);
      game.trust += trustGain;

      // 인원 채용 감지
      if (choice.text.includes('개발자') && choice.text.includes('채용')) {
        game.multiChoiceEnabled = true;
        if (!game.hiredStaff.includes('개발자')) {
          game.hiredStaff.push('개발자');
        }
      }
      if (choice.text.includes('디자이너') && choice.text.includes('채용')) {
        game.userAcquisitionMultiplier = 2.0;
        if (!game.hiredStaff.includes('디자이너')) {
          game.hiredStaff.push('디자이너');
        }
      }
      if (choice.text.includes('기획자') && choice.text.includes('채용')) {
        game.trustMultiplier = 2.0;
        if (!game.hiredStaff.includes('기획자')) {
          game.hiredStaff.push('기획자');
        }
      }

      // 외부 전문가 투입 선택시 특별 처리 (Choice 68)
      if (choiceId === 68) {
        hasConsultingEffect = true;
        console.log(`[MULTI-CONSULTING] Choice 68 감지 - 컨설팅 효과 예정`);
      }

      // 다음 턴 결정 (마지막 선택의 nextTurn 사용)
      nextTurn = choice.nextTurn;

      // 히스토리 저장
      const history = new ChoiceHistory();
      history.gameId = gameId;
      history.turnNumber = currentTurn;
      history.choiceId = choiceId;
      await this.historyRepository.save(history);
    }

    // 3. 먼저 현재 용량으로 초과 체크 (인프라 개선 전)
    if (game.users > game.maxUserCapacity) {
      game.trust = Math.max(0, game.trust - 10);
      capacityExceeded = true;
      console.log(`[MULTI-CAPACITY CHECK] 용량 초과 페널티 적용: users=${game.users}, maxCapacity=${game.maxUserCapacity}, trust penalty=-10`);
    }

    // 4. 인프라 용량 재계산 (페널티 적용 후)
    const infraCapacityMap = {
      'EC2': 10000,  // 기본 서버 용량 (2배 상향)
      'Route53': 10000,  // DNS는 용량과 무관, EC2 유지
      'CloudWatch': 10000,  // 모니터링은 용량과 무관, EC2 유지
      'RDS': 25000,  // 데이터베이스 분리 효과
      'S3': 25000,  // 정적 파일 분리 효과
      'Auto Scaling': 50000,  // 자동 확장
      'ECS': 80000,  // 컨테이너 오케스트레이션
      'Aurora': 100000,  // 고성능 DB
      'Redis': 100000,  // 캐시 레이어 추가
      'EKS': 150000,  // 쿠버네티스 클러스터
      'Karpenter': 150000,  // 동적 노드 스케일링
      'Lambda': 200000,  // 서버리스 (2배 상향)
      'Bedrock': 200000,  // AI 서비스
      'Aurora Global DB': 300000,  // 글로벌 DB (2배 상향)
      'CloudFront': 500000,  // CDN (2배 상향)
      'dr-configured': 600000,  // 재해 복구 (2배 상향)
      'multi-region': 1000000,  // 멀티 리전 (2배 상향)
    };

    let maxCapacity = 10000;  // 기본값 (EC2 초기 용량 - 2배 상향)
    for (const infra of game.infrastructure) {
      if (infraCapacityMap[infra] && infraCapacityMap[infra] > maxCapacity) {
        maxCapacity = infraCapacityMap[infra];
      }
    }
    game.maxUserCapacity = maxCapacity;

    // 4-1. 컨설팅 효과 적용 (Choice 68 - 인프라 용량 계산 후)
    if (hasConsultingEffect) {
      const oldCapacity = game.maxUserCapacity;
      game.maxUserCapacity = game.maxUserCapacity * 3;
      consultingMessage = `🎯 AWS Solutions Architect 컨설팅 효과가 발생했습니다!\n\n아키텍처의 성능이 극대화되어 병목 현상이 해소되었습니다.\n인프라 수용량이 ${oldCapacity.toLocaleString()}명에서 ${game.maxUserCapacity.toLocaleString()}명으로 3배 증가했습니다.`;
      console.log(`[MULTI-CONSULTING] 외부 전문가 투입 효과 적용: 수용량 ${oldCapacity} -> ${game.maxUserCapacity} (3배 증가)`);
      console.log(`[MULTI-CONSULTING] consultingMessage 설정됨:`, consultingMessage);
    }

    // 5. 턴 진행
    const currentIsEmergency = game.currentTurn >= 888 && game.currentTurn <= 890;
    if (nextTurn === 19 && !game.hasDR && !currentIsEmergency) {
      nextTurn = 888;
    }

    // 절대적 보장: 게임은 25턴을 넘을 수 없음
    if (nextTurn > 25 && nextTurn !== 888 && nextTurn !== 950) {
      console.log(`[TURN LIMIT ENFORCED - MULTI] Preventing advancement beyond turn 25. Attempted: ${nextTurn}`);
      nextTurn = 25;
    }

    // 25턴에서 선택을 했다면 이제 게임이 종료되어야 함
    const shouldEndGame = currentTurn === 25 && game.status === GameStatus.PLAYING;

    game.currentTurn = nextTurn;

    // 5-1. 매 턴 용량 초과 지속 체크 (executeMultipleChoices)
    if (game.users > game.maxUserCapacity && !capacityExceeded) {
      game.trust = Math.max(0, game.trust - 10);
      capacityExceeded = true;
      console.log(`[MULTI-CAPACITY CHECK] 매 턴 용량 초과 지속 페널티: users=${game.users}, maxCapacity=${game.maxUserCapacity}, trust penalty=-10`);
    }

    // 6. 승패 조건 체크
    game.status = this.checkGameStatus(game);

    // 25턴에서 선택을 완료했다면 게임 종료
    if (shouldEndGame) {
      const hasIPO = this.checkIPOConditions(game);
      if (!hasIPO) {
        game.status = GameStatus.LOST_FIRED_CTO;
        console.log(`[TURN 25 COMPLETED - MULTI] IPO 조건 미충족 - CTO 해고`);
        console.log(`[TURN 25 COMPLETED - MULTI] users=${game.users}, cash=${game.cash}, trust=${game.trust}`);
      } else {
        game.status = GameStatus.WON_IPO;
        console.log(`[TURN 25 COMPLETED - MULTI] IPO 조건 충족 - IPO 성공!`);
        console.log(`[TURN 25 COMPLETED - MULTI] users=${game.users}, cash=${game.cash}, trust=${game.trust}`);
      }
    }

    // 7. 게임 상태 저장
    const updatedGame = await this.gameRepository.save(game);
    const dto = this.toDto(updatedGame);

    if (capacityExceeded) {
      dto.capacityExceeded = true;
      dto.capacityExceededMessage = `인프라 용량(${game.maxUserCapacity.toLocaleString()}명)을 초과하여 서비스 장애가 발생했습니다.`;
    }

    // 컨설팅 효과 메시지 추가
    if (consultingMessage) {
      dto.consultingMessage = consultingMessage;
    }

    return dto;
  }

  /**
   * 게임 삭제
   */
  async deleteGame(gameId: string): Promise<void> {
    const result = await this.gameRepository.delete({ gameId });

    if (result.affected === 0) {
      throw new NotFoundException(`게임을 찾을 수 없습니다: ${gameId}`);
    }
  }

  /**
   * 인프라 병합 (중복 제거)
   */
  private mergeInfrastructure(
    current: string[],
    additions: string[],
  ): string[] {
    const merged = new Set([...current, ...additions]);
    return Array.from(merged);
  }

  /**
   * 승패 조건 체크
   */
  private checkGameStatus(game: Game): GameStatus {
    // 실패 조건 체크 (우선순위 높음)
    if (game.cash < 0) {
      return GameStatus.LOST_BANKRUPT; // 파산
    }

    if (game.users > 0 && game.trust < 20) {
      return GameStatus.LOST_OUTAGE; // 서버 다운 → 신뢰도 급락 (회생 불가)
    }

    if (game.equityPercentage < 20) {
      return GameStatus.LOST_EQUITY; // 투자자에게 지분 빼앗김 (80% 초과 희석)
    }

    // 긴급 이벤트 턴은 게임 종료 조건에서 제외 (888, 889, 890)
    const isEmergencyEvent = game.currentTurn >= 888 && game.currentTurn <= 890;

    // 25턴 도달 시 IPO 조건 체크 (긴급 이벤트 제외)
    if (game.currentTurn >= 25 && !isEmergencyEvent) {
      const hasIPO = this.checkIPOConditions(game);
      if (!hasIPO) {
        return GameStatus.LOST_FIRED_CTO; // CTO 해고 - 25턴까지 IPO 목표 달성 실패
      }
    }

    // 성공 조건 체크 (IPO 성공) - 턴 950(IPO 선택 턴)이 아닐 때만
    if (game.currentTurn !== 950) {
      if (
        game.users >= 100000 &&
        game.cash >= 300000000 &&
        game.trust >= 80 &&
        game.infrastructure.includes('RDS') &&
        game.infrastructure.includes('EKS')
      ) {
        // 턴 999 (최종 성공 엔딩)에서만 WON_IPO 반환
        if (game.currentTurn === 999) {
          return GameStatus.WON_IPO;
        }
      }
    }

    // 게임 진행 중
    return GameStatus.PLAYING;
  }

  /**
   * IPO 조건 확인 (기본)
   */
  private checkIPOConditions(game: Game): boolean {
    return game.users >= 100000 && game.cash >= 300000000 && game.trust >= 80;
  }

  /**
   * 완전한 IPO 조건 확인 (인프라 포함)
   */
  private checkFullIPOConditions(game: Game): boolean {
    // 디버깅: 현재 게임 상태 로깅
    console.log(`[IPO DEBUG] Turn ${game.currentTurn} 상태:`);
    console.log(`  - Users: ${game.users} (필요: 100000)`);
    console.log(`  - Cash: ${game.cash} (필요: 300000000)`);
    console.log(`  - Trust: ${game.trust} (필요: 80)`);
    console.log(`  - Infrastructure: ${JSON.stringify(game.infrastructure)}`);
    console.log(`  - Has RDS: ${game.infrastructure.includes('RDS')}`);
    console.log(`  - Has EKS: ${game.infrastructure.includes('EKS')}`);

    const usersCheck = game.users >= 100000;
    const cashCheck = game.cash >= 300000000;
    const trustCheck = game.trust >= 80;
    const dbCheck = game.infrastructure.includes('RDS'); // RDS로 변경 (Aurora Global DB는 게임에 존재하지 않음)
    const eksCheck = game.infrastructure.includes('EKS');

    console.log(`[IPO DEBUG] 조건 체크 결과:`);
    console.log(`  - Users ✓: ${usersCheck}`);
    console.log(`  - Cash ✓: ${cashCheck}`);
    console.log(`  - Trust ✓: ${trustCheck}`);
    console.log(`  - RDS ✓: ${dbCheck}`);
    console.log(`  - EKS ✓: ${eksCheck}`);

    const result = usersCheck && cashCheck && trustCheck && dbCheck && eksCheck;
    console.log(`[IPO DEBUG] 최종 결과: ${result}`);

    return result;
  }

  /**
   * Entity to DTO 변환
   */
  private toDto(game: Game): GameResponseDto {
    return {
      gameId: game.gameId,
      currentTurn: game.currentTurn,
      users: game.users,
      cash: game.cash,
      trust: game.trust,
      infrastructure: game.infrastructure,
      status: game.status,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
      maxUserCapacity: game.maxUserCapacity,
      hiredStaff: game.hiredStaff,
      multiChoiceEnabled: game.multiChoiceEnabled,
    };
  }
}
