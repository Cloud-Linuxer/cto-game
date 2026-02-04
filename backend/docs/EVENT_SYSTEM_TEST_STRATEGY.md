# 이벤트 시스템 테스트 전략

## 문서 개요

**목적**: 조건부 랜덤 이벤트 시스템의 품질 보증을 위한 포괄적 테스트 전략
**범위**: Phase 1 (고정 이벤트) → Phase 3 (고도화된 동적 이벤트)
**기준 문서**: `/home/cto-game/backend/docs/EVENT_SYSTEM_DESIGN.md`

---

## 1. 테스트 범위 및 우선순위

### 1.1 Phase별 테스트 계획

| Phase | 구현 범위 | 테스트 우선순위 | 목표 커버리지 |
|-------|-----------|----------------|--------------|
| **Phase 1** | 고정 이벤트 (next_turn 분기) | 🟢 HIGH | 95%+ |
| **Phase 2** | 동적 이벤트 (확률 기반) | 🟡 CRITICAL | 90%+ |
| **Phase 3** | 연쇄 이벤트, 이벤트 히스토리 | 🔵 MEDIUM | 85%+ |

### 1.2 테스트 레벨별 범위

#### 단위 테스트 (Unit Tests)
- **대상**: `checkRandomEvent()`, 조건 체크 로직, 확률 계산
- **목표**: 개별 함수의 정확성 검증
- **커버리지**: 95%+

#### 통합 테스트 (Integration Tests)
- **대상**: 이벤트 발생 → 선택 실행 → 원래 턴 복귀 전체 플로우
- **목표**: 컴포넌트 간 상호작용 검증
- **커버리지**: 90%+

#### E2E 테스트 (End-to-End Tests)
- **대상**: API 엔드포인트를 통한 전체 게임 플로우
- **목표**: 사용자 시나리오 검증
- **커버리지**: 주요 시나리오 100%

---

## 2. 단위 테스트 전략

### 2.1 `checkRandomEvent()` 로직 검증

**테스트 파일**: `game.service.spec.ts`

#### 2.1.1 턴 범위 조건 테스트

```typescript
describe('checkRandomEvent', () => {
  describe('턴 범위 조건 검증', () => {
    it('턴 범위 내에서는 이벤트 발생 가능', async () => {
      const game = createMockGame({ currentTurn: 10, users: 50000 });
      const event = {
        event_id: 'aws_outage',
        trigger_condition: {
          turn_range: [8, 20],
          probability: 1.0, // 100% 확률로 테스트
          user_threshold: 50000
        }
      };

      // Mock Math.random to return 0 (100% trigger)
      jest.spyOn(Math, 'random').mockReturnValue(0);

      const result = await service['checkRandomEvent'](game, 11);

      expect(result).toBeDefined();
      expect(result.event_id).toBe('aws_outage');
    });

    it('턴 범위 미만에서는 이벤트 발생 안 함', async () => {
      const game = createMockGame({ currentTurn: 5 });
      const result = await service['checkRandomEvent'](game, 6);

      expect(result).toBeNull();
    });

    it('턴 범위 초과에서는 이벤트 발생 안 함', async () => {
      const game = createMockGame({ currentTurn: 25 });
      const result = await service['checkRandomEvent'](game, 26);

      expect(result).toBeNull();
    });
  });
});
```

#### 2.1.2 조건부 트리거 테스트

```typescript
describe('조건부 트리거 검증', () => {
  it('cash_below 조건: 현금이 임계값 미만일 때만 발생', async () => {
    const lowCashGame = createMockGame({ cash: 4000000 });
    const event = {
      event_id: 'emergency_funding',
      trigger_condition: {
        cash_below: 5000000,
        turn_range: [10, 23],
        probability: 1.0
      }
    };

    jest.spyOn(Math, 'random').mockReturnValue(0);
    const result = await service['checkRandomEvent'](lowCashGame, 15);

    expect(result).toBeDefined();
  });

  it('cash_below 조건: 현금이 임계값 이상이면 발생 안 함', async () => {
    const highCashGame = createMockGame({ cash: 10000000 });

    jest.spyOn(Math, 'random').mockReturnValue(0);
    const result = await service['checkRandomEvent'](highCashGame, 15);

    expect(result).toBeNull();
  });

  it('user_threshold 조건: 유저 수가 임계값 이상일 때만 발생', async () => {
    const game = createMockGame({ users: 100000 });
    const event = {
      event_id: 'aws_outage',
      trigger_condition: {
        user_threshold: 50000,
        turn_range: [8, 20],
        probability: 1.0
      }
    };

    jest.spyOn(Math, 'random').mockReturnValue(0);
    const result = await service['checkRandomEvent'](game, 10);

    expect(result).toBeDefined();
  });

  it('trust_above 조건: 신뢰도가 임계값 초과일 때만 발생', async () => {
    const game = createMockGame({ trust: 70 });
    const event = {
      event_id: 'security_breach',
      trigger_condition: {
        trust_above: 60,
        turn_range: [5, 18],
        probability: 1.0
      }
    };

    jest.spyOn(Math, 'random').mockReturnValue(0);
    const result = await service['checkRandomEvent'](game, 10);

    expect(result).toBeDefined();
  });

  it('복합 조건: 모든 조건이 충족되어야 발생', async () => {
    const game = createMockGame({
      users: 100000,
      cash: 3000000,
      trust: 70
    });

    jest.spyOn(Math, 'random').mockReturnValue(0);

    // 조건 일부만 충족 시 발생 안 함
    const partialEvent = {
      trigger_condition: {
        user_threshold: 50000,  // ✅ 충족
        cash_below: 2000000,    // ❌ 불충족 (cash: 3M > 2M)
        turn_range: [5, 15],
        probability: 1.0
      }
    };

    const result = await service['checkRandomEvent'](game, 10);
    expect(result).toBeNull();
  });
});
```

#### 2.1.3 확률 계산 테스트 (시드 기반)

```typescript
describe('확률 기반 이벤트 발생', () => {
  beforeEach(() => {
    // Restore Math.random after each test
    jest.restoreAllMocks();
  });

  it('확률 100%: 항상 발생', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0); // 0 < 1.0

    const game = createMockGame({ currentTurn: 10 });
    const event = {
      event_id: 'test_event',
      trigger_condition: {
        turn_range: [8, 20],
        probability: 1.0
      }
    };

    const result = await service['checkRandomEvent'](game, 11);
    expect(result).toBeDefined();
  });

  it('확률 0%: 절대 발생 안 함', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);

    const game = createMockGame({ currentTurn: 10 });
    const event = {
      event_id: 'test_event',
      trigger_condition: {
        turn_range: [8, 20],
        probability: 0.0
      }
    };

    const result = await service['checkRandomEvent'](game, 11);
    expect(result).toBeNull();
  });

  it('확률 15%: 경계값 테스트', async () => {
    const game = createMockGame({ currentTurn: 10 });
    const event = {
      event_id: 'aws_outage',
      trigger_condition: {
        turn_range: [8, 20],
        probability: 0.15
      }
    };

    // Mock random = 0.14 → 발생 (0.14 < 0.15)
    jest.spyOn(Math, 'random').mockReturnValueOnce(0.14);
    let result = await service['checkRandomEvent'](game, 11);
    expect(result).toBeDefined();

    // Mock random = 0.16 → 발생 안 함 (0.16 >= 0.15)
    jest.spyOn(Math, 'random').mockReturnValueOnce(0.16);
    result = await service['checkRandomEvent'](game, 11);
    expect(result).toBeNull();
  });
});
```

### 2.2 이벤트 우선순위 테스트

```typescript
describe('이벤트 우선순위', () => {
  it('여러 이벤트 조건 충족 시 첫 번째 이벤트 반환', async () => {
    const game = createMockGame({
      currentTurn: 10,
      cash: 3000000,
      users: 100000
    });

    jest.spyOn(Math, 'random').mockReturnValue(0); // 100% 확률

    const events = [
      {
        event_id: 'event_1',
        trigger_condition: {
          turn_range: [8, 20],
          probability: 1.0
        }
      },
      {
        event_id: 'event_2',
        trigger_condition: {
          turn_range: [8, 20],
          probability: 1.0
        }
      }
    ];

    // Mock loadRandomEvents to return test events
    jest.spyOn(service as any, 'loadRandomEvents').mockResolvedValue(events);

    const result = await service['checkRandomEvent'](game, 11);

    // 첫 번째 이벤트만 반환되어야 함
    expect(result.event_id).toBe('event_1');
  });
});
```

---

## 3. 통합 테스트 전략

### 3.1 이벤트 발생 → 선택 → 복귀 플로우

**테스트 파일**: `game.service.integration.spec.ts` (신규)

```typescript
describe('GameService - Event Flow Integration', () => {
  let service: GameService;
  let gameRepository: Repository<Game>;
  let choiceRepository: Repository<Choice>;

  beforeEach(async () => {
    // Setup test module with real database connection (SQLite in-memory)
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Game, Turn, Choice, ChoiceHistory],
          synchronize: true
        }),
        TypeOrmModule.forFeature([Game, Turn, Choice, ChoiceHistory])
      ],
      providers: [GameService, TurnService]
    }).compile();

    service = module.get<GameService>(GameService);
    gameRepository = module.get<Repository<Game>>(getRepositoryToken(Game));
    choiceRepository = module.get<Repository<Choice>>(getRepositoryToken(Choice));

    // Seed test data
    await seedEventTestData(choiceRepository);
  });

  describe('정상 플로우: 이벤트 발생 → 선택 → 원래 턴 복귀', () => {
    it('긴급 투자 이벤트 발생 후 원래 턴으로 복귀', async () => {
      // 1. 게임 시작 (턴 1)
      const gameDto = await service.startGame();

      // 2. 현금을 파산 직전으로 설정
      const game = await gameRepository.findOne({
        where: { gameId: gameDto.gameId }
      });
      game.cash = 3000000; // < 5M 임계값
      game.currentTurn = 10;
      await gameRepository.save(game);

      // 3. 다음 턴으로 진행 (이벤트 발생 예상)
      jest.spyOn(Math, 'random').mockReturnValue(0); // 100% 확률

      const choice = await choiceRepository.findOne({
        where: { turnNumber: 10 }
      });
      const result = await service.executeChoice(gameDto.gameId, choice.choiceId);

      // 4. 검증: 이벤트 턴으로 분기
      expect(result.currentTurn).toBe(EMERGENCY_EVENT_TURN); // 예: 900
      expect(result.pendingEvent).toBe('emergency_funding');
      expect(result.returnTurn).toBe(11); // 원래 돌아갈 턴

      // 5. 이벤트 선택지 실행
      const eventChoice = await choiceRepository.findOne({
        where: { turnNumber: EMERGENCY_EVENT_TURN }
      });
      const afterEvent = await service.executeChoice(
        gameDto.gameId,
        eventChoice.choiceId
      );

      // 6. 검증: 원래 턴(11)으로 복귀
      expect(afterEvent.currentTurn).toBe(11);
      expect(afterEvent.pendingEvent).toBeUndefined();
      expect(afterEvent.returnTurn).toBeUndefined();
    });

    it('DR 구성 시 긴급 이벤트 발생 안 함', async () => {
      const gameDto = await service.startGame();

      const game = await gameRepository.findOne({
        where: { gameId: gameDto.gameId }
      });
      game.hasDR = true; // DR 구성 완료
      game.currentTurn = 10;
      await gameRepository.save(game);

      const choice = await choiceRepository.findOne({
        where: { turnNumber: 10, nextTurn: EMERGENCY_TRIGGER_NEXT_TURN }
      });

      const result = await service.executeChoice(gameDto.gameId, choice.choiceId);

      // DR이 있으므로 긴급 이벤트로 분기하지 않음
      expect(result.currentTurn).not.toBe(EMERGENCY_EVENT_TURN);
      expect(result.currentTurn).toBe(EMERGENCY_TRIGGER_NEXT_TURN);
    });
  });
});
```

### 3.2 이벤트 중첩 방지 테스트

```typescript
describe('이벤트 중복 발생 방지', () => {
  it('이미 이벤트 진행 중일 때 추가 이벤트 발생 안 함', async () => {
    const gameDto = await service.startGame();

    const game = await gameRepository.findOne({
      where: { gameId: gameDto.gameId }
    });
    game.pendingEvent = 'aws_outage'; // 이미 이벤트 진행 중
    game.currentTurn = 900; // 이벤트 턴
    await gameRepository.save(game);

    // checkRandomEvent는 pendingEvent가 있으면 null 반환해야 함
    const result = await service['checkRandomEvent'](game, 901);
    expect(result).toBeNull();
  });

  it('같은 이벤트가 연속으로 발생하지 않음 (쿨다운)', async () => {
    // 이벤트 히스토리에 최근 발생 기록이 있으면 발생 안 함
    const gameDto = await service.startGame();

    const game = await gameRepository.findOne({
      where: { gameId: gameDto.gameId }
    });
    game.eventHistory = ['aws_outage:turn10']; // 최근 발생 기록
    game.currentTurn = 12;
    await gameRepository.save(game);

    jest.spyOn(Math, 'random').mockReturnValue(0);

    const result = await service['checkRandomEvent'](game, 13);

    // 같은 이벤트는 쿨다운 기간 동안 발생 안 함
    expect(result).toBeNull();
  });
});
```

---

## 4. 엣지 케이스 테스트

### 4.1 returnTurn 경계값 테스트

```typescript
describe('returnTurn 경계값 처리', () => {
  it('returnTurn이 maxTurns를 초과하면 maxTurns로 제한', async () => {
    const gameDto = await service.startGame();
    const maxTurns = GAME_CONSTANTS.MAX_TURNS; // 예: 25

    const game = await gameRepository.findOne({
      where: { gameId: gameDto.gameId }
    });
    game.currentTurn = 888; // 이벤트 턴
    game.returnTurn = 30; // maxTurns 초과
    await gameRepository.save(game);

    const eventChoice = await choiceRepository.findOne({
      where: { turnNumber: 888 }
    });

    const result = await service.executeChoice(gameDto.gameId, eventChoice.choiceId);

    // returnTurn이 maxTurns를 초과하면 maxTurns로 제한
    expect(result.currentTurn).toBe(maxTurns);
  });

  it('returnTurn이 IPO 턴이면 정상적으로 IPO 턴으로 복귀', async () => {
    const gameDto = await service.startGame();

    const game = await gameRepository.findOne({
      where: { gameId: gameDto.gameId }
    });
    game.currentTurn = 888;
    game.returnTurn = GAME_CONSTANTS.IPO_SELECTION_TURN; // 예: 26
    await gameRepository.save(game);

    const eventChoice = await choiceRepository.findOne({
      where: { turnNumber: 888 }
    });

    const result = await service.executeChoice(gameDto.gameId, eventChoice.choiceId);

    expect(result.currentTurn).toBe(GAME_CONSTANTS.IPO_SELECTION_TURN);
  });
});
```

### 4.2 이벤트 중 게임 종료 조건 테스트

```typescript
describe('이벤트 중 게임 종료 처리', () => {
  it('이벤트 선택으로 파산 시 게임 즉시 종료', async () => {
    const gameDto = await service.startGame();

    const game = await gameRepository.findOne({
      where: { gameId: gameDto.gameId }
    });
    game.cash = 5000000;
    game.currentTurn = 900; // 이벤트 턴
    game.pendingEvent = 'emergency_funding';
    game.returnTurn = 11;
    await gameRepository.save(game);

    // 거절 선택지 (현금 변화 없음 → 파산)
    const rejectChoice = await choiceRepository.findOne({
      where: {
        turnNumber: 900,
        text: { $like: '%거절%' }
      }
    });

    const result = await service.executeChoice(gameDto.gameId, rejectChoice.choiceId);

    // 파산으로 게임 종료 (returnTurn으로 복귀하지 않음)
    expect(result.status).toBe(GameStatus.LOST_BANKRUPT);
  });

  it('이벤트 중 IPO 조건 달성 시 IPO 턴으로 분기', async () => {
    const gameDto = await service.startGame();

    const game = await gameRepository.findOne({
      where: { gameId: gameDto.gameId }
    });
    game.users = 90000; // IPO 임계값 근처
    game.cash = 280000000;
    game.trust = 95;
    game.infrastructure = ['EC2', 'Aurora', 'EKS', 'Aurora Global DB'];
    game.currentTurn = 900;
    game.pendingEvent = 'aws_outage';
    game.returnTurn = 20;
    await gameRepository.save(game);

    // 대규모 투자 선택 (유저 +10K, 현금 +20M)
    const investChoice = await choiceRepository.findOne({
      where: { turnNumber: 900, effects: { users: { $gte: 10000 } } }
    });

    const result = await service.executeChoice(gameDto.gameId, investChoice.choiceId);

    // IPO 조건 달성 → returnTurn 대신 IPO 턴으로 분기
    expect(result.currentTurn).toBe(GAME_CONSTANTS.IPO_SELECTION_TURN);
    expect(result.ipoConditionMet).toBe(true);
  });

  it('이벤트 중 trust < 20 시 서비스 중단으로 종료', async () => {
    const gameDto = await service.startGame();

    const game = await gameRepository.findOne({
      where: { gameId: gameDto.gameId }
    });
    game.trust = 30;
    game.users = 50000;
    game.currentTurn = 900;
    game.pendingEvent = 'security_breach';
    game.returnTurn = 15;
    await gameRepository.save(game);

    // 자체 대응 선택 (trust -40)
    const selfResponseChoice = await choiceRepository.findOne({
      where: { turnNumber: 900, effects: { trust: -40 } }
    });

    const result = await service.executeChoice(gameDto.gameId, selfResponseChoice.choiceId);

    // trust = 30 - 40 = -10 → 서비스 중단
    expect(result.status).toBe(GameStatus.LOST_OUTAGE);
  });
});
```

---

## 5. 확률 테스트 전략 (통계적 검증)

### 5.1 시드 기반 재현 가능한 테스트

```typescript
import seedrandom from 'seedrandom';

describe('확률 이벤트 통계적 검증', () => {
  it('15% 확률 이벤트가 1000회 시뮬레이션에서 120~180회 발생 (95% 신뢰구간)', async () => {
    const seed = 'test-seed-12345';
    const rng = seedrandom(seed);

    // Mock Math.random with seeded random
    jest.spyOn(Math, 'random').mockImplementation(() => rng());

    const game = createMockGame({ currentTurn: 10, users: 100000 });
    const event = {
      event_id: 'aws_outage',
      trigger_condition: {
        turn_range: [8, 20],
        probability: 0.15,
        user_threshold: 50000
      }
    };

    jest.spyOn(service as any, 'loadRandomEvents').mockResolvedValue([event]);

    let triggerCount = 0;
    const trials = 1000;

    for (let i = 0; i < trials; i++) {
      const result = await service['checkRandomEvent'](game, 11);
      if (result) triggerCount++;
    }

    // 95% 신뢰구간: 150 ± 30 (binomial distribution)
    expect(triggerCount).toBeGreaterThanOrEqual(120);
    expect(triggerCount).toBeLessThanOrEqual(180);

    const actualProbability = triggerCount / trials;
    expect(actualProbability).toBeCloseTo(0.15, 1); // ±0.1 오차 허용
  });

  it('재현 가능성: 동일 시드로 동일한 결과 생성', async () => {
    const seed = 'deterministic-seed';

    // First run
    const rng1 = seedrandom(seed);
    jest.spyOn(Math, 'random').mockImplementation(() => rng1());

    const results1: boolean[] = [];
    for (let i = 0; i < 10; i++) {
      const result = await service['checkRandomEvent'](
        createMockGame({ currentTurn: 10 }),
        11
      );
      results1.push(result !== null);
    }

    // Second run with same seed
    const rng2 = seedrandom(seed);
    jest.spyOn(Math, 'random').mockImplementation(() => rng2());

    const results2: boolean[] = [];
    for (let i = 0; i < 10; i++) {
      const result = await service['checkRandomEvent'](
        createMockGame({ currentTurn: 10 }),
        11
      );
      results2.push(result !== null);
    }

    // 동일한 시퀀스 생성
    expect(results1).toEqual(results2);
  });
});
```

### 5.2 이벤트 풀 모킹 전략

```typescript
// test/mocks/event-pool.mock.ts
export const MOCK_EVENT_POOL = {
  disaster_events: [
    {
      event_id: 'aws_outage',
      event_type: 'disaster',
      trigger_condition: {
        turn_range: [8, 20],
        probability: 0.15,
        user_threshold: 50000
      },
      event: '🚨 AWS 리전 장애 발생!',
      choices: [
        {
          id: 'disaster_aws_1',
          text: '멀티 리전 긴급 마이그레이션',
          effects: { cash: -30000000, trust: 10 },
          recovery_time: 1
        },
        {
          id: 'disaster_aws_2',
          text: '복구 대기',
          effects: { users: -30000, trust: -30 },
          recovery_time: 1
        }
      ]
    }
  ],
  opportunity_events: [
    {
      event_id: 'emergency_funding',
      event_type: 'opportunity',
      trigger_condition: {
        cash_below: 5000000,
        turn_range: [10, 23],
        probability: 0.3
      },
      event: '💼 긴급 투자 기회!',
      choices: [
        {
          id: 'emergency_fund_1',
          text: '긴급 투자 수락',
          effects: { cash: 80000000, trust: -20 },
          recovery_time: 0
        }
      ]
    }
  ]
};

// 테스트에서 사용
beforeEach(() => {
  jest.spyOn(service as any, 'loadRandomEvents')
    .mockResolvedValue(MOCK_EVENT_POOL.disaster_events);
});
```

---

## 6. 리그레션 테스트 전략

### 6.1 기존 게임 플로우 영향 검증

**목적**: 이벤트 시스템 추가로 인한 기존 기능 손상 방지

```typescript
describe('Regression: 기존 게임 플로우 호환성', () => {
  it('이벤트가 없는 정상 턴 진행은 영향 없음', async () => {
    // Mock: 이벤트 풀이 비어있음
    jest.spyOn(service as any, 'loadRandomEvents').mockResolvedValue([]);

    const gameDto = await service.startGame();

    // 턴 1 → 2 → 3 정상 진행
    for (let turn = 1; turn <= 3; turn++) {
      const choice = await choiceRepository.findOne({
        where: { turnNumber: turn }
      });

      const result = await service.executeChoice(gameDto.gameId, choice.choiceId);

      // 정상적으로 다음 턴으로 진행
      expect(result.currentTurn).toBe(choice.nextTurn);
      expect(result.pendingEvent).toBeUndefined();
    }
  });

  it('기존 투자 라운드 로직은 정상 작동', async () => {
    jest.spyOn(service as any, 'loadRandomEvents').mockResolvedValue([]);

    const gameDto = await service.startGame();

    const game = await gameRepository.findOne({
      where: { gameId: gameDto.gameId }
    });
    game.trust = 60;
    game.currentTurn = GAME_CONSTANTS.SERIES_A_TURN; // 예: 턴 8
    await gameRepository.save(game);

    const investmentChoice = await choiceRepository.findOne({
      where: {
        turnNumber: GAME_CONSTANTS.SERIES_A_TURN,
        effects: { cash: { $gte: 50000000 } } // Series A 투자
      }
    });

    const result = await service.executeChoice(gameDto.gameId, investmentChoice.choiceId);

    // 투자 성공 검증
    expect(result.cash).toBeGreaterThan(game.cash);
    expect(result.investmentFailed).toBeUndefined();
  });

  it('기존 IPO 플로우는 정상 작동', async () => {
    jest.spyOn(service as any, 'loadRandomEvents').mockResolvedValue([]);

    const gameDto = await service.startGame();

    const game = await gameRepository.findOne({
      where: { gameId: gameDto.gameId }
    });
    game.users = 100000;
    game.cash = 300000000;
    game.trust = 99;
    game.infrastructure = ['EC2', 'Aurora', 'EKS', 'Aurora Global DB'];
    game.currentTurn = 20;
    await gameRepository.save(game);

    const choice = await choiceRepository.findOne({
      where: { turnNumber: 20 }
    });

    const result = await service.executeChoice(gameDto.gameId, choice.choiceId);

    // IPO 조건 달성 → IPO 턴으로 분기
    expect(result.ipoConditionMet).toBe(true);
    expect(result.currentTurn).toBe(GAME_CONSTANTS.IPO_SELECTION_TURN);
  });

  it('기존 게임 종료 조건은 정상 작동', async () => {
    jest.spyOn(service as any, 'loadRandomEvents').mockResolvedValue([]);

    const gameDto = await service.startGame();

    const game = await gameRepository.findOne({
      where: { gameId: gameDto.gameId }
    });
    game.cash = 1000000;
    game.currentTurn = 10;
    await gameRepository.save(game);

    // 파산 유발 선택
    const bankruptChoice = await choiceRepository.findOne({
      where: {
        turnNumber: 10,
        effects: { cash: { $lte: -35000000 } }
      }
    });

    const result = await service.executeChoice(gameDto.gameId, bankruptChoice.choiceId);

    expect(result.status).toBe(GameStatus.LOST_BANKRUPT);
  });
});
```

### 6.2 성능 리그레션 테스트

```typescript
describe('Performance Regression', () => {
  it('이벤트 체크가 게임 진행 성능에 미치는 영향 < 50ms', async () => {
    jest.spyOn(service as any, 'loadRandomEvents')
      .mockResolvedValue(MOCK_EVENT_POOL.disaster_events);

    const gameDto = await service.startGame();
    const choice = await choiceRepository.findOne({
      where: { turnNumber: 1 }
    });

    const startTime = performance.now();

    await service.executeChoice(gameDto.gameId, choice.choiceId);

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // 이벤트 체크 포함 실행 시간 < 50ms
    expect(executionTime).toBeLessThan(50);
  });
});
```

---

## 7. Phase별 테스트 커버리지 목표

### Phase 1: 고정 이벤트 (next_turn 분기)

**목표 커버리지**: 95%+

```yaml
required_tests:
  unit:
    - next_turn 분기 로직 (100% 커버리지)
    - 고정 이벤트 턴 도달 검증
    - returnTurn 저장 및 복귀 로직
  integration:
    - 정상 플로우: 이벤트 → 선택 → 복귀
    - DR 조건 체크
  regression:
    - 기존 턴 진행 플로우 정상 작동

coverage_targets:
  statements: 95%
  branches: 90%
  functions: 100%
  lines: 95%
```

### Phase 2: 동적 이벤트 (확률 기반)

**목표 커버리지**: 90%+

```yaml
required_tests:
  unit:
    - checkRandomEvent() 모든 조건 분기 (100%)
    - 확률 계산 로직 (경계값 포함)
    - 조건부 트리거 검증
    - 이벤트 우선순위
  integration:
    - 확률 기반 이벤트 발생 플로우
    - 이벤트 중복 방지
    - 복합 조건 검증
  statistical:
    - 확률 분포 검증 (시드 기반)
    - 재현 가능성 테스트
  edge_cases:
    - returnTurn 경계값
    - 이벤트 중 게임 종료

coverage_targets:
  statements: 90%
  branches: 85%
  functions: 95%
  lines: 90%
```

### Phase 3: 고도화 (연쇄 이벤트, 히스토리)

**목표 커버리지**: 85%+

```yaml
required_tests:
  unit:
    - 이벤트 히스토리 추적 로직
    - 연쇄 이벤트 트리거 조건
    - 쿨다운 메커니즘
  integration:
    - 이벤트 → 이벤트 연쇄 플로우
    - 히스토리 기반 조건부 발생
  e2e:
    - 전체 게임 플레이 시나리오

coverage_targets:
  statements: 85%
  branches: 80%
  functions: 90%
  lines: 85%
```

---

## 8. 테스트 실행 전략

### 8.1 CI/CD 통합

```yaml
# .github/workflows/test.yml
name: Event System Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd backend
          npm ci

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Run integration tests
        run: npm run test:integration -- --coverage

      - name: Check coverage thresholds
        run: npm run test:coverage-check

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage/lcov.info
          flags: event-system
```

### 8.2 로컬 테스트 스크립트

```json
// backend/package.json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern='.spec.ts$'",
    "test:integration": "jest --testPathPattern='.integration.spec.ts$'",
    "test:e2e": "jest --testPathPattern='.e2e-spec.ts$'",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:coverage-check": "jest --coverage --coverageThreshold='{\"global\":{\"statements\":90,\"branches\":85,\"functions\":90,\"lines\":90}}'"
  }
}
```

### 8.3 테스트 환경 설정

```typescript
// backend/test/jest-setup.ts
import 'reflect-metadata';

// Global test timeout
jest.setTimeout(10000);

// Mock 환경 변수
process.env.NODE_ENV = 'test';

// Seeded random for reproducible tests
global.mockRandomWithSeed = (seed: string) => {
  const seedrandom = require('seedrandom');
  const rng = seedrandom(seed);
  jest.spyOn(Math, 'random').mockImplementation(() => rng());
};

// Cleanup after each test
afterEach(() => {
  jest.restoreAllMocks();
});
```

---

## 9. 테스트 데이터 시딩 전략

### 9.1 이벤트 테스트 데이터

```typescript
// test/seeds/event-test-data.ts
export async function seedEventTestData(
  choiceRepository: Repository<Choice>
) {
  // 긴급 이벤트 턴 (888-890)
  const emergencyChoices = [
    {
      choiceId: 8881,
      turnNumber: 888,
      text: '긴급 DR 구축 (5000만원)',
      effects: { cash: -50000000, trust: 10, infra: ['dr-configured'] },
      nextTurn: null, // returnTurn으로 복귀
      category: 'emergency',
      description: 'AWS 리전 장애 대응'
    },
    {
      choiceId: 8882,
      turnNumber: 888,
      text: '복구 대기',
      effects: { users: -30000, trust: -30, infra: [] },
      nextTurn: null,
      category: 'emergency',
      description: '장애 복구 대기'
    }
  ];

  await choiceRepository.save(emergencyChoices);
}
```

---

## 10. 품질 지표 및 리포팅

### 10.1 커버리지 대시보드

```bash
# 커버리지 리포트 생성
npm run test:cov

# HTML 리포트 확인
open backend/coverage/lcov-report/index.html
```

### 10.2 테스트 품질 메트릭

| 메트릭 | 목표 | 측정 방법 |
|--------|------|-----------|
| 코드 커버리지 | 90%+ | Jest coverage |
| 분기 커버리지 | 85%+ | Jest branch coverage |
| 테스트 실행 시간 | < 30초 | Jest --verbose |
| 플레이키 테스트 | 0% | 100회 반복 실행 |
| 리그레션 방지 | 100% | 기존 테스트 pass |

### 10.3 테스트 리포트 샘플

```
Event System Test Results
==========================

Phase 1: 고정 이벤트
  ✅ next_turn 분기 로직: 15/15 passed
  ✅ 긴급 이벤트 플로우: 8/8 passed
  ✅ returnTurn 복귀: 5/5 passed

Phase 2: 동적 이벤트
  ✅ checkRandomEvent(): 22/22 passed
  ✅ 확률 검증: 12/12 passed
  ✅ 조건부 트리거: 18/18 passed

Phase 3: 엣지 케이스
  ✅ 경계값 테스트: 10/10 passed
  ✅ 게임 종료 조건: 7/7 passed

리그레션 테스트
  ✅ 기존 플로우: 25/25 passed
  ✅ 성능 테스트: 3/3 passed

총 커버리지: 93.2%
  - Statements: 94.5%
  - Branches: 89.8%
  - Functions: 96.1%
  - Lines: 93.8%
```

---

## 11. 문제 해결 가이드

### 11.1 일반적인 테스트 실패 원인

**문제**: 확률 테스트가 불안정함 (flaky)

```typescript
// ❌ 잘못된 방법: Math.random() 직접 사용
it('15% 확률 이벤트 발생', async () => {
  // 실행할 때마다 결과가 다름
  const result = await service['checkRandomEvent'](game, 11);
  expect(result).toBeDefined(); // 가끔 실패
});

// ✅ 올바른 방법: 시드 기반 랜덤 또는 모킹
it('15% 확률 이벤트 발생', async () => {
  jest.spyOn(Math, 'random').mockReturnValue(0.14); // 고정값
  const result = await service['checkRandomEvent'](game, 11);
  expect(result).toBeDefined(); // 항상 통과
});
```

**문제**: 이벤트 풀 로딩 실패

```typescript
// ✅ 해결: Mock 명시적 설정
beforeEach(() => {
  jest.spyOn(service as any, 'loadRandomEvents')
    .mockResolvedValue(MOCK_EVENT_POOL.disaster_events);
});
```

### 11.2 디버깅 팁

```typescript
// 테스트 실행 시 로그 활성화
describe('Event Debug', () => {
  beforeEach(() => {
    // Logger level을 debug로 설정
    process.env.LOG_LEVEL = 'debug';
  });

  it('이벤트 발생 디버깅', async () => {
    const result = await service['checkRandomEvent'](game, 11);

    console.log('Game state:', game);
    console.log('Event result:', result);

    expect(result).toBeDefined();
  });
});
```

---

## 12. 다음 단계

### Phase 1 완료 체크리스트
- [ ] 고정 이벤트 단위 테스트 작성 (95%+ 커버리지)
- [ ] 통합 테스트 작성 (정상 플로우)
- [ ] 리그레션 테스트 작성 (기존 기능 보호)
- [ ] CI/CD 통합

### Phase 2 완료 체크리스트
- [ ] `checkRandomEvent()` 단위 테스트 (100% 커버리지)
- [ ] 확률 통계 테스트 작성
- [ ] 엣지 케이스 테스트 작성
- [ ] 성능 벤치마크 테스트

### Phase 3 완료 체크리스트
- [ ] 연쇄 이벤트 테스트
- [ ] 이벤트 히스토리 테스트
- [ ] E2E 시나리오 테스트
- [ ] 문서화 및 리뷰

---

**문서 버전**: 1.0
**최종 수정**: 2026-02-04
**담당자**: Quality Engineering Team
