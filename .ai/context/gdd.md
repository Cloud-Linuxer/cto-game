# Game Design Document (GDD) - AWS 스타트업 타이쿤

> 이 문서는 `.ai/context/vision.md`의 게임 비전을 구체적인 시스템과 규칙으로 정의합니다.

---

## 게임 개요

**장르**: 텍스트 기반 비즈니스 시뮬레이션 (Text-based Business Simulation)
**플랫폼**: Web (Desktop, Mobile)
**플레이 시간**: 1.5-3시간 (1회차)
**난이도**: 중간~어려움 (학습 곡선 존재)

---

## 핵심 게임 루프 (Core Game Loop)

```
1. 턴 시작 → 이벤트 발생 (스토리 텍스트)
2. 현재 상태 확인 (users, cash, trust, infrastructure)
3. 선택지 제시 (5-6개)
4. 플레이어 선택
5. 결과 적용 (수치 변화 + 스토리)
6. 승패 조건 확인
7. 다음 턴 또는 게임 종료
```

---

## 게임 시스템

### 1. 턴 시스템 (Turn System)

- **총 턴 수**: 25턴
- **턴 진행**: 선형 진행 (되돌릴 수 없음)
- **턴별 선택지**: 초반 1개, 중후반 2개 (팀 확장 후)
- **시간 제한**: 없음 (신중한 선택 가능)

**턴 구조**:
```
Turn N: {이벤트 제목}
- 상황 설명 (200-400자)
- 선택지 A: {설명} → 효과: {...}
- 선택지 B: {설명} → 효과: {...}
- 선택지 C: {설명} → 효과: {...}
```

---

### 2. 자원 관리 시스템 (Resource Management)

#### 핵심 변수

| 변수 | 의미 | 초기값 | 범위 | 용도 |
|------|------|--------|------|------|
| **users** | 활성 사용자 수 | 0 | 0~∞ | 수익 계산, 인프라 부하 |
| **cash** | 보유 자금 | 10M | -∞~∞ | 비용 지불, 투자 유치 |
| **trust** | 신뢰도 (투자자+시장) | 50 | 0~100 | 투자 유치, 이탈률 영향 |
| **revenue** | 월 매출 | 0 | 0~∞ | 현금 흐름 |
| **team** | 팀 규모 | 1 | 1~∞ | 선택지 개수, 실행 속도 |
| **infrastructure** | 인프라 스택 | ["EC2"] | Array | 가용 사용자 수, 비용 |

#### 계산 공식

```javascript
// 매출 계산
revenue = users * ARPU
ARPU = 1000원 (초반) → 5000원 (후반, 프리미엄 모델)

// 비용 계산
cost = infrastructure_cost + team_cost
infrastructure_cost = f(infrastructure)  // 단계별 고정
team_cost = team * 5M (월)

// 현금 흐름
cash_change = revenue - cost

// 이탈률 (trust 기반)
churn_rate = base_churn * (1 - trust / 100)
users_change = users * churn_rate
```

#### 신뢰도 시스템 (EPIC-04 개선)

**초기값**:
- EASY: 50
- NORMAL: 50
- HARD: 30

**신뢰도 획득**:
- 투자 유치 성공: +10~+15
- 안정적 서비스 운영 (3턴 연속 용량 80% 이하): +3
- 장애 극복 (복원력 스택 획득): +5
- 투명한 소통 (transparency 태그 선택지): 1.5배 효과
- 자연 회복: trust < 30일 때 +1/턴

**신뢰도 손실**:
- 용량 초과 (첫 경고): -50% 페널티
- 용량 초과 (연속 2회 이상): -100% 페널티
- 투자 유치 실패: -5~-10
- 보안 사고: -15

**용량 초과 경고 시스템**:
- 첫 초과: 50% 감소된 페널티 + 경고 메시지
- 연속 초과: 100% 전체 페널티
- 정상화 후: 경고 리셋

**대안 투자 경로** (trust 부족 시):
- 브릿지 파이낸싱: 게임당 최대 2회 (정규 투자의 30%, +5% 지분 희석)
- 정부 지원금: 게임당 1회 (2억 원 + trust +3)

---

### 3. 인프라 시스템 (Infrastructure System)

#### 6단계 인프라 진화

| 단계 | 스택 | 지원 사용자 | 월 비용 | 특징 |
|------|------|-------------|---------|------|
| 1 | EC2 (t3.medium) + MySQL | ~500 | $100 | 단일 인스턴스 |
| 2 | Aurora Serverless v2 | ~5K | $300 | 자동 스케일링 DB |
| 3 | ALB + AutoScaling + Redis | ~50K | $1.2K | 가용성 확보 |
| 4 | EKS + Karpenter | ~1M | $4K | 컨테이너 오케스트레이션 |
| 5 | Aurora Global DB + Bedrock | ~10M | $10K | 글로벌 확장 + AI |
| 6 | MSA + Multi-Region | ∞ | $20K+ | IPO 준비 완료 |

#### 인프라 업그레이드 조건

- **Stage 1→2**: users > 500 or SLA < 95%
- **Stage 2→3**: users > 5K or revenue > 10M
- **Stage 3→4**: users > 50K or 글로벌 진출 결정
- **Stage 4→5**: users > 1M or AI 기능 도입
- **Stage 5→6**: IPO 준비 단계

---

### 4. 승패 조건 (Win/Lose Conditions)

#### 🏆 승리 조건 (IPO 성공)

```
users >= 100K
AND revenue >= 300M (월)
AND cash > 0
AND trust >= 70
AND infrastructure includes ["Aurora Global DB", "EKS"]
AND turn == 25
```

#### 💀 패배 조건

1. **파산 (Bankruptcy)**
   ```
   cash < 0 (자금 고갈)
   ```

2. **서버 다운 (Outage)**
   ```
   users > infrastructure_limit
   AND trust < 20 (사용자 대량 이탈)
   ```

3. **투자 유치 실패**
   ```
   trust < 10 AND cash < 1M
   ```

4. **경쟁사 패배**
   ```
   users < 1K AND turn > 15 (시장에서 도태)
   ```

---

### 5. 난이도 시스템 (Difficulty System)

#### 난이도 곡선

```
초반 (Turn 1-8):   Easy    - 자금 여유, 실수 허용
중반 (Turn 9-16):  Medium  - 압박 증가, 전략 필요
후반 (Turn 17-25): Hard    - 실수 시 치명적
```

#### 난이도 조절 요소

- **이벤트 빈도**: 초반 20% → 후반 40%
- **선택지 효과**: 초반 온건 → 후반 극단적
- **비용 압박**: 초반 여유 → 후반 빠듯
- **경쟁사 압박**: 중반부터 등장

---

### 6. 선택 시스템 (Choice System)

#### 선택지 구조

```json
{
  "choiceId": 1,
  "text": "적극적인 마케팅 캠페인 실행",
  "effects": {
    "users": "+20%",
    "cash": "-5M",
    "trust": "+5",
    "infrastructure": null,
    "nextTurn": 2
  },
  "requirements": {
    "cash": ">= 5M"
  },
  "tags": ["marketing", "growth"]
}
```

#### 선택지 타입

1. **비즈니스 선택지**
   - 마케팅, 투자 유치, 팀 확장, 수익 모델 전환

2. **인프라 선택지**
   - 스케일 업, 인프라 업그레이드, 비용 절감

3. **위기 대응 선택지**
   - 서버 다운, 자금 부족, 경쟁사 대응

4. **전략 선택지**
   - 글로벌 진출, 신규 기능, M&A

---

### 7. 이벤트 시스템 (Event System)

#### 고정 이벤트 (Fixed Events)
- 25턴에 각 턴마다 고정된 스토리 이벤트
- `game_choices_db.json`에 정의됨
- 신뢰도 히스토리 추적 (EPIC-04)

#### 동적 이벤트 (Dynamic Events) - Phase 1+
- 게임 상태에 따라 발생하는 랜덤 이벤트
- 트리거 조건:
  - `cash < 1M`: 자금 위기 이벤트
  - `users > 100K`: 스케일링 이벤트
  - `infrastructure 업그레이드 직후`: 기술 부채 이벤트

---

### 8. 피드백 시스템 (Feedback System)

#### 즉각적 피드백
- 선택 후 수치 변화 애니메이션
- 긍정 효과: 초록색 ↑
- 부정 효과: 빨간색 ↓

#### 중간 피드백
- 매 5턴마다 중간 평가
- "순조로운 성장", "위기 상황", "최악의 시나리오"

#### 최종 피드백
- 게임 종료 시 상세 리포트
- 턴별 선택 히스토리
- 최종 점수 (users + revenue + trust 종합)

---

## UI/UX 구조

### 3-Panel 레이아웃

```
┌─────────────┬──────────────────┬─────────────┐
│             │                  │             │
│  Metrics    │   Story Panel    │  AWS Infra  │
│  Panel      │   + Choices      │  Diagram    │
│  (Left)     │   (Center)       │  (Right)    │
│             │                  │             │
│ - Users     │ - Event Text     │ - VPC       │
│ - Cash      │ - Choice Cards   │ - EC2       │
│ - Trust     │ - History        │ - Aurora    │
│ - Revenue   │                  │ - EKS       │
│ - Team      │                  │             │
│             │                  │             │
└─────────────┴──────────────────┴─────────────┘
```

### 신뢰도 게이지 (EPIC-04)

**TrustGauge 컴포넌트**:
- 5단계 색상 시스템: Danger (0-20) → Critical (21-40) → Warning (41-60) → Good (61-80) → Excellent (81-100)
- 난이도별 임계값 마커 (EASY: 60, NORMAL: 65, HARD: 85)
- 반응형 디자인 (모바일/데스크톱)
- 애니메이션 효과

---

## 콘텐츠 가이드

### 스토리 텍스트 작성 원칙
1. **간결함**: 200-400자 이내
2. **현실성**: 실제 스타트업 경험 기반
3. **긴장감**: 선택의 중요성 강조
4. **유머**: 적절한 유머로 긴장 완화

### 선택지 작성 원칙
1. **명확성**: 효과가 명확히 예측 가능
2. **트레이드오프**: 모든 선택에 장단점 존재
3. **다양성**: 공격적/보수적/중립적 선택지 균형
4. **일관성**: 이전 선택과의 연결성 유지

---

## 데이터 구조

게임 데이터는 `game_choices_db.json`에 정의되어 있습니다:
- **turns**: 25개 턴의 이벤트 정의
- **choices**: 253개 선택지 (턴당 평균 10개)
- **trust_balance**: 긍정 70%, 중립 15%, 부정 15% (EPIC-04 리밸런싱)

자세한 내용은 `/home/cto-game/game_choices_db.json` 참조.

---

## 확장 계획 (Future Features)

### Phase 1
- 동적 이벤트 시스템
- LLM 기반 스토리 생성
- 멀티 엔딩 (IPO 외 다양한 결말)

### Phase 2
- 멀티플레이 (협업 모드)
- 커스텀 시나리오 제작
- 리더보드 + 경쟁 모드

---

**문서 버전**: v1.1 (EPIC-04)
**최종 업데이트**: 2026-02-04
**다음 업데이트**: 동적 이벤트 시스템 추가 시

**변경 이력**:
- v1.1 (2026-02-04): EPIC-04 신뢰도 시스템 개선 반영
  - 신뢰도 초기값 통일 (NORMAL: 40 → 50)
  - 용량 초과 경고 시스템 추가
  - 신뢰도 회복 메커니즘 강화
  - 대안 투자 경로 추가
  - TrustGauge UI 컴포넌트 설명 추가

---

**참고 문서**:
- `/home/cto-game/CLAUDE.md` - 프로젝트 전체 개요
- `/home/cto-game/game_choices_db.json` - 게임 데이터
- `.ai/context/vision.md` - 게임 비전
- `.ai/context/trust-balance.md` - 신뢰도 밸런스 가이드 (EPIC-04)
