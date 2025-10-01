# 조건부 이벤트 시스템 설계

## 개요

갑작스런 장애, 긴급 투자, 랜덤 이벤트를 추가하는 시스템

## 구현 방법

### 1. 간단한 방법: next_turn 분기

**장점**: 코드 수정 없이 데이터만 추가
**단점**: 조건에 따른 동적 이벤트 불가

```json
{
  "turn": 10,
  "event": "턴 10 - 트래픽 급증",
  "choices": [
    {
      "id": 101,
      "text": "EC2 스케일업 (현금 충분)",
      "effects": { "cash": -5000000 },
      "next_turn": 11,
      "condition": { "cash_min": 5000000 }
    },
    {
      "id": 102,
      "text": "오토스케일링 포기 (현금 부족)",
      "effects": { "users": -50000, "trust": -20 },
      "next_turn": 900  // 긴급 상황 턴으로 분기
    }
  ]
},
{
  "turn": 900,
  "event": "🚨 긴급 상황 - 서비스 다운!",
  "event_type": "emergency",
  "choices": [
    {
      "id": 9001,
      "text": "긴급 투자 유치 (지분 30% 양도)",
      "effects": { "cash": 50000000, "trust": -30 },
      "next_turn": 11
    },
    {
      "id": 9002,
      "text": "서비스 축소 운영",
      "effects": { "users": -100000, "cash": 10000000 },
      "next_turn": 11
    }
  ]
}
```

### 2. **추천** - 백엔드 동적 이벤트

#### 데이터 구조 변경

**game_choices_db.json**에 이벤트 풀 추가:

```json
{
  "turns": [ /* 기존 턴 데이터 */ ],
  "random_events": [
    {
      "event_id": "aws_outage",
      "event_type": "disaster",
      "trigger_condition": {
        "turn_range": [8, 20],
        "probability": 0.15,
        "user_threshold": 50000
      },
      "event": "🚨 AWS 리전 장애 발생!\n\nap-northeast-2 리전에 갑작스런 장애...",
      "choices": [
        {
          "id": "disaster_aws_1",
          "text": "멀티 리전 긴급 마이그레이션 (3000만 원)",
          "effects": { "cash": -30000000, "trust": 10 },
          "recovery_time": 1
        },
        {
          "id": "disaster_aws_2",
          "text": "복구 대기 (유저 이탈 발생)",
          "effects": { "users": -30000, "trust": -30 },
          "recovery_time": 1
        }
      ]
    },
    {
      "event_id": "emergency_funding",
      "event_type": "opportunity",
      "trigger_condition": {
        "cash_below": 5000000,
        "turn_range": [10, 23],
        "probability": 0.3
      },
      "event": "💼 긴급 투자 기회!\n\n파산 직전 상황을 본 투자자가 연락...",
      "choices": [
        {
          "id": "emergency_fund_1",
          "text": "긴급 투자 수락 (지분 40% 양도)",
          "effects": { "cash": 80000000, "trust": -20 },
          "recovery_time": 0
        },
        {
          "id": "emergency_fund_2",
          "text": "거절하고 버티기",
          "effects": { "cash": 0 },
          "recovery_time": 0
        }
      ]
    },
    {
      "event_id": "security_breach",
      "event_type": "disaster",
      "trigger_condition": {
        "turn_range": [5, 18],
        "probability": 0.1,
        "trust_above": 60
      },
      "event": "🔒 보안 침해 사고 발생!\n\n개인정보 유출 의심...",
      "choices": [
        {
          "id": "breach_1",
          "text": "전문 보안 컨설팅 고용 (5000만 원)",
          "effects": { "cash": -50000000, "trust": -10 },
          "recovery_time": 1
        },
        {
          "id": "breach_2",
          "text": "자체 대응 (비용 절감, 신뢰 타격)",
          "effects": { "cash": -10000000, "trust": -40 },
          "recovery_time": 2
        }
      ]
    }
  ]
}
```

#### 백엔드 코드 수정

**src/game/game.service.ts** - `executeChoice()` 메서드 수정:

```typescript
async executeChoice(gameId: string, choiceId: number): Promise<GameResponseDto> {
  // 기존 선택 실행 로직...

  // 효과 적용
  game.users += effects.users;
  game.cash += effects.cash;
  game.trust += effects.trust;

  // 다음 턴 결정
  const nextTurn = choice.nextTurn || game.currentTurn + 1;

  // ⭐ 랜덤 이벤트 체크
  const randomEvent = await this.checkRandomEvent(game, nextTurn);

  if (randomEvent) {
    // 랜덤 이벤트 발생 - 특별 턴으로 분기
    game.currentTurn = randomEvent.special_turn_number;
    game.pendingEvent = randomEvent.event_id;
    game.returnTurn = nextTurn; // 이벤트 후 돌아갈 턴 저장
  } else {
    game.currentTurn = nextTurn;
  }

  // 게임 종료 조건 체크
  if (game.cash < 0) {
    game.status = GameStatus.LOST_BANKRUPT;
  }

  await this.gameRepository.save(game);
  return this.toDto(game);
}

private async checkRandomEvent(game: Game, nextTurn: number): Promise<RandomEvent | null> {
  // 랜덤 이벤트 풀 로드
  const events = await this.loadRandomEvents();

  for (const event of events) {
    const condition = event.trigger_condition;

    // 턴 범위 체크
    if (nextTurn < condition.turn_range[0] || nextTurn > condition.turn_range[1]) {
      continue;
    }

    // 조건 체크
    if (condition.cash_below && game.cash >= condition.cash_below) continue;
    if (condition.user_threshold && game.users < condition.user_threshold) continue;
    if (condition.trust_above && game.trust <= condition.trust_above) continue;

    // 확률 체크
    if (Math.random() < condition.probability) {
      return event;
    }
  }

  return null;
}
```

#### 엔티티 수정

**src/database/entities/game.entity.ts**:

```typescript
@Entity('games')
export class Game {
  // 기존 필드들...

  @Column({ nullable: true })
  pendingEvent?: string; // 발생한 랜덤 이벤트 ID

  @Column({ nullable: true })
  returnTurn?: number; // 이벤트 후 돌아갈 원래 턴
}
```

### 3. 예시: 구체적인 이벤트들

#### 긴급 투자 (파산 직전)

```json
{
  "event_id": "emergency_bridge_round",
  "event_type": "opportunity",
  "trigger_condition": {
    "cash_below": 3000000,
    "turn_range": [8, 22]
  },
  "event": "📞 긴급 연락!\n\n'브릿지 라운드 어떠신가요?'\n\n현금: ₩{current_cash}\n필요 금액: 최소 ₩5,000,000",
  "choices": [
    {
      "text": "수락 - ₩30,000,000 (지분 35% 양도)",
      "effects": { "cash": 30000000, "trust": -15 }
    },
    {
      "text": "거절 - 비용 절감 모드로 전환",
      "effects": { "users": -20000, "cash": 5000000 }
    }
  ]
}
```

#### AWS 리전 장애

```json
{
  "event_id": "aws_region_outage",
  "event_type": "disaster",
  "trigger_condition": {
    "turn_range": [10, 20],
    "probability": 0.08,
    "user_threshold": 100000
  },
  "event": "🚨 AWS ap-northeast-2 리전 장애!\n\n서울 리전 전체 다운... 서비스 중단 중\n\n현재 유저: {current_users}명 대기 중",
  "choices": [
    {
      "text": "멀티 리전 긴급 구축 (₩50,000,000)",
      "effects": { "cash": -50000000, "trust": 15, "infra": ["multi-region"] }
    },
    {
      "text": "복구 대기 (6시간, 유저 30% 이탈)",
      "effects": { "users": -30, "trust": -40 }
    },
    {
      "text": "타 클라우드로 긴급 이전 (₩80,000,000)",
      "effects": { "cash": -80000000, "trust": -10, "infra": ["multi-cloud"] }
    }
  ]
}
```

#### 해커 공격

```json
{
  "event_id": "ddos_attack",
  "event_type": "disaster",
  "trigger_condition": {
    "turn_range": [12, 22],
    "probability": 0.12,
    "user_threshold": 200000
  },
  "event": "⚠️ DDoS 공격 감지!\n\n초당 50만 요청... CloudFront 비용 폭증 중\n\n예상 비용: ₩20,000,000/시간",
  "choices": [
    {
      "text": "AWS Shield Advanced 긴급 가입 (₩30,000,000)",
      "effects": { "cash": -30000000, "trust": 5 }
    },
    {
      "text": "일시 서비스 중단 (유저 이탈)",
      "effects": { "users": -50000, "trust": -25 }
    }
  ]
}
```

## 구현 우선순위

### Phase 1: 최소 구현
1. `next_turn` 분기만 사용
2. 고정된 긴급 이벤트 3개 추가 (턴 888, 889, 890)
3. 특정 선택 시 분기

### Phase 2: 동적 이벤트
1. `random_events` 배열 추가
2. `checkRandomEvent()` 로직 구현
3. 확률 기반 이벤트 발생

### Phase 3: 고도화
1. 이벤트 히스토리 추적
2. 연쇄 이벤트 (이벤트 → 이벤트)
3. 플레이어 선택에 따른 이벤트 변화
