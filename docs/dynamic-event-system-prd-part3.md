# AWS 스타트업 타이쿤 - 동적 이벤트 시스템 PRD (Part 3)

## 6. 기회 이벤트 (Opportunity Events)

### 6.1 설계 원칙

- 시간 제한형: 해당 턴에서만 선택 가능, 놓치면 사라짐
- 준비된 자에게 보상: 특정 인프라/메트릭이 갖춰져 있어야 최선의 선택 가능
- "왜 미리 이 인프라를 준비해야 했는가"를 체감하는 순간

### 6.2 기회 이벤트 목록

#### 기회 OP01: 정부 사업 입찰

```yaml
eventId: "OPP_GOV_CONTRACT"
title: "[기회] 정부 공공 클라우드 사업 입찰"
type: OPPORTUNITY
severity: MEDIUM
description: |
  정부의 대규모 클라우드 전환 사업 입찰 공고가 났습니다.
  "우리 서비스를 공공 부문에 납품할 기회입니다.
  하지만 보안 인증과 고가용성 요구사항이 까다롭습니다.
  제출 기한은 이번 턴까지입니다."
triggerCondition:
  minTurn: 10
  maxTurn: 22
  minUsers: 10000
  minTrust: 40
  baseProbability: 0.07

responses:
  - responseId: "OP01_R1"
    text: |
      풀 스펙 입찰: 모든 보안 인증 요건을 충족하여 입찰합니다.
      (Aurora + 멀티 AZ 필수)
    effects:
      users: 10000
      cash: 80000000
      trust: 15
      infra: []
    requireInfra: ["Aurora"]
    awsLesson: |
      [AWS 교훈] 공공 클라우드 사업에는 CSAP(클라우드 보안인증) 취득이 필수입니다.
      AWS 서울 리전은 CSAP 인증을 획득하여 공공기관 서비스가 가능합니다.
      AWS GovCloud와 유사하게, 한국 공공 워크로드를 위한 규정 준수 환경을 제공합니다.

  - responseId: "OP01_R2"
    text: |
      파트너십 입찰: AWS 공인 파트너(APN)와 컨소시엄으로 입찰합니다.
      수익은 나누지만 부족한 역량을 보완할 수 있습니다.
    effects:
      users: 5000
      cash: 40000000
      trust: 8
      infra: []
    awsLesson: |
      [AWS 교훈] APN(AWS Partner Network) 파트너와 협업하면
      부족한 보안 인증, 운영 역량을 보완할 수 있습니다.
      AWS Marketplace에서 솔루션을 등록하면 공공 조달 절차도 간소화됩니다.

  - responseId: "OP01_R3"
    text: |
      입찰 포기: 현재 역량으로는 요구사항 충족이 어렵습니다.
    effects:
      users: 0
      cash: 0
      trust: -3
      infra: []
    awsLesson: |
      [AWS 교훈] 공공 사업은 안정적인 매출원이지만 요구사항이 엄격합니다.
      미리 준비하려면 AWS Artifact에서 규정 준수 보고서를 확인하고,
      Security Hub의 보안 기준(CIS, PCI-DSS)을 사전에 충족해두세요.
```

#### 기회 OP02: 대기업 파트너십 제안

```yaml
eventId: "OPP_ENTERPRISE_PARTNER"
title: "[기회] 대기업 API 파트너십"
type: OPPORTUNITY
severity: MEDIUM
description: |
  국내 10대 대기업에서 우리 서비스를 자사 플랫폼에 통합하고 싶다는 제안이 왔습니다.
  "API를 통해 우리 서비스를 제공하면 수백만 유저에게 노출됩니다.
  하지만 SLA 99.95%와 초당 10,000 TPS를 요구하고 있습니다."
triggerCondition:
  minTurn: 8
  maxTurn: 22
  minUsers: 5000
  minTrust: 35
  baseProbability: 0.08

responses:
  - responseId: "OP02_R1"
    text: |
      즉시 수용: 현재 인프라로 SLA를 맞추며 파트너십을 체결합니다.
      (EKS 또는 Auto Scaling 필수)
    effects:
      users: 30000
      cash: 50000000
      trust: 12
      infra: []
    requireInfra: ["Auto Scaling"]
    awsLesson: |
      [AWS 교훈] 엔터프라이즈 SLA 99.95%를 달성하려면:
      - ALB + Multi-AZ EC2/EKS로 고가용성 확보
      - ElastiCache로 DB 부하 분산
      - CloudWatch 합성 모니터링으로 SLA 측정
      - Route 53 Health Check로 자동 장애 조치

  - responseId: "OP02_R2"
    text: |
      인프라 업그레이드 후 수용: 3개월 준비 기간을 요청하고
      EKS 기반 마이크로서비스로 전환합니다.
    effects:
      users: 15000
      cash: 20000000
      trust: 5
      infra: ["EKS"]
    awsLesson: |
      [AWS 교훈] EKS에서 HPA(Horizontal Pod Autoscaler)와 Karpenter를 결합하면
      파드와 노드 모두 자동 스케일링됩니다.
      AWS Load Balancer Controller로 ALB를 Kubernetes와 네이티브 통합하세요.

  - responseId: "OP02_R3"
    text: |
      조건부 거절: 현재 인프라로는 SLA 보장이 어려워 정중히 거절합니다.
    effects:
      users: 0
      cash: 0
      trust: -5
      infra: []
    awsLesson: |
      [AWS 교훈] SLA를 보장할 수 없는 파트너십은 오히려 독입니다.
      장애 시 위약금과 평판 손실이 발생합니다.
      먼저 SLO/SLI를 정의하고 자신의 실제 가용성을 파악하세요.
```

#### 기회 OP03: 바이럴 마케팅 기회

```yaml
eventId: "OPP_VIRAL_MARKETING"
title: "[기회] TV 프로그램 출연 제안"
type: OPPORTUNITY
severity: LOW
description: |
  인기 스타트업 오디션 프로그램에서 출연 제안이 왔습니다.
  "방송 출연 시 서비스가 전국에 노출됩니다.
  하지만 방송 직후 트래픽 폭증에 대비해야 합니다.
  방송 일정은 다음 주, 준비 시간이 촉박합니다."
triggerCondition:
  minTurn: 5
  maxTurn: 18
  minUsers: 1000
  minTrust: 25
  baseProbability: 0.10

responses:
  - responseId: "OP03_R1"
    text: |
      완벽 준비 후 출연: Auto Scaling + CloudFront를 사전 구성하고,
      트래픽 폭증 대비 부하 테스트까지 완료한 후 출연합니다.
    effects:
      users: 20000
      cash: -5000000
      trust: 10
      infra: ["Auto Scaling", "CloudFront"]
    awsLesson: |
      [AWS 교훈] 예상 가능한 트래픽 폭증에는 Predictive Scaling을 활용하세요.
      방송 시간에 맞춰 사전에 인스턴스를 프로비저닝하고,
      CloudFront의 Origin Shield로 오리진 부하를 최소화합니다.
      부하 테스트는 AWS Distributed Load Testing으로 실시하세요.

  - responseId: "OP03_R2"
    text: |
      그냥 출연: 인프라 준비 없이 출연합니다.
      서비스가 버틸 수도 있고, 장애가 날 수도 있습니다.
    effects:
      users: 25000
      cash: 0
      trust: -10
      infra: []
    awsLesson: |
      [AWS 교훈] 준비 없는 트래픽 폭증은 "뉴스 효과"로 불립니다.
      서비스 장애가 방송에서 언급되면 브랜드 이미지에 치명적입니다.
      최소한 CloudWatch Alarms으로 임계치를 설정하고 SNS 알림을 구성하세요.

  - responseId: "OP03_R3"
    text: |
      출연 거절: 아직 인프라가 준비되지 않아 거절합니다.
    effects:
      users: 0
      cash: 0
      trust: -2
      infra: []
    awsLesson: |
      [AWS 교훈] 기회를 놓치지 않으려면 항상 "day-2 readiness"를 유지하세요.
      Auto Scaling과 CloudFront는 기본 인프라에 포함되어야 합니다.
      AWS Well-Architected Framework의 "성능 효율성" 기둥을 참고하세요.
```

#### 기회 OP04: 해외 컨퍼런스 발표

```yaml
eventId: "OPP_CONFERENCE_TALK"
title: "[기회] AWS re:Invent 발표 초청"
type: OPPORTUNITY
severity: LOW
description: |
  AWS re:Invent에서 우리 서비스의 아키텍처를 발표해달라는 초청이 왔습니다.
  "전 세계 엔지니어 앞에서 발표하면 글로벌 인재 채용과
  해외 진출에 큰 도움이 될 것입니다."
triggerCondition:
  minTurn: 12
  maxTurn: 23
  minUsers: 20000
  minTrust: 50
  baseProbability: 0.06

responses:
  - responseId: "OP04_R1"
    text: |
      발표 수락: 우리의 AWS 활용 사례를 공유하고
      글로벌 네트워크를 구축합니다.
    effects:
      users: 5000
      cash: -3000000
      trust: 15
      infra: []
    awsLesson: |
      [AWS 교훈] AWS re:Invent는 매년 5만 명 이상이 참가하는 최대 클라우드 컨퍼런스입니다.
      AWS의 고객 성공 사례(Customer Success Story)로 소개되면
      AWS 크레딧, 마케팅 지원, 기술 지원 등의 혜택을 받을 수 있습니다.

  - responseId: "OP04_R2"
    text: |
      블로그 기고 대체: 발표 대신 AWS 블로그에 기술 아티클을 기고합니다.
      시간 투자가 적으면서도 기술 브랜딩 효과가 있습니다.
    effects:
      users: 2000
      cash: 0
      trust: 8
      infra: []
    awsLesson: |
      [AWS 교훈] AWS Architecture Blog, AWS Startups Blog에 기고하면
      기술 커뮤니티에서의 인지도가 높아집니다.
      잘 정리된 아키텍처 문서는 투자 유치와 인재 채용에도 도움이 됩니다.
```

#### 기회 OP05: 인수 제안

```yaml
eventId: "OPP_ACQUISITION_OFFER"
title: "[기회] 대형 인수 제안"
type: OPPORTUNITY
severity: HIGH
description: |
  글로벌 기업으로부터 정식 인수 제안이 왔습니다.
  "기업 가치를 현재의 5배로 평가하고 있습니다.
  이 기회를 잡으면 큰 수익을 얻을 수 있지만, 독립성을 잃게 됩니다."
triggerCondition:
  minTurn: 15
  maxTurn: 24
  minUsers: 50000
  minCash: 100000000
  minTrust: 60
  baseProbability: 0.05

responses:
  - responseId: "OP05_R1"
    text: |
      인수 수용: 팀과 서비스를 모두 인수시키고 큰 수익을 실현합니다.
    effects:
      users: 0
      cash: 500000000
      trust: 20
      infra: []
    awsLesson: |
      [AWS 교훈] 인수 시 인프라의 이식성(Portability)이 기업 가치에 영향을 줍니다.
      컨테이너화(EKS/ECS), IaC(CDK/Terraform), 데이터 이식성(표준 형식 사용)이
      인수 후 통합 비용을 결정합니다.

  - responseId: "OP05_R2"
    text: |
      전략적 파트너십 역제안: 인수 대신 전략적 투자 + 파트너십을 역제안합니다.
    effects:
      users: 10000
      cash: 200000000
      trust: 10
      infra: []
    awsLesson: |
      [AWS 교훈] 전략적 파트너십은 양사의 인프라를 API로 연동하는 것에서 시작합니다.
      AWS PrivateLink로 프라이빗 네트워크에서 안전하게 API를 공유하고,
      EventBridge를 통한 이벤트 기반 통합으로 느슨한 결합을 유지하세요.

  - responseId: "OP05_R3"
    text: |
      거절 및 IPO 추진: 독립 노선을 유지하고 자체 IPO를 목표로 합니다.
    effects:
      users: 0
      cash: 0
      trust: 5
      infra: []
    awsLesson: |
      [AWS 교훈] IPO 준비에서 인프라 감사는 필수입니다.
      SOC 2 Type II 인증, 재무 시스템의 보안 통제, 데이터 거버넌스가 핵심입니다.
      AWS Control Tower로 멀티 계정 거버넌스를 구축하세요.
```

---

## 7. 시즌/메타 이벤트 (Seasonal/Meta Events)

### 7.1 설계 원칙

- 경기 순환을 시뮬레이션하여 게임의 배경 환경을 변화시킴
- 여러 턴에 걸쳐 지속되며 다른 이벤트의 발생 확률과 효과에 영향
- 직접 선택지를 제공하지 않고, 기존 선택지의 효과를 수정(modifier)

### 7.2 시즌 시스템

```yaml
# 시즌은 게임 시작 시 랜덤 시드로 결정
# 각 시즌은 3-5턴 동안 지속
seasons:
  - seasonId: "BOOM_MARKET"
    name: "호황기"
    description: "스타트업 투자 시장이 활황입니다. 투자 유치가 쉬워지고 유저 획득 비용이 낮아집니다."
    modifier:
      cashMultiplier: 1.2        # 자금 효과 20% 증가
      userMultiplier: 1.3        # 유저 획득 30% 증가
      trustMultiplier: 1.0       # 신뢰도 변동 없음
      investmentProbability: 1.5 # 투자 이벤트 발생률 50% 증가
    duration: [3, 5]  # 3~5턴 지속
    notification: |
      [시장 상황] 호황기 - VC 자금이 풍부하고 스타트업 투자가 활발합니다.
      유저 획득과 투자 유치에 유리한 시기입니다.
    awsLesson: |
      [AWS 교훈] 호황기에는 성장에 집중하되, 비용 통제도 잊지 마세요.
      Savings Plans를 미리 구매하면 성장기의 비용을 크게 절감할 수 있습니다.

  - seasonId: "RECESSION"
    name: "불황기"
    description: "경기 침체로 투자가 위축되고, 유저 이탈이 증가합니다."
    modifier:
      cashMultiplier: 0.8       # 자금 효과 20% 감소
      userMultiplier: 0.7       # 유저 획득 30% 감소
      trustMultiplier: 0.9      # 신뢰도 효과 10% 감소
      crisisProbability: 1.5    # 위기 이벤트 발생률 50% 증가
    duration: [3, 4]
    notification: |
      [시장 상황] 불황기 - 투자 시장이 위축되고 고객 지출이 줄어들고 있습니다.
      현금 보전과 비용 효율화에 집중해야 합니다.
    awsLesson: |
      [AWS 교훈] 불황기에는 FinOps가 생존의 열쇠입니다.
      Reserved Instances, Spot 인스턴스, Graviton 전환으로 비용을 최적화하세요.
      AWS의 무료 티어를 최대한 활용하고 미사용 리소스를 정리하세요.

  - seasonId: "AI_WAVE"
    name: "AI 붐"
    description: "생성형 AI 열풍이 불고 있습니다. AI 기능을 가진 서비스가 큰 주목을 받습니다."
    modifier:
      cashMultiplier: 1.0
      userMultiplier: 1.1
      trustMultiplier: 1.0
      aiEventProbability: 2.0    # AI 관련 이벤트 발생률 2배
    duration: [4, 5]
    conditionalBonus:
      condition:
        requireInfra: ["Bedrock"]
      bonus:
        userMultiplier: 1.5      # Bedrock 보유 시 유저 획득 50% 추가
        trustMultiplier: 1.3     # Bedrock 보유 시 신뢰도 30% 추가
    notification: |
      [시장 상황] AI 붐 - 모든 산업에서 AI 도입이 가속화되고 있습니다.
      AI 기능을 갖춘 서비스는 유저와 투자자의 관심을 독차지합니다.
    awsLesson: |
      [AWS 교훈] Amazon Bedrock은 기초 모델(Anthropic Claude, Meta Llama 등)을
      API로 제공합니다. GPU 인프라 구축 없이 서버리스로 AI를 도입할 수 있어
      스타트업에 최적입니다. Knowledge Bases for Bedrock으로 RAG도 쉽게 구현하세요.

  - seasonId: "REGULATION_WAVE"
    name: "규제 강화기"
    description: "정부의 IT 산업 규제가 강화되고 있습니다. 보안과 컴플라이언스가 중요해집니다."
    modifier:
      cashMultiplier: 0.9
      userMultiplier: 0.9
      trustMultiplier: 1.2       # 신뢰도 효과 20% 증가
      regulationEventProbability: 2.0
    duration: [3, 4]
    conditionalBonus:
      condition:
        minTrust: 60
      bonus:
        cashMultiplier: 1.2      # 높은 신뢰도 보유 시 자금 효과 증가
    notification: |
      [시장 상황] 규제 강화기 - 데이터 보호법, 플랫폼 규제가 강화되고 있습니다.
      보안과 컴플라이언스를 갖춘 서비스가 경쟁 우위를 갖습니다.
    awsLesson: |
      [AWS 교훈] 규제 환경에서는 AWS의 공동 책임 모델을 이해하는 것이 핵심입니다.
      AWS Config Rules로 규정 준수를 자동 모니터링하고,
      Audit Manager로 감사 증거를 자동 수집하세요.

  - seasonId: "HYPER_GROWTH"
    name: "초성장기"
    description: "디지털 전환 가속화로 전체 시장이 폭발적으로 성장하고 있습니다."
    modifier:
      cashMultiplier: 1.1
      userMultiplier: 1.5        # 유저 획득 50% 증가
      trustMultiplier: 0.9       # 빠른 성장으로 품질 리스크 증가
      viralEventProbability: 2.0
    duration: [2, 4]
    notification: |
      [시장 상황] 초성장기 - 시장이 폭발적으로 성장하고 있습니다.
      유저 획득 기회가 많지만, 인프라가 따라가지 못하면 장애 위험이 있습니다.
    awsLesson: |
      [AWS 교훈] 초성장기에는 스케일링 전략이 생사를 가릅니다.
      Application Auto Scaling으로 EC2, ECS, DynamoDB, Aurora 등
      모든 계층을 자동 스케일링하세요.
      AWS Load Testing으로 최대 부하를 사전에 검증하세요.
```

---

## 8. 구현 가이드

### 8.1 이벤트 평가 엔진 (EventEvaluator) 핵심 로직

```typescript
// backend/src/event/event-evaluator.service.ts (설계안)

interface EvaluatedEvent {
  event: DynamicEvent;
  applicableResponses: EventResponse[];
  autoDefenseMessage?: string;
  damageReduction?: number;
}

class EventEvaluatorService {
  /**
   * 매 턴 시작 시 호출. 현재 게임 상태에 맞는 이벤트를 평가하여 반환.
   * 한 턴에 최대 1개의 이벤트만 반환.
   * 우선순위: 연쇄 > 위기 > 기회 > 랜덤
   */
  evaluateEvents(game: Game): EvaluatedEvent | null {
    // 1. 연쇄 이벤트 체크
    const chainEvent = this.checkChainEvents(game);
    if (chainEvent) return chainEvent;

    // 2. 위기 이벤트 체크
    const crisisEvent = this.checkCrisisEvents(game);
    if (crisisEvent) return crisisEvent;

    // 3. 기회 이벤트 체크
    const oppEvent = this.checkOpportunityEvents(game);
    if (oppEvent) return oppEvent;

    // 4. 랜덤 이벤트 체크
    const randomEvent = this.checkRandomEvents(game);
    if (randomEvent) return randomEvent;

    return null;
  }

  /**
   * 게임별 시드 기반 결정론적 랜덤
   * 같은 시드 + 같은 턴이면 같은 결과 (디버깅 용이)
   * 하지만 시드가 다르면 다른 결과 (리플레이성 확보)
   */
  private seededRandom(seed: number, turn: number): number {
    const hash = ((seed * 1103515245 + 12345 + turn * 9301) % 2147483647);
    return (hash & 0x7fffffff) / 2147483647;
  }

  /**
   * 트리거 조건 검증
   */
  private matchesCondition(
    condition: EventTriggerCondition,
    game: Game
  ): boolean {
    if (condition.minTurn && game.currentTurn < condition.minTurn) return false;
    if (condition.maxTurn && game.currentTurn > condition.maxTurn) return false;
    if (condition.minUsers && game.users < condition.minUsers) return false;
    if (condition.maxUsers && game.users > condition.maxUsers) return false;
    if (condition.minCash && game.cash < condition.minCash) return false;
    if (condition.maxCash && game.cash > condition.maxCash) return false;
    if (condition.minTrust && game.trust < condition.minTrust) return false;
    if (condition.maxTrust && game.trust > condition.maxTrust) return false;

    if (condition.requireInfra) {
      const hasAll = condition.requireInfra.every(
        infra => game.infrastructure.includes(infra)
      );
      if (!hasAll) return false;
    }

    if (condition.excludeInfra) {
      const hasAny = condition.excludeInfra.some(
        infra => game.infrastructure.includes(infra)
      );
      if (hasAny) return false;
    }

    if (condition.requirePreviousEvent) {
      if (!game.completedEvents.includes(condition.requirePreviousEvent)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 시즌 모디파이어를 적용하여 이벤트 효과를 조정
   */
  private applySeasonModifier(
    effects: EventResponse['effects'],
    season: Season
  ): EventResponse['effects'] {
    return {
      users: Math.floor(effects.users * season.modifier.userMultiplier),
      cash: Math.floor(effects.cash * season.modifier.cashMultiplier),
      trust: Math.floor(effects.trust * season.modifier.trustMultiplier),
      infra: effects.infra,
    };
  }

  /**
   * 자동 방어 체크 (인프라 보유에 따른 피해 경감)
   */
  private checkAutoDefense(
    event: DynamicEvent,
    game: Game
  ): { message: string; reduction: number } | null {
    if (!event.autoDefense) return null;

    for (const defense of event.autoDefense) {
      const hasInfra = defense.condition.requireInfra.every(
        infra => game.infrastructure.includes(infra)
      );
      if (hasInfra) {
        return {
          message: defense.effect,
          reduction: defense.damageReduction,
        };
      }
    }
    return null;
  }
}
```

### 8.2 Game Entity 확장 (변경사항 요약)

현재 `/home/cto-game/backend/src/database/entities/game.entity.ts`에 추가할 컬럼:

```typescript
// --- 동적 이벤트 시스템 필드 ---
@Column({ type: 'simple-json', default: '[]' })
activeEvents: string[];

@Column({ type: 'simple-json', default: '[]' })
completedEvents: string[];

@Column({ type: 'simple-json', default: '{}' })
eventFlags: Record<string, any>;

@Column({ type: 'text', default: 'NORMAL' })
currentSeason: string;

@Column({ type: 'int', default: 0 })
eventSeed: number;

@Column({ type: 'simple-json', nullable: true })
pendingEvent: {
  eventId: string;
  title: string;
  description: string;
  responses: EventResponse[];
  autoDefenseMessage?: string;
} | null;
```

### 8.3 API 확장

```
현재 API는 유지하면서 이벤트 정보를 GameResponseDto에 추가:

GET /api/game/:gameId
  응답에 추가:
  - pendingEvent: 현재 턴에 발생한 동적 이벤트 (있는 경우)
  - currentSeason: 현재 시즌 상태
  - seasonDescription: 시즌 설명

POST /api/game/:gameId/event-response
  새 엔드포인트: 동적 이벤트 응답 선택
  body: { eventId: string, responseId: string }

GET /api/game/:gameId/event-history
  새 엔드포인트: 이벤트 발생 히스토리 조회
```

### 8.4 프론트엔드 통합 포인트

현재 `/home/cto-game/frontend/components/StoryPanel.tsx`에서 이벤트를 표시하는 방법:

```
턴 시작 시:
1. 기존 턴 정보 표시 (eventText, choices)
2. pendingEvent가 있으면 이벤트 모달/배너 표시
3. 이벤트 응답 선택지를 기존 선택지 위에 우선 표시
4. 이벤트 응답 후 기존 턴 선택 진행

시즌 표시:
- MetricsPanel에 현재 시즌 아이콘과 모디파이어 표시
- 시즌 변경 시 알림 배너 표시
```

### 8.5 이벤트 발생 확률 밸런싱 가이드

```
턴당 이벤트 발생 확률 목표: 25-40%

확률 계산 공식:
최종 확률 = 기본 확률 * 시즌 보정 * 상태 보정 * 반복 보정

시즌 보정:
- 호황기: 기회 이벤트 +50%, 위기 이벤트 -30%
- 불황기: 위기 이벤트 +50%, 기회 이벤트 -30%
- AI 붐: AI 관련 이벤트 +100%
- 규제 강화기: 규제/보안 이벤트 +100%

상태 보정:
- 유저 > 50000: 시장 이벤트 확률 +30%
- 캐시 < 5000000: 투자자 이벤트 확률 +50%
- 신뢰도 < 30: 위기 이벤트 확률 +30%
- 인프라 갯수 < 3: 기술 이벤트 확률 +20%

반복 보정:
- 이미 발생한 이벤트: 확률 50% 감소
- 같은 카테고리 연속 발생 방지: 직전 카테고리 확률 70% 감소
```

---

## 9. 이벤트-AWS 교육 매핑 요약

| 이벤트 유형 | 주요 AWS 서비스 학습 | 핵심 교훈 |
|------------|---------------------|-----------|
| 바이럴 모먼트 | Auto Scaling, CloudFront | 예측 불가 트래픽 대비 |
| 경쟁사 출현 | CloudFront CDN, Lambda | 성능 차별화 전략 |
| 시장 침체 | Cost Explorer, Budgets | FinOps와 비용 최적화 |
| AWS 리전 장애 | Aurora Multi-AZ, Route 53 | 고가용성과 DR |
| 보안 침해 | WAF, IAM, GuardDuty | 보안 기본 3축 |
| 성능 병목 | ElastiCache Redis, Aurora | 캐시 레이어와 DB 최적화 |
| DDoS 공격 | Shield, WAF, CloudFront | 네트워크 보안 |
| 데이터 유출 | KMS, CloudTrail, Macie | 데이터 보호와 감사 |
| 리전 장애 | Global DB, multi-region | 재해 복구 전략 |
| 비용 폭발 | Cost Anomaly Detection | 비용 거버넌스 |
| DB 손상 | PITR, AWS Backup | 백업과 복구 |
| 정부 사업 | CSAP, Security Hub | 공공 클라우드 규정 준수 |
| 대기업 파트너십 | EKS, ALB, Auto Scaling | 엔터프라이즈 SLA |
| AI 붐 | Bedrock, SageMaker | AI/ML 인프라 |
| 글로벌 진출 | Global Accelerator, Aurora Global DB | 멀티 리전 아키텍처 |
| 팀 번아웃 | CodePipeline, 관리형 서비스 | DevOps 자동화 |
| 인재 이탈 | CDK, Well-Architected | IaC와 지식 공유 |

---

## 10. 구현 우선순위

### Phase 1 (MVP): 랜덤 이벤트
- 시장/기술/팀/투자자 이벤트 각 3개씩 총 12개 구현
- 기본 확률 시스템과 상태 기반 트리거
- GameResponseDto에 pendingEvent 추가
- 프론트엔드 이벤트 모달 UI

### Phase 2: 위기/기회 이벤트 + 자동 방어
- 위기 이벤트 5개, 기회 이벤트 5개 추가
- autoDefense 시스템 (인프라 보유에 따른 피해 경감)
- 이벤트 히스토리 API

### Phase 3: 연쇄 이벤트 + 시즌
- 연쇄 이벤트 3개 아크 (경쟁사 인수전, 글로벌 진출, AI 혁명)
- 시즌 시스템 (5개 시즌, 모디파이어 적용)
- 시드 기반 결정론적 랜덤 (리플레이 시 다른 경험)

### Phase 4: 밸런싱 + 고도화
- 플레이 데이터 기반 확률/효과 조정
- 추가 이벤트 확장 (커뮤니티 피드백 반영)
- 이벤트 간 상호작용 시스템 고도화
