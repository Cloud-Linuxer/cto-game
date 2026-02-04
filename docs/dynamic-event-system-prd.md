# AWS 스타트업 타이쿤 - 동적 이벤트 시스템 PRD

## 문서 정보
- 버전: 1.0
- 작성일: 2026-02-03
- 상태: 설계 단계

---

## 1. 현재 문제 분석

### 1.1 현재 시스템의 한계

현재 게임 엔진(`/home/cto-game/backend/src/game/game.service.ts`)을 분석한 결과, 다음과 같은 구조적 한계가 확인되었다.

**결정론적 게임 흐름**: 25개 턴, 253개 선택지가 모두 사전 정의되어 있다. 동일한 선택을 하면 항상 동일한 결과가 나온다. 유일한 분기점은 턴 888-890의 긴급 이벤트(DR 구성 여부에 따라)와 턴 950의 IPO 선택뿐이다.

**상태 기반 반응 부재**: `game.entity.ts`에 users, cash, trust, infrastructure 등의 상태가 있지만, 이 상태에 반응하는 동적 이벤트가 없다. 예를 들어 유저가 50,000명을 넘어도 시장에서 아무 반응이 없다.

**리플레이 가치 부재**: 한 번 최적 경로를 찾으면 매번 같은 선택으로 같은 결과를 얻을 수 있다. 게임의 교육적 가치가 초회 플레이 이후 급격히 감소한다.

### 1.2 설계 목표

| 목표 | 측정 기준 |
|------|-----------|
| 리플레이성 증가 | 동일 선택 시에도 30% 이상 다른 결과 경로 |
| 교육적 가치 강화 | AWS 서비스 학습 포인트가 이벤트당 1개 이상 |
| 긴장감 유지 | 매 턴 이벤트 발생 확률 25-40% |
| 기존 시스템 호환 | 현재 25턴/253선택지 구조를 파괴하지 않음 |

---

## 2. 핵심 아키텍처

### 2.1 이벤트 레이어 구조

```
기존 턴 시스템 (25턴, 253 선택지)
        |
        v
+------------------+
| 이벤트 평가 엔진  |  <-- 매 턴 시작 시 실행
+------------------+
        |
   +---------+---------+---------+---------+
   |         |         |         |         |
 랜덤     연쇄      위기     기회     시즌
 이벤트   이벤트    이벤트   이벤트   이벤트
```

핵심 원칙: 이벤트 시스템은 기존 턴 시스템 **위에** 레이어로 얹힌다. 기존 선택지를 대체하는 것이 아니라, 턴 시작 시 추가 이벤트가 발생하여 게임 상태를 변경하거나 임시 선택지를 제공한다.

### 2.2 새로운 데이터 모델

#### DynamicEvent 엔티티 (신규)

```typescript
// dynamic-event.entity.ts
export enum EventType {
  RANDOM = 'RANDOM',       // 랜덤 이벤트
  CHAIN = 'CHAIN',         // 연쇄 이벤트
  CRISIS = 'CRISIS',       // 위기 이벤트
  OPPORTUNITY = 'OPPORTUNITY', // 기회 이벤트
  SEASONAL = 'SEASONAL',   // 시즌/메타 이벤트
}

export enum EventSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface EventTriggerCondition {
  // 게임 상태 조건
  minTurn?: number;
  maxTurn?: number;
  minUsers?: number;
  maxUsers?: number;
  minCash?: number;
  maxCash?: number;
  minTrust?: number;
  maxTrust?: number;
  // 인프라 조건
  requireInfra?: string[];
  excludeInfra?: string[];
  // 확률
  baseProbability: number; // 0.0 ~ 1.0
  // 이전 이벤트 의존성 (연쇄 이벤트용)
  requirePreviousEvent?: string;
  // 시즌 조건
  activeSeason?: string;
}

export interface EventResponse {
  responseId: string;
  text: string;
  effects: {
    users: number;
    cash: number;
    trust: number;
    infra: string[];
  };
  // 인프라 요구사항 (이것이 있어야 이 응답 가능)
  requireInfra?: string[];
  // 교육 포인트
  awsLesson: string;
  // 후속 이벤트 트리거
  triggersEvent?: string;
}

@Entity('dynamic_events')
export class DynamicEvent {
  @PrimaryColumn()
  eventId: string;

  @Column({ type: 'text' })
  type: EventType;

  @Column({ type: 'text' })
  severity: EventSeverity;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'simple-json' })
  triggerCondition: EventTriggerCondition;

  @Column({ type: 'simple-json' })
  responses: EventResponse[];

  @Column({ type: 'text', nullable: true })
  chainId: string; // 연쇄 이벤트 그룹 ID

  @Column({ type: 'int', default: 0 })
  chainOrder: number; // 연쇄 이벤트 내 순서

  @Column({ type: 'boolean', default: true })
  repeatable: boolean;
}
```

#### Game 엔티티 확장

```typescript
// game.entity.ts 에 추가할 컬럼들
@Column({ type: 'simple-json', default: '[]' })
activeEvents: string[];  // 현재 활성 이벤트 ID 목록

@Column({ type: 'simple-json', default: '[]' })
completedEvents: string[];  // 완료된 이벤트 ID 목록

@Column({ type: 'simple-json', default: '{}' })
eventFlags: Record<string, any>;  // 이벤트 상태 플래그

@Column({ type: 'text', default: 'NORMAL' })
currentSeason: string;  // 현재 시즌 상태

@Column({ type: 'int', default: 0 })
eventSeed: number;  // 게임별 랜덤 시드
```

### 2.3 이벤트 평가 엔진 흐름

```
턴 시작
  |
  v
[1] 시즌 상태 업데이트
  |
  v
[2] 연쇄 이벤트 체크 (이전 이벤트 후속 있는지)
  |-- 있으면 --> 연쇄 이벤트 발생
  |
  v
[3] 위기 이벤트 체크 (인프라 취약점 기반)
  |-- 조건 충족 --> 위기 이벤트 발생
  |
  v
[4] 기회 이벤트 체크 (메트릭 달성 기반)
  |-- 조건 충족 --> 기회 이벤트 발생
  |
  v
[5] 랜덤 이벤트 풀에서 확률 계산
  |-- 당첨 --> 랜덤 이벤트 발생
  |
  v
[6] 기존 턴 선택지 제시 (+ 이벤트 응답 선택지)
```

**한 턴에 최대 1개의 동적 이벤트만 발생**한다. 우선순위: 연쇄 > 위기 > 기회 > 랜덤.

---

## 3. 랜덤 이벤트 (랜덤 이벤트 시스템)

### 3.1 설계 원칙

- 매 턴 25-40% 확률로 랜덤 이벤트 1개 발생
- 게임 상태에 따라 이벤트 풀이 달라짐 (컨텍스트 인식)
- 각 이벤트는 2-3개의 대응 선택지 제공
- 모든 선택지에 AWS 교육 포인트 포함

### 3.2 카테고리별 이벤트 목록

#### 3.2.1 시장 이벤트 (MARKET)

**이벤트 M01: 경쟁사 출현**
```yaml
eventId: "MARKET_COMPETITOR_LAUNCH"
title: "경쟁사 서비스 출시"
description: |
  같은 도메인의 경쟁 스타트업이 대규모 마케팅과 함께 서비스를 런칭했습니다.
  "우리보다 자금력이 풍부한 팀이 비슷한 서비스를 출시했습니다.
  이미 테크 미디어에서 큰 화제가 되고 있습니다."
severity: MEDIUM
triggerCondition:
  minTurn: 5
  maxTurn: 15
  minUsers: 1000
  baseProbability: 0.15
responses:
  - responseId: "M01_R1"
    text: |
      차별화 전략: CloudFront CDN을 도입하여 서비스 속도를 극대화하고,
      경쟁사보다 빠른 사용자 경험으로 승부합니다.
    effects:
      users: 2000
      cash: -5000000
      trust: 5
      infra: ["CloudFront"]
    awsLesson: |
      [AWS 교훈] Amazon CloudFront는 전 세계 엣지 로케이션을 활용한 CDN 서비스입니다.
      정적/동적 콘텐츠를 사용자에게 가까운 위치에서 제공하여 지연 시간을 최소화합니다.
      경쟁 우위의 핵심은 종종 인프라 성능에서 나옵니다.

  - responseId: "M01_R2"
    text: |
      가격 인하 공세: 프리미엄 기능을 무료로 풀어 유저 확보에 집중합니다.
      단기 손실을 감수하고 시장 점유율을 지킵니다.
    effects:
      users: 5000
      cash: -15000000
      trust: -3
      infra: []
    awsLesson: |
      [AWS 교훈] 가격 경쟁은 인프라 비용 최적화가 뒷받침되어야 합니다.
      AWS Reserved Instances나 Savings Plans를 통해 컴퓨팅 비용을 최대 72% 절감할 수 있습니다.
      비용 구조가 탄탄해야 가격 전쟁에서 살아남습니다.

  - responseId: "M01_R3"
    text: |
      니치 공략: 경쟁사가 다루지 않는 특화 기능에 집중합니다.
      기존 유저 만족도를 높여 이탈을 방지합니다.
    effects:
      users: -500
      cash: -3000000
      trust: 8
      infra: []
    awsLesson: |
      [AWS 교훈] AWS Lambda와 API Gateway를 활용하면 빠르게 새로운 마이크로서비스를 추가할 수 있습니다.
      서버리스 아키텍처는 실험적 기능을 저비용으로 출시하는 데 최적입니다.
```

**이벤트 M02: 바이럴 모먼트**
```yaml
eventId: "MARKET_VIRAL_MOMENT"
title: "서비스 바이럴 발생!"
description: |
  유명 인플루언서가 우리 서비스를 소개하는 영상이 폭발적으로 퍼지고 있습니다.
  "갑자기 가입자가 폭증하고 있습니다! 서버가 버틸 수 있을까요?"
severity: HIGH
triggerCondition:
  minTurn: 3
  maxTurn: 20
  minUsers: 500
  minTrust: 30
  baseProbability: 0.10
responses:
  - responseId: "M02_R1"
    text: |
      Auto Scaling 긴급 설정: 즉시 Auto Scaling 그룹을 구성하여
      트래픽 폭증에 자동 대응합니다.
    effects:
      users: 15000
      cash: -8000000
      trust: 10
      infra: ["Auto Scaling"]
    requireInfra: []
    awsLesson: |
      [AWS 교훈] EC2 Auto Scaling은 CPU 사용률, 네트워크 트래픽 등의 지표를 기반으로
      인스턴스 수를 자동 조절합니다. Target Tracking Scaling Policy를 사용하면
      목표 지표만 설정하면 AWS가 알아서 스케일링합니다.
      바이럴은 예측 불가능하므로, 사전에 Auto Scaling을 구성해두는 것이 핵심입니다.

  - responseId: "M02_R2"
    text: |
      트래픽 제한: 서비스 안정성을 우선하여 신규 가입을 대기열로 전환합니다.
      기존 유저 경험을 보호합니다.
    effects:
      users: 3000
      cash: -1000000
      trust: 5
      infra: []
    awsLesson: |
      [AWS 교훈] Amazon API Gateway의 스로틀링(Throttling) 기능을 사용하면
      초당 요청 수를 제한하여 백엔드를 보호할 수 있습니다.
      WAF Rate-based Rules와 결합하면 더욱 정교한 트래픽 관리가 가능합니다.

  - responseId: "M02_R3"
    text: |
      인프라 무시: 마케팅 효과를 극대화하기 위해 모든 자원을
      콘텐츠 제작과 SNS 확산에 투입합니다.
    effects:
      users: 20000
      cash: -5000000
      trust: -15
      infra: []
    awsLesson: |
      [AWS 교훈] 인프라 준비 없이 트래픽 폭증을 맞으면 서비스 장애가 발생합니다.
      이것이 바로 'blast radius'의 실제 사례입니다.
      CloudWatch Alarms를 설정하여 트래픽 이상 징후를 조기에 감지해야 합니다.
```

**이벤트 M03: 시장 침체**
```yaml
eventId: "MARKET_DOWNTURN"
title: "스타트업 시장 한파"
description: |
  글로벌 경기 침체로 스타트업 투자 시장이 급격히 위축되고 있습니다.
  "VC들이 포트폴리오 정리에 나서면서 후속 투자가 어려워지고 있습니다.
  런웨이를 확보하지 않으면 위험할 수 있습니다."
severity: HIGH
triggerCondition:
  minTurn: 8
  maxTurn: 20
  minCash: 5000000
  baseProbability: 0.08
responses:
  - responseId: "M03_R1"
    text: |
      비용 최적화: AWS 비용을 대폭 절감합니다. Reserved Instances 전환,
      미사용 리소스 정리, Graviton 인스턴스 마이그레이션을 실행합니다.
    effects:
      users: 0
      cash: 10000000
      trust: 3
      infra: []
    awsLesson: |
      [AWS 교훈] AWS Cost Explorer와 Trusted Advisor를 활용하면 비용 최적화 기회를 찾을 수 있습니다.
      Graviton 프로세서 기반 인스턴스는 x86 대비 최대 40% 더 나은 가성비를 제공합니다.
      FinOps 관행은 스타트업 생존의 핵심입니다.

  - responseId: "M03_R2"
    text: |
      공격적 확장: 경쟁사들이 위축될 때 오히려 시장을 장악합니다.
      자금을 투입하여 경쟁사 이탈 유저를 흡수합니다.
    effects:
      users: 8000
      cash: -20000000
      trust: 5
      infra: []
    awsLesson: |
      [AWS 교훈] 확장 전략 시에도 AWS Budgets으로 비용 한도를 설정해야 합니다.
      예산 초과 시 SNS 알림과 자동 조치(인스턴스 중지 등)를 구성하여
      통제 불능 상태를 방지해야 합니다.

  - responseId: "M03_R3"
    text: |
      수익 모델 전환: B2C에서 B2B SaaS로 피벗하여 안정적 매출을 확보합니다.
      기업 고객에게 API를 제공합니다.
    effects:
      users: -2000
      cash: 15000000
      trust: -5
      infra: []
    awsLesson: |
      [AWS 교훈] B2B API 서비스 전환 시 Amazon API Gateway를 통해 API Key 관리,
      사용량 계획(Usage Plans), 요금 청구가 가능합니다.
      AWS Marketplace에서 SaaS 제품을 판매할 수도 있습니다.
```

**이벤트 M04: 대기업 진출**
```yaml
eventId: "MARKET_BIGTECH_ENTRY"
title: "대기업의 시장 진출"
description: |
  국내 대형 IT 기업이 우리와 동일한 도메인에 신규 서비스를 출시한다고 발표했습니다.
  "자금력과 기존 유저 베이스를 가진 대기업이 들어옵니다.
  어떻게 대응하시겠습니까?"
severity: HIGH
triggerCondition:
  minTurn: 10
  maxTurn: 22
  minUsers: 10000
  baseProbability: 0.07
responses:
  - responseId: "M04_R1"
    text: |
      기술 해자 구축: EKS와 마이크로서비스 아키텍처로 전환하여
      대기업이 따라올 수 없는 빠른 기능 배포 속도를 확보합니다.
    effects:
      users: 1000
      cash: -12000000
      trust: 8
      infra: ["EKS"]
    awsLesson: |
      [AWS 교훈] Amazon EKS에서 마이크로서비스를 운영하면 팀별 독립 배포가 가능합니다.
      CI/CD 파이프라인과 결합하면 하루에도 수십 번 배포할 수 있어,
      대기업의 느린 의사결정을 압도할 수 있습니다.

  - responseId: "M04_R2"
    text: |
      인수 협상: 대기업에 인수 제안을 보내 합리적 엑시트를 시도합니다.
    effects:
      users: 0
      cash: 50000000
      trust: -10
      infra: []
    awsLesson: |
      [AWS 교훈] M&A 시 인프라 실사(Due Diligence)에서 IaC(Infrastructure as Code) 수준,
      보안 컴플라이언스, 데이터 마이그레이션 용이성이 평가됩니다.
      AWS CloudFormation/Terraform으로 인프라를 코드화해두면 기업 가치가 올라갑니다.

  - responseId: "M04_R3"
    text: |
      데이터 차별화: 축적된 유저 데이터를 활용한 AI 개인화 기능을 출시합니다.
      대기업이 단기간에 따라잡을 수 없는 데이터 해자를 구축합니다.
    effects:
      users: 3000
      cash: -8000000
      trust: 6
      infra: ["Bedrock"]
    awsLesson: |
      [AWS 교훈] Amazon Bedrock은 기초 모델(FM)을 API로 제공하여
      자체 데이터로 맞춤형 AI를 구축할 수 있게 합니다.
      RAG(Retrieval Augmented Generation) 패턴으로 자사 데이터의 가치를 극대화하세요.
```

**이벤트 M05: 규제 이슈**
```yaml
eventId: "MARKET_REGULATION"
title: "개인정보보호 규제 강화"
description: |
  정부가 스타트업 대상 개인정보보호 규제를 대폭 강화하는 법안을 발표했습니다.
  "3개월 내에 데이터 암호화와 감사 로그 체계를 갖추지 않으면
  서비스 운영이 불가능해질 수 있습니다."
severity: MEDIUM
triggerCondition:
  minTurn: 7
  maxTurn: 20
  minUsers: 5000
  baseProbability: 0.10
responses:
  - responseId: "M05_R1"
    text: |
      선제 대응: KMS 암호화, CloudTrail 감사 로그, GuardDuty 위협 탐지를
      전면 도입합니다. 비용이 들지만 신뢰도가 크게 상승합니다.
    effects:
      users: 0
      cash: -10000000
      trust: 15
      infra: []
    awsLesson: |
      [AWS 교훈] AWS KMS(Key Management Service)로 데이터를 암호화하고,
      CloudTrail로 모든 API 호출을 기록하며,
      GuardDuty로 위협을 자동 탐지합니다.
      이 세 가지가 AWS 보안의 기본 삼각 축입니다.

  - responseId: "M05_R2"
    text: |
      최소 준수: 법적 최소 요건만 충족하고 나머지 자원은 성장에 투입합니다.
    effects:
      users: 0
      cash: -3000000
      trust: 3
      infra: []
    awsLesson: |
      [AWS 교훈] 최소한의 보안도 AWS Config Rules로 자동화할 수 있습니다.
      규정 준수 상태를 지속적으로 모니터링하여 위반 사항을 즉시 감지합니다.
      하지만 최소 준수는 보안 사고 발생 시 큰 리스크가 됩니다.

  - responseId: "M05_R3"
    text: |
      규제를 기회로: 보안을 핵심 차별점으로 마케팅합니다.
      "가장 안전한 서비스"라는 브랜드를 구축합니다.
    effects:
      users: 2000
      cash: -7000000
      trust: 12
      infra: []
    awsLesson: |
      [AWS 교훈] AWS Artifact에서 SOC 2, ISO 27001 등의 컴플라이언스 보고서를 활용하면
      고객 신뢰를 구축할 수 있습니다.
      AWS의 공동 책임 모델(Shared Responsibility Model)을 이해하고 활용하세요.
```

#### 3.2.2 기술 이벤트 (TECH)

**이벤트 T01: AWS 리전 장애**
```yaml
eventId: "TECH_AWS_OUTAGE"
title: "AWS 서울 리전 부분 장애"
description: |
  AWS 서울 리전(ap-northeast-2)에서 EC2와 RDS 서비스에 부분 장애가 발생했습니다.
  "AWS Status 페이지에 서울 리전 경고가 떴습니다!
  우리 서비스도 영향을 받고 있습니다."
severity: CRITICAL
triggerCondition:
  minTurn: 5
  maxTurn: 23
  minUsers: 1000
  baseProbability: 0.06
responses:
  - responseId: "T01_R1"
    text: |
      멀티 AZ 페일오버: 이미 구성된 멀티 AZ 환경으로 자동 페일오버합니다.
      (멀티 AZ 미구성 시 효과 없음)
    effects:
      users: 0
      cash: -2000000
      trust: 10
      infra: []
    requireInfra: ["Aurora"]
    awsLesson: |
      [AWS 교훈] Aurora는 기본적으로 3개 AZ에 6개 데이터 복사본을 유지합니다.
      자동 페일오버 시간은 보통 30초 이내입니다.
      이것이 관리형 데이터베이스를 사용하는 핵심 이유입니다.

  - responseId: "T01_R2"
    text: |
      수동 복구: 백업에서 데이터를 복구하고 서비스를 재시작합니다.
      복구 시간 동안 서비스가 중단됩니다.
    effects:
      users: -3000
      cash: -5000000
      trust: -8
      infra: []
    awsLesson: |
      [AWS 교훈] RTO(복구 시간 목표)와 RPO(복구 시점 목표)를 사전에 정의해야 합니다.
      AWS Backup으로 자동화된 백업 정책을 수립하고,
      정기적으로 복구 훈련(DR drill)을 실시해야 합니다.

  - responseId: "T01_R3"
    text: |
      다른 리전 긴급 이전: 도쿄 리전(ap-northeast-1)으로 긴급 이전합니다.
      비용이 크지만 서비스를 유지할 수 있습니다.
    effects:
      users: -500
      cash: -15000000
      trust: 5
      infra: ["multi-region"]
    awsLesson: |
      [AWS 교훈] 멀티 리전 아키텍처는 비용이 높지만 가장 높은 가용성을 보장합니다.
      Route 53의 장애 조치 라우팅(Failover Routing)과
      Aurora Global Database를 활용하면 리전 수준의 DR이 가능합니다.
```

**이벤트 T02: 보안 침해 시도**
```yaml
eventId: "TECH_SECURITY_BREACH"
title: "보안 침해 시도 감지"
description: |
  보안 모니터링에서 의심스러운 접근 패턴이 감지되었습니다.
  "외부에서 SQL Injection과 XSS 공격이 대량으로 들어오고 있습니다.
  아직 침투에 성공하지는 못한 것 같지만, 대응이 필요합니다."
severity: HIGH
triggerCondition:
  minTurn: 4
  maxTurn: 24
  minUsers: 2000
  baseProbability: 0.12
responses:
  - responseId: "T02_R1"
    text: |
      WAF 도입: AWS WAF를 즉시 배포하여 SQL Injection, XSS 등
      OWASP Top 10 공격을 자동 차단합니다.
    effects:
      users: 0
      cash: -5000000
      trust: 8
      infra: []
    awsLesson: |
      [AWS 교훈] AWS WAF(Web Application Firewall)는 CloudFront 또는 ALB 앞에 배치하여
      악성 요청을 필터링합니다. AWS Managed Rules에는 OWASP Top 10 대응 규칙이 포함되어 있어
      몇 분 만에 보안 수준을 크게 높일 수 있습니다.

  - responseId: "T02_R2"
    text: |
      내부 보안 강화: IAM 정책을 최소 권한 원칙으로 전면 재구성하고,
      MFA를 필수화합니다.
    effects:
      users: 0
      cash: -3000000
      trust: 6
      infra: []
    awsLesson: |
      [AWS 교훈] IAM 최소 권한 원칙(Least Privilege)은 AWS 보안의 기본입니다.
      IAM Access Analyzer로 미사용 권한을 자동 탐지하고,
      SCP(Service Control Policy)로 조직 수준의 가드레일을 설정하세요.

  - responseId: "T02_R3"
    text: |
      무시하고 진행: 아직 실제 침해는 없으므로 개발에 집중합니다.
    effects:
      users: 0
      cash: 0
      trust: -5
      infra: []
    awsLesson: |
      [AWS 교훈] 보안 위협을 무시하면 신뢰도가 하락합니다.
      실제 침해 발생 시 GDPR/개인정보보호법 위반으로 막대한 벌금과
      서비스 신뢰 붕괴로 이어질 수 있습니다.
      GuardDuty는 무료 체험으로 시작할 수 있으니 비용 부담도 적습니다.
```

**이벤트 T03: 성능 병목 발생**
```yaml
eventId: "TECH_PERFORMANCE_BOTTLENECK"
title: "데이터베이스 성능 병목"
description: |
  서비스 응답 시간이 급격히 늘어나고 있습니다.
  "DB 쿼리 응답 시간이 평균 3초를 넘기고 있습니다.
  유저들의 불만이 쏟아지고 있습니다."
severity: MEDIUM
triggerCondition:
  minTurn: 6
  maxTurn: 22
  minUsers: 5000
  excludeInfra: ["Redis"]
  baseProbability: 0.15
responses:
  - responseId: "T03_R1"
    text: |
      Redis 캐시 도입: ElastiCache Redis를 도입하여 자주 조회되는 데이터를
      캐싱합니다. DB 부하를 80% 이상 줄일 수 있습니다.
    effects:
      users: 1000
      cash: -6000000
      trust: 7
      infra: ["Redis"]
    awsLesson: |
      [AWS 교훈] Amazon ElastiCache for Redis는 마이크로초 단위의 응답 시간을 제공합니다.
      세션 관리, 리더보드, 실시간 분석 등에 활용됩니다.
      읽기 부하가 높은 워크로드에서는 필수적인 캐시 레이어입니다.

  - responseId: "T03_R2"
    text: |
      DB 최적화: 쿼리 튜닝, 인덱스 추가, 읽기 전용 복제본을 구성합니다.
    effects:
      users: 0
      cash: -3000000
      trust: 4
      infra: []
    awsLesson: |
      [AWS 교훈] RDS Performance Insights는 DB 성능 병목을 시각적으로 분석합니다.
      Top SQL 기능으로 가장 부하가 큰 쿼리를 즉시 찾을 수 있습니다.
      읽기 전용 복제본(Read Replica)으로 읽기 부하를 분산하세요.

  - responseId: "T03_R3"
    text: |
      Aurora 마이그레이션: MySQL에서 Aurora로 마이그레이션하여
      근본적인 성능 개선을 달성합니다.
    effects:
      users: 500
      cash: -10000000
      trust: 10
      infra: ["Aurora"]
    awsLesson: |
      [AWS 교훈] Aurora는 MySQL 대비 최대 5배, PostgreSQL 대비 3배의 처리량을 제공합니다.
      스토리지가 자동으로 확장(최대 128TB)되며, 읽기 복제본을 최대 15개까지 추가할 수 있습니다.
      DMS(Database Migration Service)로 무중단 마이그레이션이 가능합니다.
```

**이벤트 T04: 메모리 누수 발견**
```yaml
eventId: "TECH_MEMORY_LEAK"
title: "프로덕션 메모리 누수"
description: |
  운영 서버에서 메모리 사용량이 지속적으로 증가하고 있습니다.
  "매 시간 메모리가 100MB씩 늘어나고 있습니다.
  12시간 후면 OOM(Out of Memory)으로 서버가 다운될 것 같습니다."
severity: MEDIUM
triggerCondition:
  minTurn: 3
  maxTurn: 18
  minUsers: 500
  baseProbability: 0.10
responses:
  - responseId: "T04_R1"
    text: |
      X-Ray 프로파일링: AWS X-Ray를 도입하여 메모리 누수 지점을 정확히 추적하고
      핫픽스를 배포합니다.
    effects:
      users: 0
      cash: -2000000
      trust: 5
      infra: []
    awsLesson: |
      [AWS 교훈] AWS X-Ray는 분산 시스템에서 요청 흐름을 추적하고 병목을 찾습니다.
      서비스 맵으로 마이크로서비스 간 의존성을 시각화하고,
      지연 시간과 에러율을 실시간으로 모니터링할 수 있습니다.

  - responseId: "T04_R2"
    text: |
      서버 재시작 자동화: CloudWatch 알람 기반으로 메모리 임계치 도달 시
      자동 재시작되도록 구성합니다. 근본 해결은 아니지만 당장의 위험은 방지합니다.
    effects:
      users: -200
      cash: -1000000
      trust: -2
      infra: []
    awsLesson: |
      [AWS 교훈] CloudWatch Alarms + EC2 Auto Recovery로 자동 복구를 구성할 수 있습니다.
      하지만 이것은 임시 방편이며, 근본 원인을 해결해야 합니다.
      Systems Manager Automation으로 복구 런북을 자동화하세요.

  - responseId: "T04_R3"
    text: |
      컨테이너 전환: ECS/Fargate로 전환하여 컨테이너 수준의 리소스 격리와
      자동 재시작을 확보합니다.
    effects:
      users: 0
      cash: -8000000
      trust: 6
      infra: ["ECS"]
    awsLesson: |
      [AWS 교훈] Amazon ECS on Fargate는 서버리스 컨테이너 서비스입니다.
      메모리/CPU를 태스크 단위로 격리하므로 누수의 blast radius가 제한됩니다.
      Health Check 기반 자동 태스크 교체로 가용성이 크게 향상됩니다.
```

**이벤트 T05: 배포 사고**
```yaml
eventId: "TECH_DEPLOY_INCIDENT"
title: "프로덕션 배포 사고"
description: |
  새 버전 배포 후 500 에러가 폭증하고 있습니다.
  "배포한 코드에 치명적인 버그가 있었습니다!
  현재 에러율이 30%를 넘고 있습니다."
severity: HIGH
triggerCondition:
  minTurn: 4
  maxTurn: 22
  minUsers: 1000
  baseProbability: 0.08
responses:
  - responseId: "T05_R1"
    text: |
      즉시 롤백: Blue/Green 배포 전략으로 이전 버전으로 즉시 롤백합니다.
    effects:
      users: -500
      cash: -1000000
      trust: 3
      infra: []
    awsLesson: |
      [AWS 교훈] AWS CodeDeploy의 Blue/Green 배포는 새 버전에 문제가 있을 때
      수초 내에 이전 버전으로 롤백할 수 있습니다.
      Canary 배포(10% 먼저 배포)로 위험을 최소화하는 것이 모범 사례입니다.

  - responseId: "T05_R2"
    text: |
      핫픽스 긴급 배포: 문제를 파악하여 수정 코드를 빠르게 배포합니다.
      위험하지만 성공하면 빠르게 정상화됩니다.
    effects:
      users: -2000
      cash: -3000000
      trust: -5
      infra: []
    awsLesson: |
      [AWS 교훈] 핫픽스도 CI/CD 파이프라인을 통해야 합니다.
      AWS CodePipeline에서 테스트 단계를 건너뛰고 싶은 유혹이 있지만,
      최소한의 자동 테스트(smoke test)는 반드시 통과시켜야 합니다.

  - responseId: "T05_R3"
    text: |
      Feature Flag 비활성화: 문제가 된 기능만 Feature Flag로 비활성화하고
      나머지 서비스는 정상 운영합니다.
    effects:
      users: -100
      cash: -500000
      trust: 5
      infra: []
    awsLesson: |
      [AWS 교훈] AWS AppConfig의 Feature Flag 기능을 사용하면
      코드 배포 없이 기능을 켜고 끌 수 있습니다.
      점진적 롤아웃(1% -> 10% -> 50% -> 100%)으로 위험을 관리하세요.
```

#### 3.2.3 팀 이벤트 (TEAM)

**이벤트 H01: 핵심 인재 기회**
```yaml
eventId: "TEAM_KEY_HIRE"
title: "핵심 인재 영입 기회"
description: |
  AWS에서 5년 경력의 시니어 SRE 엔지니어가 이직을 고려하고 있다는 소식입니다.
  "이 사람을 영입하면 인프라 운영 역량이 크게 향상될 것입니다.
  하지만 연봉이 상당합니다."
severity: LOW
triggerCondition:
  minTurn: 4
  maxTurn: 18
  baseProbability: 0.12
responses:
  - responseId: "H01_R1"
    text: |
      파격 조건 제시: 높은 연봉과 스톡옵션으로 영입합니다.
      인프라 운영 효율이 크게 개선됩니다.
    effects:
      users: 0
      cash: -15000000
      trust: 10
      infra: []
    awsLesson: |
      [AWS 교훈] SRE(Site Reliability Engineering) 팀은 SLO(Service Level Objectives)를
      정의하고 에러 버짓(Error Budget)을 관리합니다.
      CloudWatch SLI/SLO 대시보드로 서비스 신뢰성을 정량적으로 관리할 수 있습니다.

  - responseId: "H01_R2"
    text: |
      합리적 제안: 시장 수준의 연봉에 성장 비전으로 어필합니다.
      영입 성공 확률은 낮지만 비용 부담이 적습니다.
    effects:
      users: 0
      cash: -5000000
      trust: 4
      infra: []
    awsLesson: |
      [AWS 교훈] 인재 영입이 어렵다면 AWS Well-Architected Tool을 활용하여
      기존 팀의 아키텍처 역량을 높일 수 있습니다.
      AWS의 무료 교육 리소스(Skill Builder)도 팀 역량 강화에 효과적입니다.

  - responseId: "H01_R3"
    text: |
      외부 컨설팅 대체: 영입 대신 AWS 공인 파트너(APN)에게
      아키텍처 리뷰와 운영 자문을 의뢰합니다.
    effects:
      users: 0
      cash: -8000000
      trust: 6
      infra: []
    awsLesson: |
      [AWS 교훈] AWS Partner Network(APN)의 공인 파트너는
      Well-Architected Review를 수행하고 개선안을 제시합니다.
      AWS IQ를 통해 전문가를 직접 매칭할 수도 있습니다.
```

**이벤트 H02: 개발자 번아웃**
```yaml
eventId: "TEAM_BURNOUT"
title: "개발팀 번아웃 위기"
description: |
  3개월 연속 야근으로 개발팀의 사기가 바닥입니다.
  "팀원들이 하나둘 퇴사를 고민하고 있습니다.
  당장의 생산성은 유지되지만, 이대로는 오래 못 갑니다."
severity: MEDIUM
triggerCondition:
  minTurn: 8
  maxTurn: 22
  minUsers: 3000
  baseProbability: 0.10
responses:
  - responseId: "H02_R1"
    text: |
      자동화 투자: 반복 업무를 자동화하여 개발자의 부담을 줄입니다.
      CI/CD 파이프라인 강화와 인프라 자동화에 투자합니다.
    effects:
      users: 0
      cash: -7000000
      trust: 5
      infra: []
    awsLesson: |
      [AWS 교훈] AWS CodePipeline + CodeBuild + CodeDeploy로 완전 자동화된
      CI/CD 파이프라인을 구축하세요. 수동 배포에 소모되던 시간을 기능 개발에 투입할 수 있습니다.
      Infrastructure as Code(CloudFormation/CDK)로 인프라 변경도 코드 리뷰 기반으로 진행하세요.

  - responseId: "H02_R2"
    text: |
      팀 리프레시: 1주일 강제 휴식 + 팀 빌딩 워크숍을 진행합니다.
      개발 속도가 일시적으로 늦어지지만 장기적으로 유리합니다.
    effects:
      users: -1000
      cash: -5000000
      trust: 3
      infra: []
    awsLesson: |
      [AWS 교훈] 운영 부담을 줄이려면 관리형 서비스를 적극 활용하세요.
      RDS 대신 Aurora Serverless, EC2 대신 Fargate, 직접 운영 대신 관리형 서비스.
      "미분화된 무거운 짐(undifferentiated heavy lifting)"을 AWS에 맡기세요.

  - responseId: "H02_R3"
    text: |
      급여 인상: 보상을 올려 당장의 이탈을 방지합니다.
    effects:
      users: 0
      cash: -10000000
      trust: 2
      infra: []
    awsLesson: |
      [AWS 교훈] 단순 보상 인상은 근본 해결이 아닙니다.
      On-call 부담을 줄이려면 CloudWatch Synthetics(카나리아)로 사전 모니터링하고,
      Systems Manager Incident Manager로 인시던트 대응을 체계화하세요.
```

**이벤트 H03: 핵심 개발자 퇴사**
```yaml
eventId: "TEAM_KEY_DEPARTURE"
title: "핵심 개발자 퇴사 통보"
description: |
  인프라를 전담하던 시니어 개발자가 퇴사를 통보했습니다.
  "이 사람이 나가면 인프라 운영에 심각한 공백이 생깁니다.
  문서화도 부족하고, 이 사람만 아는 설정이 많습니다."
severity: HIGH
triggerCondition:
  minTurn: 6
  maxTurn: 20
  baseProbability: 0.08
responses:
  - responseId: "H03_R1"
    text: |
      IaC 전환 프로젝트: 퇴사 전 2주 동안 모든 인프라를
      CloudFormation/Terraform 코드로 전환합니다.
    effects:
      users: 0
      cash: -5000000
      trust: 3
      infra: []
    awsLesson: |
      [AWS 교훈] Infrastructure as Code는 "버스 팩터(Bus Factor)"를 해결합니다.
      AWS CDK(Cloud Development Kit)를 사용하면 TypeScript로 인프라를 정의할 수 있어
      개발자 친화적입니다. 코드로 관리되면 누구나 인프라를 이해하고 변경할 수 있습니다.

  - responseId: "H03_R2"
    text: |
      리텐션 제안: 파격적인 조건으로 잔류를 설득합니다.
    effects:
      users: 0
      cash: -12000000
      trust: 5
      infra: []
    awsLesson: |
      [AWS 교훈] 한 사람에게 의존하는 구조 자체가 리스크입니다.
      AWS Well-Architected Framework의 운영 우수성(Operational Excellence) 기둥에서는
      런북(Runbook) 문서화와 지식 공유를 핵심 원칙으로 제시합니다.

  - responseId: "H03_R3"
    text: |
      관리형 서비스 전환: 자체 운영 부담을 줄이기 위해
      가능한 모든 것을 AWS 관리형 서비스로 마이그레이션합니다.
    effects:
      users: 0
      cash: -8000000
      trust: 6
      infra: []
    awsLesson: |
      [AWS 교훈] 자체 관리 MySQL을 RDS/Aurora로, 자체 Redis를 ElastiCache로,
      자체 Kubernetes를 EKS로 전환하면 운영 부담이 크게 줄어듭니다.
      관리형 서비스는 패치, 백업, 모니터링을 AWS가 대신 해줍니다.
```

#### 3.2.4 투자자 이벤트 (INVESTOR)

**이벤트 I01: 깜짝 투자 제안**
```yaml
eventId: "INVESTOR_SURPRISE_OFFER"
title: "해외 VC 투자 제안"
description: |
  실리콘밸리의 유명 VC로부터 예상치 못한 투자 제안이 왔습니다.
  "Y Combinator 출신 파트너가 우리 서비스에 관심을 보이고 있습니다.
  빠른 의사결정을 원하고 있습니다."
severity: MEDIUM
triggerCondition:
  minTurn: 6
  maxTurn: 18
  minUsers: 5000
  minTrust: 35
  baseProbability: 0.08
responses:
  - responseId: "I01_R1"
    text: |
      투자 수용: 지분 10%를 양도하고 대규모 투자금을 유치합니다.
      글로벌 진출의 발판이 됩니다.
    effects:
      users: 3000
      cash: 100000000
      trust: 10
      infra: []
    awsLesson: |
      [AWS 교훈] 글로벌 서비스 확장 시 AWS의 글로벌 인프라(33개 리전, 100+ AZ)가
      핵심 경쟁력이 됩니다. 투자자들은 글로벌 확장성을 중요하게 평가합니다.
      CloudFront + Global Accelerator로 글로벌 사용자 경험을 최적화하세요.

  - responseId: "I01_R2"
    text: |
      협상 지속: 더 유리한 조건을 위해 추가 협상을 요청합니다.
      시간이 걸리지만 더 좋은 밸류에이션을 받을 수 있습니다.
    effects:
      users: 0
      cash: 50000000
      trust: 5
      infra: []
    awsLesson: |
      [AWS 교훈] 투자 실사에서 기술 스택과 확장성이 중요합니다.
      AWS Well-Architected Review 결과를 투자자에게 제시하면
      기술적 성숙도를 입증할 수 있습니다.

  - responseId: "I01_R3"
    text: |
      거절: 현재 자금으로 충분하다고 판단하여 투자를 거절합니다.
      지분 희석을 방지합니다.
    effects:
      users: 0
      cash: 0
      trust: -3
      infra: []
    awsLesson: |
      [AWS 교훈] 투자 없이도 AWS의 Startup Credits 프로그램으로
      최대 $100,000의 AWS 크레딧을 받을 수 있습니다.
      AWS Activate 프로그램을 적극 활용하세요.
```

**이벤트 I02: 투자자 실사**
```yaml
eventId: "INVESTOR_DUE_DILIGENCE"
title: "기존 투자자의 기술 실사"
description: |
  기존 투자자가 후속 투자를 위한 기술 실사(Technical Due Diligence)를 요청했습니다.
  "투자자 측 CTO가 직접 우리 아키텍처를 검토하겠다고 합니다.
  준비 상태에 따라 후속 투자 규모가 달라질 수 있습니다."
severity: MEDIUM
triggerCondition:
  minTurn: 10
  maxTurn: 22
  minCash: 10000000
  baseProbability: 0.10
responses:
  - responseId: "I02_R1"
    text: |
      완벽 준비: Well-Architected Review를 사전에 실시하고,
      모니터링 대시보드와 장애 대응 문서를 정비합니다.
    effects:
      users: 0
      cash: -3000000
      trust: 12
      infra: []
    awsLesson: |
      [AWS 교훈] AWS Well-Architected Tool은 6가지 기둥(운영 우수성, 보안, 안정성,
      성능 효율성, 비용 최적화, 지속 가능성)으로 아키텍처를 평가합니다.
      기술 실사 전 이 도구로 사전 점검하면 약점을 미리 보완할 수 있습니다.

  - responseId: "I02_R2"
    text: |
      있는 그대로 공개: 현재 상태를 솔직하게 보여주고
      개선 로드맵을 제시합니다.
    effects:
      users: 0
      cash: 0
      trust: 3
      infra: []
    awsLesson: |
      [AWS 교훈] Trusted Advisor와 AWS Config로 현재 인프라 상태를 객관적으로 평가하고,
      개선 항목을 우선순위별로 정리할 수 있습니다.
      투자자는 현재 상태보다 개선 의지와 계획을 더 중요하게 봅니다.

  - responseId: "I02_R3"
    text: |
      실사 연기: 준비 시간이 필요하다며 한 달 연기를 요청합니다.
    effects:
      users: 0
      cash: 0
      trust: -8
      infra: []
    awsLesson: |
      [AWS 교훈] 상시 실사 대비(Audit Readiness)는 DevSecOps의 핵심입니다.
      AWS Audit Manager로 규정 준수 증거를 지속적으로 수집하면
      갑작스러운 실사에도 당황하지 않을 수 있습니다.
```
