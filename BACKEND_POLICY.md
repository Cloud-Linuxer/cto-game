# AWS CTO 인프라 교육 게임 — 백엔드 정책 문서 (Backend Policy)

본 문서는 **36턴 턴제** AWS 인프라 교육 게임의 **백엔드 규칙/상태모델/계산식/이벤트/데이터 스키마/API 사양**을 완전하게 정의합니다.
목표: **결정 → 시뮬레이션 → 지표 갱신 → 실패/성공 판정**을 **재현 가능(Deterministic)** 하고 **튜닝 가능(Config-Driven)** 하게 구현.

---

## 0. 용어 및 범위

- **턴(Turn)**: 1개월. 총 36턴.
- **주 이벤트(Major Event)**: 3턴마다(3,6,...,36) 고정 발생, 총 12회.
- **랜덤 이벤트(Micro Event)**: 매턴 확률적으로 발생(기본 20%).
- **기본 액션(Basic Action)**: 매턴 항상 제공 — `do_nothing`, `ec2_add`, `ec2_remove`.
- **서비스 액션(Service Action)**: AWS 번들/기능 추가/업그레이드(예: RDS, ALB, WAF 등).
- **최적화 액션(Ops Action)**: 비용/성능/운영 최적화(예: RI 구매, 쿼리 튜닝).
- **전략 액션(Strategy Action)**: 채용, 투자 유치, 글로벌 확장 등 메타 결정.
- **지연 이벤트(Delayed Event)**: "2턴 뒤 MAU +30%"같이 타이머가 있는 효과.

---

## 1. 핵심 지표 (KPI) 및 상태

### 1.1 상태(State) 필드

- `turn: int (1..36)`
- `mau: int >= 0` — Monthly Active Users
- `latency_ms: float >= 0` — 평균 응답속도
- `security: int 0..100` — 보안 점수
- `cash: int` — 보유 현금
- `burn_monthly: int` — 월간 총 비용(예상 청구)
- `action_cap: int` — 이번 턴에 수행 가능한 **주요 액션 수** (기본 1, 최대 2)
- `resources: map` — 설치/설정된 리소스 상태(아래 1.2)
- `modifiers: map` — 일시/지속적 버프·디버프(예: RI 할인율, 버그 페널티 등)
- `timers: { bankruptIn?: int, slaFailIn?: int }` — 실패 타이머(없으면 null)
- `queue_delayed: DelayedEvent[]` — 지연 이벤트 큐
- `rng_seed: string` — 재현을 위한 시드(게임 생성 시 고정)
- `history_hash: string` — 무결성 체크용 연쇄 해시(리플레이 검증)

### 1.2 리소스/번들 플래그

```json
{
  "ec2_count": 1,
  "alb": false,
  "rds": false,
  "rds_multi_az": false,
  "elasticache": false,
  "cloudfront": false,
  "autoscaling": false,
  "waf": false,
  "net_private_nat": false,   // Private Subnet + NAT
  "obs": false,               // CloudWatch/GuardDuty/CloudTrail 번들
  "ri_discount": 0.0,         // 0.0~0.8
  "graviton": false,          // 비용 -20% 가정
  "serverless_path": false,   // 병행 분기 허용(선택사항)
  "container_path": false     // ECS/EKS 선택(선택사항)
}
```

---

## 2. 밸런싱 상수 (Config-Driven)

YAML 등 외부 설정으로 주입하며 **런타임 핫스왑 금지(저장게임과 불일치 위험)**. `config_version`으로 호환성 관리.

```yaml
config_version: 1
game:
  max_turns: 36
  major_event_interval: 3
  micro_event_prob: 0.20
  starting:
    mau: 10000
    latency_ms: 280
    security: 40
    cash: 500
    burn_monthly: 50
    ec2_count: 1
    action_cap: 1
growth:
  base_mau_rate: 0.02          # 매턴 +2%
  latency_floor: 120
  latency_ceiling: 800
  security_decay_per_turn: 1
cost:
  ec2_monthly: 50
  alb_monthly: 20
  rds_monthly: 60
  rds_multi_az_extra: 60
  elasticache_monthly: 80
  cloudfront_monthly: 25
  waf_monthly: 15
  net_private_nat_monthly: 30
  autoscaling_base: 10
  obs_monthly: 12
  gravitON_discount: 0.20      # 비용 20% 절감
  ri_discount: 0.20            # RI 구매시 고정 할인
performance:
  alb_bonus_ms: -30
  rds_bonus_ms: -15
  rds_multi_az_bonus_ms: -10
  elasticache_bonus_ms: -70
  cloudfront_bonus_ms: -40
  autoscaling_stability_ms: -25  # 피크 시 가산되는 안정화 효과
  ec2_add_bonus_ms: -20
  ec2_remove_penalty_ms: 30
security_bonus:
  rds_bonus: 5
  waf_bonus: 15
  net_private_nat_bonus: 8
  obs_bonus: 12
  multi_az_bonus: 12
sla:
  warn_latency_ms: 300
  fail_latency_ms: 350
  fail_streak_required: 3
bankruptcy_grace_turns: 2
event_security_thresholds:
  audit_warn: 50
  audit_fail: 60
```

---

## 3. 공식(Formula)

### 3.1 MAU 성장

```
mau_{t+1} = floor( mau_t * (1 + base_rate + Σevent_rateΔ + Σaction_rateΔ - penalty_from_latency) )
```

- `penalty_from_latency`: `latency_ms > 300`이면 `-0.02`(–2%p), `> 400`이면 `-0.05`.
- CDN/Cache/ALB/WAF는 각각 `+0.01~0.02` 성장 보정(옵션).

### 3.2 Latency 계산(하향식 단순 모델)

```
latency_raw = 400
  + min(0, alb_bonus)         # 음수(개선치)
  + rds_bonus + rds_multi_az_bonus
  + elasticache_bonus + cloudfront_bonus
  + ec2_count * ec2_add_bonus
  + autoscaling_stability_ms(if peak)
  + penalties_from_overload
```

- `penalties_from_overload`: 용량 부족 시 `+ (overload_factor * 100)`
- 바운딩: `latency_ms = clamp(latency_raw, latency_floor, latency_ceiling)`

**간단 용량 모델**:

- `capacity_rps = ec2_count * base_rps_per_ec2` (기본 100 rps 가정)
- `required_rps ≈ mau * requests_per_user_per_min / (minutes_in_month)` (교육 목적 단순화: 상수 k 사용)
- `overload_factor = max(0, required_rps - capacity_rps) / capacity_rps`

### 3.3 비용(Burn) 계산

```
burn = sum(monthly_cost(resource_flags)) * (1 - ri_discount - graviton_discount)
       + autoscaling_variable_cost(peak_handling)
```

- `ri_discount`와 `graviton_discount`는 누적 적용 전 상한 60% 캡.
- 오토스케일 가변비: 피크 처리에 필요한 임시 인스턴스 시간 × 단가(단순화 상수).

### 3.4 보안(Security) 점수

```
security_{t+1} = clamp( security_t
  - decay_per_turn
  + Σ(bundle_bonuses)
  + Σ(event_effects) , 0..100 )
```

- `obs` 보유 시 `decay_per_turn = 0`.

### 3.5 실패 타이머

- **파산**: `cash < 0`인 턴 시작 시 `bankruptIn = 2` 설정, 이후 +1턴마다 `-1` 감소. `0`이면 Game Over. `cash >= 0` 회복 시 즉시 `null`.
- **SLA 실패**: `latency_ms > fail_latency_ms`인 턴 연속 `fail_streak++`; `<= warn`이면 `fail_streak = 0`. `fail_streak >= 3`이면 Game Over.

---

## 4. 액션 카탈로그

### 4.1 기본 액션 (항상 가능)

| code | 효과 | 제약 |
|---|---|---|
| `do_nothing` | 변화 없음(자연 성장/감소만) | 없음 |
| `ec2_add` | `ec2_count+1`, `burn+50`, `latency-20ms` | 최대 50대 캡 |
| `ec2_remove` | `ec2_count-1`, `burn-50`, `latency+30ms` | 0 미만 금지 |

### 4.2 서비스 액션

| code | 효과 | 선행조건/쿨다운 |
|---|---|---|
| `enable_rds` | `rds=true`, `burn+60`, `latency-15ms`, `security+5` | 1/게임 |
| `enable_rds_multi_az` | `rds_multi_az=true`, `burn+60`, `latency-10ms`, `security+12` | `rds=true` |
| `enable_alb` | `alb=true`, `burn+20`, `latency-30ms` | 1/게임 |
| `enable_elasticache` | `elasticache=true`, `burn+80`, `latency-70ms` | 1/게임 |
| `enable_cloudfront` | `cloudfront=true`, `burn+25`, `latency-40ms`, MAU 성장 +1%p | 1/게임 |
| `enable_autoscaling` | `autoscaling=true`, `burn+10`, 피크 시 `latency -25ms` | 1/게임 |
| `enable_waf` | `waf=true`, `burn+15`, `security+15` | 1/게임 |
| `enable_net_private_nat` | `net_private_nat=true`, `burn+30`, `security+8` | 1/게임 |
| `enable_obs` | `obs=true`, `burn+12`, `security+12`, decay 0 | 1/게임 |

### 4.3 최적화 액션

| code | 효과 | 비고 |
|---|---|---|
| `buy_ri` | `ri_discount += 0.20` (상한 0.40) | 2회까지 누적 |
| `migrate_graviton` | `graviton=true` → 비용 -20% | 1회 |
| `query_tuning` | `latency-10ms` | 쿨다운 3턴 |
| `cleanup_unused` | `burn-30` | 쿨다운 3턴 |

### 4.4 전략 액션

| code | 효과 | 제약 |
|---|---|---|
| `hire_developer` | `action_cap = min(2, action_cap+1)` | 1회 |
| `raise_funding` | `cash + 300~500` | 확률 판정 |
| `expand_region` | 멀티리전 효과(이벤트 완화, 비용+200) | 엔드게임 |

> **턴당 액션 수**: 기본 1개. `hire_developer` 후 2개 가능. 이벤트 대응 선택은 별도 슬롯(정책으로 분리 가능).

---

## 5. 이벤트 시스템

### 5.1 주 이벤트(12개, 3턴마다)

| turn | id | 설명 | 체크/선행 | 효과/선택지 예시 |
|---|---|---|---|---|
| 3 | `tutorial_rds_alb` | 튜토리얼 고정: RDS/ALB 안내 | - | 강제 분기: RDS → ALB |
| 6 | `traffic_surge_x3` | 트래픽 3배 | autoscaling 없으면 페널티 | [스케일(비용↑) / 무시(지연↑, MAU↓)] |
| 9 | `security_audit` | 보안 감사 | `security<50` 경고, `<60` 벌금 | [WAF즉시/패스벌금] |
| 12 | `global_users` | 글로벌 유입 | CDN 없으면 지연↑ | [CloudFront 도입/유지] |
| 15 | `cost_review` | 비용 점검 | `burn/MAU` 비정상 | [RI구매/정리/무시] |
| 18 | `db_pressure` | DB 쓰기 폭증 | 캐시 없음 페널티 | [ElastiCache 도입/DB스케일] |
| 21 | `competitor` | 경쟁사 등장 | - | 성장률 -2%p(지속), 성능/보안 상쇄 |
| 24 | `black_friday` | 트래픽 5배 | - | 사전 경고(23턴) |
| 27 | `ddos_attempt` | DDoS 시도 | WAF 없으면 사고확률↑ | [WAF즉시/비상스케일] |
| 30 | `compliance_audit` | 규제 감사 | Obs 없으면 벌금 | [Obs즉시/벌금] |
| 33 | `data_explosion` | 데이터 폭증 | RDSSingle 페널티 | [Multi-AZ/샤딩(추상)] |
| 36 | `final_review` | 연말 결산 | - | 최종 판정 |

### 5.2 랜덤 이벤트(매턴 20%)

| id | 조건 | 효과 |
|---|---|---|
| `delayed_mau_plus30` | - | 2턴 뒤 `MAU +30%` 등록 |
| `funding` | security≥60 & latency≤250 | `cash + 200~500` |
| `hire_dev` | cash≥100 | `action_cap+1`(최대 2) |
| `bug_regression` | - | `latency +60ms (1턴)` |
| `cost_anomaly` | - | `burn +50 (1턴)` |
| `minor_breach` | security<40 | `MAU -10%`, `cash -100` |

### 5.3 지연 이벤트 큐

- 필드: `id, due_turn, payload, applied:false`
- 턴 시작 시 `due_turn == current` 모두 적용 후 `applied=true` 마킹.

---

## 6. 턴 처리 알고리즘 (의사코드)

```pseudo
function run_turn(game_id, actions[]):
  state = load_state(game_id)
  assert state.turn <= 36

  apply_delayed_events(state)

  // ACTION PHASE
  assert len(actions) <= state.action_cap
  for a in actions:
    validate_prereq_and_cooldown(state, a)
    apply_action(state, a)
    record_action(game_id, state.turn, a)

  // METRICS UPDATE
  recompute_burn(state)
  compute_capacity_and_overload(state)
  compute_latency(state)
  apply_growth_mau(state)
  apply_security_decay_and_caps(state)

  // MAJOR EVENT
  if state.turn % major_event_interval == 0:
    e = draw_major_event(state)
    resolve_event_with_choice(state, e)  // if player choice API, store pending -> resolve

  // MICRO EVENT
  if roll_prob(micro_event_prob, state.rng_seed, state.turn):
    me = draw_micro_event(state)
    apply_micro_event(state, me)

  // FAILURE TIMERS
  update_failure_timers(state)

  // ADVANCE TURN
  save_snapshot(game_id, state)
  state.turn += 1
  persist_state(game_id, state)
```

**결정론적 RNG**: `rng = PRNG(seed = game_uuid + user_id + config_version)` → `(turn, step, key)` 기반 서브시드 파생.

---

## 7. DB 스키마 (PostgreSQL)

```sql
-- ENUMS
CREATE TYPE event_type AS ENUM ('MAJOR', 'MICRO', 'DELAYED');
CREATE TYPE action_type AS ENUM ('BASIC','SERVICE','OPS','STRATEGY');

-- GAMES
CREATE TABLE games (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL,
  config_version INT NOT NULL,
  rng_seed TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- STATE (현재 상태; 정규화 단순화 위해 JSON 보관 + 서브테이블)
CREATE TABLE game_state (
  game_id UUID PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
  turn INT NOT NULL,
  state_json JSONB NOT NULL,          -- 전체 상태 스냅샷(진실의 원천)
  history_hash TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- SNAPSHOTS (턴별 이력)
CREATE TABLE turn_snapshots (
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  turn INT NOT NULL,
  snapshot_json JSONB NOT NULL,
  actions_json JSONB NOT NULL,
  events_json JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, turn)
);

-- ACTION LOG
CREATE TABLE action_logs (
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  turn INT NOT NULL,
  idx SMALLINT NOT NULL,
  action_code TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, turn, idx)
);

-- EVENTS (발생/대기/지연)
CREATE TABLE events (
  id UUID PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  turn INT NOT NULL,
  type event_type NOT NULL,
  code TEXT NOT NULL,
  status TEXT NOT NULL,          -- 'PENDING','APPLIED'
  payload JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX ix_turn_snapshots_game_turn ON turn_snapshots(game_id, turn);
CREATE INDEX ix_events_game_turn ON events(game_id, turn);
```

> 상태는 `game_state.state_json`을 진실 소스로 관리하고, BI/리더보드용 뷰는 별도 ETL.

---

## 8. REST API 사양 (요약)

### 인증

- `Authorization: Bearer <token>` (필수)
- 멀티유저 지원. 소유자만 쓰기 가능.

### Idempotency

- `Idempotency-Key` 헤더로 액션 중복 방지.

### 엔드포인트

#### `POST /games` — 새 게임 생성

**요청:**
```json
{
  "config_version": 1,
  "seed": "optional-seed-string"
}
```

**응답:**
```json
{
  "game_id": "uuid",
  "state": { ... }
}
```

#### `GET /games/{id}/state` — 현재 상태 조회

**응답:**
```json
{
  "state": { ... }
}
```

#### `POST /games/{id}/turn` — 턴 진행(행동 포함)

**요청:**
```json
{
  "actions": [
    { "code": "ec2_add" },
    { "code": "enable_rds" }
  ]
}
```

**응답:**
```json
{
  "turn_result": {
    "state": { ... },
    "applied_actions": [ ... ],
    "events": [ ... ]
  }
}
```

#### `POST /games/{id}/event/{event_id}/choice` — 이벤트 선택 처리

**요청:**
```json
{
  "choice_code": "scale_up",
  "payload": { }
}
```

**응답:**
```json
{
  "state": { ... }
}
```

#### `GET /games/{id}/snapshots?from=&to=` — 이력 조회

**응답:**
```json
{
  "snapshots": [
    {
      "turn": 1,
      "snapshot_json": { ... },
      "actions_json": [ ... ],
      "events_json": [ ... ]
    }
  ]
}
```

#### `POST /games/{id}/reset` — 튜토리얼/리셋

**응답:**
```json
{
  "state": { ... }
}
```

### JSON 타입

```json
Action = {
  "code": "ec2_add" | "enable_rds" | "...",
  "payload": { }
}

State = {
  "turn": 5,
  "mau": 25000,
  "latency_ms": 210,
  "security": 55,
  "cash": 5000,
  "burn_monthly": 300,
  "action_cap": 1,
  "resources": { ... },
  "modifiers": { ... },
  "timers": { ... }
}
```

---

## 9. 튜토리얼(턴 1~3) 강제 시나리오

- **턴1**: EC2 퍼블릭 시작(기본 상태). 가이드 메시지 표출.
- **턴2**: `enable_rds` 강제 노출(잠금 해제만 허용). 적용 후 `rds=true`.
- **턴3**: `enable_alb` 강제 노출. 적용 후 `alb=true`.
- 결과 아키텍처: `Users → ALB → EC2(n) → RDS`

튜토리얼 완료 후(턴4~) 일반 규칙 적용. 기본 액션 항상 제공.

---

## 10. 검증/오류 처리

### 검증 규칙

- 선행조건 위반
- 중복 설치
- 자원 음수(EC2<0)
- 예산 음수 허용/타이머 설정 등

### 에러코드

| 코드 | HTTP | 설명 |
|---|---|---|
| `INVALID_ACTION` | 400 | 잘못된 액션 코드 또는 파라미터 |
| `CONFLICT` | 409 | 동시성 충돌 |
| `PRECONDITION_FAILED` | 422 | 선행조건 미충족 |
| `EVENT_PENDING` | 423 | 이벤트 대응 대기 중 |
| `RATE_LIMIT` | 429 | 요청 제한 초과 |
| `INTERNAL` | 500 | 서버 내부 오류 |

### 동시성

- 턴별 단일 라이터
- `turn` 및 `history_hash`로 CAS(Compare-And-Set)

---

## 11. 리플레이/재현성

- 모든 난수는 `(game_id, turn, step, key)`로 파생된 시드 사용
- `history_hash = hash(prev_hash + snapshot_json + actions_json + events_json)`
- 동일 시드/동일 입력 ⇒ 동일 결과 보장

---

## 12. 테스트 전략

### 단위 테스트
- 각 계산식(성장, 지연, 비용, 보안) 검증

### 시나리오 테스트
- 이벤트 카탈로그별 골든 테스트

### 프로퍼티 테스트
- 비용≥0
- 지연 바운드 준수
- 보안 0..100 유지

### 몬테카를로 테스트
- 10k 게임 자동 플레이
- 파산율/승률 분포 확인

### 리그레션 테스트
- `config_version` 변경 시 스냅샷 호환 테스트

---

## 13. 관측/로깅

### 구조화 로그

```json
{
  "game": "uuid",
  "turn": 12,
  "action": "ec2_add",
  "delta": {
    "burn": 50,
    "latency": -20
  },
  "state": {
    "mau": 25000,
    "latency": 210,
    "security": 55,
    "cash": 5000
  }
}
```

### 메트릭

- 성공률
- 평균 최종 MAU
- 평균 지연
- 파산까지 턴수

### 트레이싱

- `/turn` 요청-응답 상관키 추적

---

## 14. 보안(백엔드)

### 보안 조치

1. **요청 스키마 검증**: JSON Schema를 통한 입력 검증
2. **권한 체크**: 게임 소유자만 수정 가능
3. **Idempotency-Key**: 저장해 중복 실행 방지(5분 TTL)
4. **입력 정규화**: 클램프/정규화로 밸류 인젝션 방지

---

## 15. 확장(옵션)

### GraphQL API
- 구독으로 HUD 실시간 반영

### 멀티플레이 협업
- 역할: DevOps/Sec/DBA
- 액션 병합 규칙

### 게임 관리
- 저장/불러오기 슬롯
- 리더보드

---

## 16. 예시: 한 턴 시뮬레이션 단계별 출력

### 시나리오: 턴 6

#### 1. 액션 수행
```json
["ec2_add", "enable_elasticache"]
```

#### 2. 용량 계산
- EC2 증가 → `capacity_rps` 증가
- `overload_factor` = 0
- 지연 대폭 개선

#### 3. 비용 계산
```
burn = 50(EC2) + 80(ElastiCache) + 기존비용
할인 적용 후 확정
```

#### 4. MAU 성장
```
MAU = MAU * (1 + base 2% + CDN/Cache 보정 1% - 지연 페널티 0%)
```

#### 5. 보안 점수
```
security = 기존 + Cache(0) - decay(1) + Obs(있으면 0)
```

#### 6. 이벤트 처리
- 6턴 → `traffic_surge_x3` 발생
- Autoscaling 유무에 따른 처리

---

## 17. 밸런싱 체크리스트

### 초반 (턴 1~9)
- 튜토리얼/기본 확장으로 **SPOF 제거** 유도

### 중반 (턴 10~24)
- Cache/CDN/ASG로 **성능/비용 균형**

### 후반 (턴 25~36)
- WAF/Multi-AZ/Obs로 **보안/신뢰성** 마무리

### 난이도 목표
- 승률 목표: 40~60%
- 파산율 목표: 15~30%

---

## 18. 상태 다이어그램 (Mermaid)

```mermaid
stateDiagram-v2
  [*] --> Ticking
  Ticking --> MajorEvent: turn % 3 == 0
  Ticking --> MicroEvent: roll 20%
  MajorEvent --> ResolveChoice --> Ticking
  MicroEvent --> Ticking
  Ticking --> Fail: cash<0 for 2 turns || latency>350 for 3 turns || security==0
  Ticking --> Win: turn>36 && successCriteria
```

---

## 19. 부록: 계산 예시

### 예시 1: 초기 상태에서 첫 턴

**초기 상태 (턴 1)**:
```json
{
  "turn": 1,
  "mau": 10000,
  "latency_ms": 280,
  "security": 40,
  "cash": 500,
  "burn_monthly": 50,
  "ec2_count": 1,
  "resources": {
    "alb": false,
    "rds": false,
    ...
  }
}
```

**액션**: `do_nothing`

**계산**:
1. MAU 성장: `10000 * (1 + 0.02) = 10200`
2. Latency: 변화 없음 (280ms)
3. Security: `40 - 1 = 39` (decay)
4. Cash: `500 - 50 = 450`
5. Burn: 50 (변화 없음)

**결과 상태 (턴 2)**:
```json
{
  "turn": 2,
  "mau": 10200,
  "latency_ms": 280,
  "security": 39,
  "cash": 450,
  "burn_monthly": 50
}
```

### 예시 2: RDS 도입

**상태 (턴 2)**:
```json
{
  "mau": 10200,
  "latency_ms": 280,
  "security": 39,
  "cash": 450
}
```

**액션**: `enable_rds`

**효과**:
1. `rds = true`
2. `burn + 60` → `burn_monthly = 110`
3. `latency - 15ms` → `latency_ms = 265`
4. `security + 5` → `security = 44`

**턴 처리**:
1. MAU: `10200 * 1.02 = 10404`
2. Security decay: `44 - 1 = 43`
3. Cash: `450 - 110 = 340`

**결과 (턴 3)**:
```json
{
  "turn": 3,
  "mau": 10404,
  "latency_ms": 265,
  "security": 43,
  "cash": 340,
  "burn_monthly": 110,
  "resources": {
    "rds": true
  }
}
```

---

## 20. 버전 관리

### Config Version 호환성

| Version | 변경사항 | 호환성 |
|---|---|---|
| 1 | 초기 릴리스 | - |
| 2 | 비용 밸런싱 조정 | 하위 호환 불가 |
| 3 | 새 서비스 추가 (Fargate) | 하위 호환 가능 |

### 마이그레이션 정책

- 저장된 게임은 생성 시점의 `config_version` 유지
- 새 게임만 최신 버전 사용
- 버전 간 플레이 불가 (밸런스 차이)

---

**문서 버전**: 1.0
**최종 업데이트**: 2025-09-30
**상태**: 백엔드 설계 완료
**다음 단계**: API 구현 및 테스트