# 다중 승리 경로 설계 문서 (Victory Paths PRD)

## AWS 스타트업 타이쿤 - 다중 엔딩 시스템

---

## 1. 현황 분석

### 1.1 현재 승리 조건 (단일 경로)

현재 게임은 단 하나의 승리 조건만 존재한다:

```
승리 조건 (WON_IPO):
- users >= 100,000
- cash >= 300,000,000 (3억 원)
- trust >= 80
- infrastructure에 'RDS'와 'EKS' 포함
```

### 1.2 현재 패배 조건 (4가지)

| 상태 | 조건 | 설명 |
|------|------|------|
| `LOST_BANKRUPT` | cash < 0 | 파산 |
| `LOST_OUTAGE` | trust < 20 (유저 존재 시) | 서비스 장애로 회생 불가 |
| `LOST_EQUITY` | equityPercentage < 20 | 투자자에게 경영권 상실 |
| `LOST_FIRED_CTO` | 25턴 종료 시 IPO 미달성 | CTO 해고 |

### 1.3 문제점

1. **단일 경로의 단조로움**: 모든 플레이어가 동일한 목표를 향해 동일한 전략을 사용
2. **높은 인프라 요구**: RDS + EKS가 필수이므로 인프라 선택의 다양성이 없음
3. **균일한 메트릭 요구**: 유저, 자금, 신뢰도 모두 높아야 하므로 전략적 트레이드오프가 불가
4. **교육적 가치 제한**: 오직 "스케일업" 패턴만 학습 가능
5. **리플레이 가치 부족**: 한 번 클리어하면 재도전 동기가 약함

---

## 2. 다중 승리 경로 설계

### 설계 원칙

1. **각 경로는 현실 스타트업 전략을 반영한다**: 실제 존재하는 스타트업 성공 유형 기반
2. **각 경로는 서로 다른 AWS 아키텍처 패턴을 가르친다**: 교육적 가치의 다양화
3. **메트릭 가중치가 경로마다 다르다**: 유저 중시, 수익 중시, 기술 중시 등 차별화
4. **난이도가 다르다**: 쉬운 경로부터 극한 도전까지 스펙트럼 제공
5. **내러티브 엔딩이 고유하다**: 각 경로만의 스토리 결말로 만족감 제공

---

## 경로 1: 유니콘 IPO (Unicorn IPO)

### 개요

```
코드명: WON_IPO_UNICORN
난이도: ★★★★☆ (상)
한 줄 요약: "글로벌 시장을 지배하는 유니콘 기업으로 나스닥 상장"
현실 모델: 쿠팡, 토스, 야놀자
```

### 승리 조건

| 메트릭 | 요구치 | 가중치 | 설명 |
|--------|--------|--------|------|
| users | >= 100,000 | 핵심 | 대규모 유저 기반 필수 |
| cash | >= 300,000,000 | 핵심 | IPO 준비 자금 |
| trust | >= 80 | 핵심 | 시장 신뢰 확보 |
| infrastructure | 'EKS' + 'Aurora Global DB' 포함 | 필수 | 글로벌 스케일 인프라 |

### 필수 인프라 선택

```
필수 구성:
- EKS (Kubernetes 기반 컨테이너 오케스트레이션)
- Aurora Global DB (글로벌 데이터베이스 복제)

권장 구성:
- CloudFront (글로벌 CDN)
- Karpenter (자동 스케일링)
- Redis (캐싱 레이어)
```

### 핵심 전략 & 전환점

**초반 (턴 1-8): 빠른 유저 확보 + 투자 유치**
- 마케팅 투자로 유저 기반 확보
- 투자자 피칭 성공으로 자금 확보
- EC2 -> Aurora 전환 시점 판단이 핵심

**중반 (턴 9-16): 스케일업 + 위기 관리**
- 턴 8 대규모 장애 대응이 분기점
- 시리즈 A/B 투자 유치 성공 필수
- EKS + Karpenter 전환으로 확장성 확보

**후반 (턴 17-25): IPO 준비 + 글로벌 확장**
- 턴 17 보안 사고 대응
- Aurora Global DB로 글로벌 인프라 완성
- 시리즈 C + IPO 준비 조직 구성

### 내러티브 아크

```
[기승전결]

기: "작은 방에서 시작한 스타트업"
   - 1인 CTO, EC2 단일 서버, 자금 1,000만 원

승: "투자를 받으며 성장하는 팀"
   - 시리즈 A-B-C 투자 유치
   - 팀 확장, 인프라 고도화

전: "대규모 장애와 보안 사고를 극복"
   - 턴 8 장애, 턴 17 보안 사고
   - 경쟁사(대기업) 진입 위기

결: "나스닥 상장의 종소리"
```

### 엔딩 텍스트 (한국어)

```
🏆 유니콘 IPO 성공!

2025년 10월, 나스닥 상장의 종소리가 울립니다.

당신의 스타트업은 연 매출 1,000억 원을 돌파하며
시가총액 1조 원을 달성했습니다.

"EC2 하나로 시작한 서비스가 Aurora Global DB와
EKS 클러스터로 전 세계 100만 사용자에게
서비스를 제공하고 있습니다."

Forbes가 선정한 '아시아 30세 이하 30인'에
당신의 이름이 올랐습니다.

당신은 기술의 힘으로 세상을 바꿨습니다.
```

### 학습하는 AWS 패턴

| 패턴 | 설명 | 관련 턴 |
|------|------|---------|
| 수평 확장 (Horizontal Scaling) | EC2 AutoScaling + ALB | 턴 4-5 |
| 컨테이너 오케스트레이션 | EKS + Karpenter | 턴 5-7 |
| 글로벌 데이터베이스 | Aurora Global DB | 턴 6, 14 |
| CDN 배포 | CloudFront + S3 | 턴 4, 19 |
| 재해 복구 (DR) | Multi-Region, Route53 Failover | 턴 16, 888 |
| 비용 최적화 | Reserved Instance, Savings Plans | 턴 15-20 |

---

## 경로 2: 니치 마켓 강자 (Niche Market Dominator)

### 개요

```
코드명: WON_NICHE_DOMINATOR
난이도: ★★★☆☆ (중)
한 줄 요약: "작지만 확실한 시장에서 압도적 1위, 안정적 수익으로 자립"
현실 모델: 리멤버, 클래스101, 마이리얼트립
```

### 승리 조건

| 메트릭 | 요구치 | 가중치 | 설명 |
|--------|--------|--------|------|
| users | >= 30,000 | 보조 | 유저 수보다 유저 가치 중시 |
| cash | >= 500,000,000 | 핵심 | 높은 수익성 (자금 5억 이상) |
| trust | >= 90 | 핵심 | 니치 시장에서의 절대적 신뢰 |
| infrastructure | 'Aurora' 포함 | 필수 | 안정적이고 비용 효율적인 DB |
| infrastructure | 'EKS' 미포함 | 조건 | EKS 없이 달성해야 함 |
| 투자 라운드 | <= 1 | 조건 | 시리즈 A까지만 (외부 자본 최소화) |

### 필수 인프라 선택

```
필수 구성:
- Aurora (관리형 데이터베이스)
- Redis (캐싱으로 비용 효율 극대화)

권장 구성:
- CloudFront (정적 콘텐츠 비용 절감)
- Lambda (서버리스로 운영비 최소화)
- S3 (저렴한 스토리지)

금지 구성:
- EKS (과도한 인프라 = 니치 마켓 철학 위반)
- Aurora Global DB (글로벌 확장 불필요)
```

### 핵심 전략 & 전환점

**초반 (턴 1-8): 제품-시장 적합성 확보**
- 유저 확보보다 수익화 모델 우선
- 턴 2의 SI 컨설팅 프로젝트로 초기 자금 확보
- 턴 3의 유료 플랜 도입이 핵심 전환점

**중반 (턴 9-16): 수익성 극대화**
- B2B SaaS 전환 (턴 16)이 핵심 분기점
- 프리미엄 티어로 ARPU 극대화
- 비용 효율적 인프라 운영 (Lambda + Aurora)

**후반 (턴 17-25): 시장 지배력 + 자립 경영**
- 투자자 의존도 제거
- 흑자 전환 달성 및 유지
- 특허 포트폴리오로 경쟁 방어벽 구축

### 내러티브 아크

```
[기승전결]

기: "작은 시장, 깊은 이해"
   - 특정 산업/도메인에 특화된 서비스 시작

승: "돈을 버는 스타트업"
   - 초기부터 수익 발생
   - 고객 한 명 한 명을 소중히

전: "대기업이 진입했지만, 우리는 다르다"
   - 턴 13 대기업 진입 → 틈새 시장 집중 선택
   - 깊은 도메인 전문성으로 차별화

결: "조용하지만 확실한 성공"
```

### 엔딩 텍스트 (한국어)

```
🎯 니치 마켓의 절대 강자!

화려한 상장 대신, 당신은 더 가치있는 것을 선택했습니다.

월 순이익 5,000만 원.
30,000명의 유저가 "이 서비스 없으면 일을 못 해요"라고 말합니다.
고객 이탈율 2%. 업계 평균의 1/10입니다.

"Aurora Serverless v2와 Lambda로 구성된
당신의 인프라는 월 운영비 200만 원으로
99.95%의 가용성을 유지하고 있습니다."

네이버가 유사 서비스를 출시했지만 1년 만에 철수했습니다.
이유? "그 회사만큼 깊이 이해하는 건 불가능하더라고요."

대기업이 만들 수 없는 것을 만들었습니다.
당신은 진짜 '프로덕트-마켓 핏'이 뭔지 증명했습니다.
```

### 학습하는 AWS 패턴

| 패턴 | 설명 | 관련 턴 |
|------|------|---------|
| 서버리스 아키텍처 | Lambda + API Gateway | 턴 6, 11 |
| 관리형 데이터베이스 | Aurora Serverless v2 | 턴 3 |
| 캐싱 전략 | ElastiCache Redis | 턴 4 |
| 비용 최적화 | Reserved Instance, Savings Plans | 턴 10, 15 |
| 정적 콘텐츠 배포 | S3 + CloudFront | 턴 4 |
| 서버리스 모니터링 | CloudWatch + X-Ray | 턴 2, 11 |

---

## 경로 3: 기술 인수합병 (Tech Acquisition)

### 개요

```
코드명: WON_ACQUIRED
난이도: ★★★☆☆ (중)
한 줄 요약: "독보적 기술력을 인정받아 대기업에 전략적 인수합병"
현실 모델: 딥마인드(구글), 인스타그램(메타), 카카오모빌리티
```

### 승리 조건

| 메트릭 | 요구치 | 가중치 | 설명 |
|--------|--------|--------|------|
| users | >= 50,000 | 보조 | 기술 가치가 핵심이므로 유저 기준 완화 |
| cash | >= 0 (파산만 아니면) | 최소 | 현금보다 기술력이 인수 이유 |
| trust | >= 70 | 핵심 | 기술 신뢰도가 인수 판단 기준 |
| infrastructure | 'Bedrock' + 'SageMaker' 포함 | 필수 | AI/ML 기술 스택 보유 증명 |
| infrastructure | 총 7개 이상 | 조건 | 기술 스택 다양성 |

### 필수 인프라 선택

```
필수 구성:
- Bedrock (LLM/생성형 AI)
- SageMaker (ML 모델 훈련/배포)

권장 구성:
- Lambda (AI 처리 파이프라인)
- EKS (ML 워크로드 오케스트레이션)
- RDS/Aurora (데이터 레이크 기반)
- S3 (학습 데이터 저장)
- CloudWatch (모델 모니터링)

핵심 차별점:
- AI/ML 인프라의 깊이가 인수 가치를 결정
```

### 핵심 전략 & 전환점

**초반 (턴 1-8): 기술 기반 확보**
- 턴 1에서 기능 개발 우선 (유저 확보 후순위)
- 턴 6의 AI 기능 추가 (Bedrock 통합)가 핵심 전환점
- 장애 발생 시 기술적 근본 해결 선택

**중반 (턴 9-16): AI/ML 차별화**
- 턴 10의 AI 네이티브 서비스 전환이 분기점
- 턴 11의 SageMaker 도입
- 턴 13 대기업 진입 시 '차별화 기술 개발' 선택 필수

**후반 (턴 17-25): 인수 제안 유도**
- 특허 포트폴리오 구축 (턴 21)
- 기술 우위 IR 전략 (턴 22)
- 최종 턴에서 '기술 혁신 발표' 선택

### 인수합병 트리거 메커니즘

```
턴 20 이후, 매 턴 인수 제안 확률 계산:

인수_확률 = 기본값(0%)
  + Bedrock 보유 시 +20%
  + SageMaker 보유 시 +20%
  + trust >= 70 시 +15%
  + 인프라 7개 이상 시 +15%
  + 특허(턴 21 선택 166) 시 +20%
  + 대기업 파트너십(턴 13 선택 127) 시 +10%

인수_확률 >= 70% 시 인수 제안 이벤트 발생
플레이어가 수락/거절 선택 가능
```

### 내러티브 아크

```
[기승전결]

기: "기술에 미친 CTO"
   - 유저보다 기술, 매출보다 혁신
   - 초기부터 AI/ML 연구에 투자

승: "업계가 주목하는 기술력"
   - Bedrock + SageMaker로 독보적 AI 서비스
   - 학회 발표, 기술 블로그, 오픈소스 기여

전: "대기업의 러브콜"
   - 턴 13 경쟁 진입 → 오히려 기술 인수 관심 증가
   - "경쟁할 수 없다면, 사자"

결: "전략적 인수합병 성사"
```

### 엔딩 텍스트 (한국어)

```
🤝 전략적 인수합병 성사!

"당신의 AI 기술은 우리가 3년을 투자해도
만들 수 없는 것입니다."

빅테크 기업의 CEO가 직접 전화를 걸어왔습니다.
인수가: 2,000억 원.

"Amazon Bedrock과 SageMaker를 활용한
당신의 추천 엔진은 업계 최고 성능을 기록했고,
7개의 핵심 특허가 기술 방어벽을 형성하고 있습니다."

당신의 팀 50명 전원이 인수 기업으로 합류합니다.
당신은 글로벌 AI 연구소의 VP of Engineering으로 취임합니다.

"기술이 곧 가치다"를 증명한 여정이었습니다.
이제 더 큰 무대에서 세상을 바꿀 차례입니다.
```

### 학습하는 AWS 패턴

| 패턴 | 설명 | 관련 턴 |
|------|------|---------|
| 생성형 AI (Gen AI) | Amazon Bedrock (Claude, Titan) | 턴 6, 13 |
| ML 파이프라인 | SageMaker 훈련/배포/모니터링 | 턴 11, 13 |
| 서버리스 AI 처리 | Lambda + Bedrock 통합 | 턴 6 |
| 데이터 레이크 | S3 + Athena/Glue | 턴 11 |
| ML 워크로드 관리 | EKS + GPU 인스턴스 | 턴 10, 13 |
| AI 모델 모니터링 | CloudWatch + SageMaker Monitor | 턴 11, 19 |

---

## 경로 4: 부트스트랩 수익화 (Bootstrap Profitability)

### 개요

```
코드명: WON_BOOTSTRAP
난이도: ★★☆☆☆ (하)
한 줄 요약: "외부 투자 없이 자력으로 흑자 달성, 완전한 자유를 얻다"
현실 모델: 뱅크샐러드(초기), 37signals(Basecamp), Mailchimp
```

### 승리 조건

| 메트릭 | 요구치 | 가중치 | 설명 |
|--------|--------|--------|------|
| users | >= 10,000 | 최소 | 소규모여도 충분 |
| cash | >= 200,000,000 | 핵심 | 2억 원 이상 순자산 (외부 투자 없이) |
| trust | >= 60 | 보조 | 기본적 서비스 안정성 |
| infrastructure | 'Lambda' 포함 | 필수 | 서버리스 = 비용 효율 |
| 투자 라운드 | == 0 | 핵심 조건 | 외부 투자 0회 (완전 자립) |
| equityPercentage | == 100 | 핵심 조건 | 지분 100% 유지 |

### 필수 인프라 선택

```
필수 구성:
- Lambda (서버리스 컴퓨팅 - 사용한 만큼만 과금)

권장 구성:
- S3 (저렴한 스토리지)
- CloudFront (캐싱으로 비용 절감)
- RDS (최소 사양 관리형 DB)

금지/회피 구성:
- EKS (비용 과다 - 부트스트랩 철학 위반)
- Aurora Global DB (글로벌 확장 불필요)
- Karpenter (오버 엔지니어링)
- SageMaker (비용 과다)
```

### 핵심 전략 & 전환점

**초반 (턴 1-8): 즉시 수익화**
- 턴 1에서 소규모 마케팅으로 시작
- 턴 2의 소규모 구독 서비스 또는 SI 컨설팅이 핵심
- 턴 3의 유료 플랜 도입 필수
- **투자자 피칭을 절대 하지 않는 것이 핵심**

**중반 (턴 9-16): 비용 효율 극대화**
- 턴 10의 자립 성장 (수익화 집중) 선택
- 턴 16의 프리미엄 티어 또는 B2B SaaS 전환
- Lambda + S3로 인프라 비용 월 50만 원 이하 유지

**후반 (턴 17-25): 흑자 안정화**
- 투자 유치 선택지를 모두 스킵
- 비용 절감에 집중
- 마지막 턴에서 수익성 강조

### 부트스트랩 특수 메커니즘

```
투자 유치 거부 보너스:
- 턴 12 (시리즈 A) 스킵 시: trust +5
- 턴 18 (시리즈 B) 스킵 시: trust +5
- 턴 23 (시리즈 C) 스킵 시: trust +5
- 전체 투자 0회 달성 시: "자립 경영" 업적 달성

비용 효율 보너스:
- Lambda 사용 시: 인프라 비용 -50%
- EKS 미사용 시: 월 운영비 -200만 원
- 최소 인프라로 운영 시: trust +2/턴
```

### 내러티브 아크

```
[기승전결]

기: "내 돈으로, 내 방식으로"
   - 투자자 없이 시작
   - 매출이 곧 런웨이

승: "조금씩, 확실하게 성장"
   - 한 명의 유료 고객이 가장 큰 기쁨
   - 적자 없는 성장

전: "투자 받으라는 유혹을 거부"
   - "투자 안 받으면 성장 못 한다"는 편견과 싸움
   - 대기업 진입에도 흔들리지 않는 자기 확신

결: "완전한 자유를 가진 기업가"
```

### 엔딩 텍스트 (한국어)

```
🌱 부트스트랩 성공! 완전한 자유!

VC들이 비웃었습니다.
"투자 안 받고 뭘 할 수 있겠어?"

3년 후, 당신의 답은 이것입니다:
- 월 순이익: 3,000만 원
- 지분: 100% (당신만의 것)
- 부채: 0원
- 상사: 없음

"AWS Lambda와 S3만으로 구성된 인프라는
월 운영비 80만 원으로 10,000명의 유저에게
99.9%의 가용성을 제공하고 있습니다."

투자자 이사회도, 분기 실적 압박도 없습니다.
수요일에 쉬고 싶으면 쉽니다.
새로운 기능을 만들고 싶으면 만듭니다.

Basecamp의 DHH가 트위터에 당신을 언급했습니다:
"이것이 진짜 기업가 정신이다."

당신은 자유를 선택했고, 자유를 얻었습니다.
```

### 학습하는 AWS 패턴

| 패턴 | 설명 | 관련 턴 |
|------|------|---------|
| 서버리스 우선 (Serverless-first) | Lambda + API Gateway | 턴 6, 11 |
| 비용 최적화 전략 | Savings Plans, Spot Instance | 전 구간 |
| 최소 아키텍처 (Minimal Architecture) | 필요한 서비스만 최소로 사용 | 전 구간 |
| 정적 호스팅 | S3 + CloudFront | 턴 4 |
| Pay-as-you-go 최적화 | Lambda 과금 모델 이해 | 턴 6 |
| Well-Architected: 비용 최적화 축 | 비용 효율적 아키텍처 설계 | 전 구간 |

---

## 경로 5: AI 혁신 리더 (AI Innovation Leader)

### 개요

```
코드명: WON_AI_LEADER
난이도: ★★★★★ (최상)
한 줄 요약: "AI 기술로 산업 자체를 재정의하는 혁신 기업"
현실 모델: OpenAI, Anthropic, 업스테이지, 뤼튼
```

### 승리 조건

| 메트릭 | 요구치 | 가중치 | 설명 |
|--------|--------|--------|------|
| users | >= 200,000 | 핵심 | AI 서비스의 대규모 사용자 |
| cash | >= 100,000,000 | 보조 | 1억 원 이상 (AI R&D 비용이 크므로 완화) |
| trust | >= 85 | 핵심 | AI 안전성/신뢰성 입증 |
| infrastructure | 'Bedrock' + 'SageMaker' + 'EKS' 포함 | 필수 | 완전한 AI 인프라 스택 |
| infrastructure | 'Lambda' 포함 | 필수 | AI 처리 파이프라인 |
| infrastructure | 총 8개 이상 | 조건 | 복합 AI 인프라 |

### 필수 인프라 선택

```
필수 구성:
- Bedrock (생성형 AI - Claude, Titan 등)
- SageMaker (ML 모델 훈련/배포/모니터링)
- EKS (GPU 워크로드 오케스트레이션)
- Lambda (AI 추론 파이프라인)

권장 구성:
- Aurora (벡터 DB / 학습 데이터 관리)
- S3 (대규모 학습 데이터셋 저장)
- CloudFront (AI API 글로벌 배포)
- Redis (추론 결과 캐싱)
- CloudWatch (모델 성능 모니터링)

핵심 차별점:
- Bedrock + SageMaker 동시 보유가 필수
- AI 인프라의 깊이와 폭이 모두 필요
```

### 핵심 전략 & 전환점

**초반 (턴 1-8): AI 기술 기반 확보**
- 턴 6에서 Bedrock 통합이 최초 전환점 (반드시 선택)
- 초기 자금을 AI R&D에 과감히 투자
- 유저 확보는 AI 기능의 바이럴로 자연 성장 기대

**중반 (턴 9-16): AI 네이티브 전환**
- 턴 10에서 AI 네이티브 서비스 전환 필수
- 턴 11에서 SageMaker 도입 필수
- 턴 13에서 차별화 기술 개발 (AI) 선택 필수

**후반 (턴 17-25): AI 산업 리더십 확보**
- EKS로 GPU 워크로드 관리
- 턴 25에서 '기술 혁신 발표' 선택
- AI 안전성 신뢰 확보가 최종 관건

### AI 리더 특수 메커니즘

```
AI 시너지 보너스:
- Bedrock + SageMaker 동시 보유: users +20%/턴
- Bedrock + Lambda 조합: 인프라 효율 +30%
- SageMaker + EKS 조합: AI 처리 성능 2배

AI 안전성 체크:
- 턴 20 이후 AI 안전성 감사 이벤트 발생
- trust >= 85 필수 (AI 윤리/안전 기준)
- 실패 시 규제 리스크로 trust -20

AI 모델 성능 지표:
- 매 턴 AI 인프라 조합에 따라 "모델 성능 점수" 계산
- 성능 점수가 승리 조건의 숨겨진 요소
```

### 내러티브 아크

```
[기승전결]

기: "AI가 세상을 바꿀 수 있다는 믿음"
   - 다른 스타트업과는 다른 출발점
   - "우리는 AI 기업이다"

승: "첫 번째 AI 모델이 세상에 공개되다"
   - Bedrock으로 프로토타입 → SageMaker로 커스텀 모델
   - "이런 건 처음 본다"는 반응

전: "AI 윤리와 안전성의 벽"
   - 할루시네이션, 편향, 프라이버시 이슈
   - 규제 당국의 주목
   - "기술이 아무리 좋아도 신뢰가 없으면 끝"

결: "AI 시대의 리더가 되다"
```

### 엔딩 텍스트 (한국어)

```
🧠 AI 혁신 리더 달성!

"2025년을 정의하는 AI 기업 10"
당신의 회사가 1위에 올랐습니다.

200,000명의 사용자가 매일 당신의 AI 서비스를 사용합니다.
그 중 30%는 "이 AI 없이는 업무가 불가능하다"고 말합니다.

"Amazon Bedrock 기반의 생성형 AI 엔진과
SageMaker로 훈련된 커스텀 추천 모델이
EKS 클러스터 위에서 하루 1,000만 건의
추론 요청을 처리하고 있습니다.

Lambda로 구성된 AI 파이프라인은
평균 응답 시간 200ms를 유지하며,
모델 정확도는 업계 최고인 97.3%를 기록했습니다."

Google, Microsoft, Amazon이 당신의 기술을 벤치마크합니다.
하지만 당신은 독립을 선택했습니다.

"AI의 미래를 만드는 것은 대기업이 아니라
가장 빠르게 혁신하는 팀이다."

당신이 그 팀을 만들었습니다.
```

### 학습하는 AWS 패턴

| 패턴 | 설명 | 관련 턴 |
|------|------|---------|
| 생성형 AI 서비스 | Amazon Bedrock (Claude, Titan, Stable Diffusion) | 턴 6, 13 |
| ML 모델 생명주기 | SageMaker 훈련 -> 배포 -> 모니터링 | 턴 11, 13 |
| GPU 워크로드 관리 | EKS + GPU 인스턴스 (p4d, g5) | 턴 10 |
| AI 추론 파이프라인 | Lambda + Step Functions + Bedrock | 턴 6 |
| 벡터 데이터베이스 | Aurora pgvector / OpenSearch | 턴 10 |
| AI 모델 모니터링 | SageMaker Model Monitor + CloudWatch | 턴 19 |
| 데이터 레이크 | S3 + Glue + Athena | 턴 11 |
| AI 안전성 | Bedrock Guardrails + 모델 평가 | 턴 20+ |

---

## 3. 시스템 설계

### 3.1 GameStatus 열거형 확장

```typescript
export enum GameStatus {
  PLAYING = 'PLAYING',

  // 승리 상태 (5개 경로)
  WON_IPO_UNICORN = 'WON_IPO_UNICORN',         // 유니콘 IPO
  WON_NICHE_DOMINATOR = 'WON_NICHE_DOMINATOR',   // 니치 마켓 강자
  WON_ACQUIRED = 'WON_ACQUIRED',                 // 기술 인수합병
  WON_BOOTSTRAP = 'WON_BOOTSTRAP',               // 부트스트랩 수익화
  WON_AI_LEADER = 'WON_AI_LEADER',               // AI 혁신 리더

  // 하위 호환: 기존 WON_IPO는 WON_IPO_UNICORN으로 매핑
  WON_IPO = 'WON_IPO',

  // 패배 상태 (기존 유지)
  LOST_BANKRUPT = 'LOST_BANKRUPT',
  LOST_OUTAGE = 'LOST_OUTAGE',
  LOST_FAILED_IPO = 'LOST_FAILED_IPO',
  LOST_EQUITY = 'LOST_EQUITY',
  LOST_FIRED_CTO = 'LOST_FIRED_CTO',
}
```

### 3.2 승리 조건 상수 확장

```typescript
export const VICTORY_PATHS = {
  UNICORN_IPO: {
    code: 'WON_IPO_UNICORN',
    name: '유니콘 IPO',
    icon: '🏆',
    conditions: {
      minUsers: 100_000,
      minCash: 300_000_000,
      minTrust: 80,
      requiredInfra: ['EKS', 'Aurora Global DB'],
      maxInvestmentRounds: Infinity,
      requiredEquity: 0,       // 제한 없음
    },
    difficulty: 4,
    description: '글로벌 시장을 지배하는 유니콘 기업으로 나스닥 상장',
  },

  NICHE_DOMINATOR: {
    code: 'WON_NICHE_DOMINATOR',
    name: '니치 마켓 강자',
    icon: '🎯',
    conditions: {
      minUsers: 30_000,
      minCash: 500_000_000,
      minTrust: 90,
      requiredInfra: ['Aurora'],
      excludedInfra: ['EKS'],      // EKS 없이 달성
      maxInvestmentRounds: 1,       // 시리즈 A까지만
      requiredEquity: 0,
    },
    difficulty: 3,
    description: '작지만 확실한 시장에서 압도적 1위, 안정적 수익으로 자립',
  },

  TECH_ACQUISITION: {
    code: 'WON_ACQUIRED',
    name: '기술 인수합병',
    icon: '🤝',
    conditions: {
      minUsers: 50_000,
      minCash: 0,                   // 파산만 아니면 됨
      minTrust: 70,
      requiredInfra: ['Bedrock', 'SageMaker'],
      minInfraCount: 7,             // 인프라 7종 이상
      maxInvestmentRounds: Infinity,
      requiredEquity: 0,
    },
    difficulty: 3,
    description: '독보적 기술력을 인정받아 대기업에 전략적 인수합병',
  },

  BOOTSTRAP: {
    code: 'WON_BOOTSTRAP',
    name: '부트스트랩 수익화',
    icon: '🌱',
    conditions: {
      minUsers: 10_000,
      minCash: 200_000_000,
      minTrust: 60,
      requiredInfra: ['Lambda'],
      maxInvestmentRounds: 0,       // 투자 0회
      requiredEquity: 100,          // 지분 100%
    },
    difficulty: 2,
    description: '외부 투자 없이 자력으로 흑자 달성, 완전한 자유를 얻다',
  },

  AI_LEADER: {
    code: 'WON_AI_LEADER',
    name: 'AI 혁신 리더',
    icon: '🧠',
    conditions: {
      minUsers: 200_000,
      minCash: 100_000_000,
      minTrust: 85,
      requiredInfra: ['Bedrock', 'SageMaker', 'EKS', 'Lambda'],
      minInfraCount: 8,             // 인프라 8종 이상
      maxInvestmentRounds: Infinity,
      requiredEquity: 0,
    },
    difficulty: 5,
    description: 'AI 기술로 산업 자체를 재정의하는 혁신 기업',
  },
} as const;
```

### 3.3 승리 판정 로직

```typescript
/**
 * 모든 승리 경로를 체크하고, 달성한 경로 목록을 반환한다.
 * 복수 경로 동시 달성 가능 → 가장 높은 난이도 경로를 우선 적용
 */
private checkVictoryPaths(game: Game): GameStatus | null {
  const achievedPaths: Array<{
    code: GameStatus;
    difficulty: number;
  }> = [];

  for (const [key, path] of Object.entries(VICTORY_PATHS)) {
    const { conditions } = path;

    // 기본 메트릭 체크
    if (game.users < conditions.minUsers) continue;
    if (game.cash < conditions.minCash) continue;
    if (game.trust < conditions.minTrust) continue;

    // 필수 인프라 체크
    if (conditions.requiredInfra) {
      const hasAll = conditions.requiredInfra.every(
        infra => game.infrastructure.includes(infra)
      );
      if (!hasAll) continue;
    }

    // 제외 인프라 체크
    if (conditions.excludedInfra) {
      const hasExcluded = conditions.excludedInfra.some(
        infra => game.infrastructure.includes(infra)
      );
      if (hasExcluded) continue;
    }

    // 최소 인프라 수 체크
    if (conditions.minInfraCount) {
      if (game.infrastructure.length < conditions.minInfraCount) continue;
    }

    // 투자 라운드 제한 체크
    if (conditions.maxInvestmentRounds !== undefined) {
      if (game.investmentRounds > conditions.maxInvestmentRounds) continue;
    }

    // 지분율 요구 체크
    if (conditions.requiredEquity) {
      if (game.equityPercentage < conditions.requiredEquity) continue;
    }

    achievedPaths.push({
      code: path.code as GameStatus,
      difficulty: path.difficulty,
    });
  }

  if (achievedPaths.length === 0) return null;

  // 가장 높은 난이도 경로 반환
  achievedPaths.sort((a, b) => b.difficulty - a.difficulty);
  return achievedPaths[0].code;
}
```

### 3.4 턴 25 종료 로직 변경

```typescript
// 기존: IPO 조건만 체크
// 변경: 모든 승리 경로 체크 후, 미달성 시 패배

if (previousTurn === GAME_CONSTANTS.MAX_TURNS
    && game.status === GameStatus.PLAYING) {

  const victoryPath = this.checkVictoryPaths(game);

  if (victoryPath) {
    game.status = victoryPath;
    game.victoryPath = victoryPath; // 새 필드: 달성 경로 기록
    this.logger.debug(`승리! 경로: ${victoryPath}`);
  } else {
    // 아무 승리 조건도 만족하지 못한 경우
    game.status = GameStatus.LOST_FIRED_CTO;
    this.logger.debug('Turn 25 완료 - 모든 승리 조건 미충족, CTO 해고');
  }
}
```

### 3.5 리더보드 점수 시스템 개선

```typescript
calculateScore(gameState: GameResponseDto): number {
  const baseScore = gameState.users
    + Math.floor(gameState.cash / 10000)
    + (gameState.trust * 1000);

  // 승리 경로별 보너스 점수
  const pathBonus = {
    'WON_AI_LEADER':       50_000,  // 최고 난이도
    'WON_IPO_UNICORN':     40_000,
    'WON_NICHE_DOMINATOR': 30_000,
    'WON_ACQUIRED':        30_000,
    'WON_BOOTSTRAP':       20_000,
  };

  const bonus = pathBonus[gameState.status] || 0;

  return baseScore + bonus;
}
```

---

## 4. 경로별 비교 매트릭스

### 4.1 승리 조건 비교

| 조건 | 유니콘 IPO | 니치 마켓 | 기술 인수 | 부트스트랩 | AI 리더 |
|------|-----------|----------|----------|-----------|---------|
| 최소 유저 | 100,000 | 30,000 | 50,000 | 10,000 | 200,000 |
| 최소 자금 | 3억 | 5억 | 0 (파산 제외) | 2억 | 1억 |
| 최소 신뢰 | 80 | 90 | 70 | 60 | 85 |
| 필수 인프라 | EKS, Aurora Global | Aurora | Bedrock, SageMaker | Lambda | Bedrock, SageMaker, EKS, Lambda |
| 인프라 제약 | - | EKS 제외 | 7종 이상 | - | 8종 이상 |
| 투자 제한 | 무제한 | 1회 이하 | 무제한 | 0회 | 무제한 |
| 지분 요구 | - | - | - | 100% | - |

### 4.2 난이도 & 전략 비교

| 항목 | 유니콘 IPO | 니치 마켓 | 기술 인수 | 부트스트랩 | AI 리더 |
|------|-----------|----------|----------|-----------|---------|
| 난이도 | ★★★★ | ★★★ | ★★★ | ★★ | ★★★★★ |
| 핵심 전략 | 규모 확장 | 수익 집중 | 기술 투자 | 비용 절감 | AI 올인 |
| 초반 핵심 | 유저 확보 | 수익 모델 | R&D 투자 | 즉시 수익화 | AI 기반 |
| 중반 핵심 | 투자 유치 | ARPU 극대화 | AI 차별화 | 비용 효율 | 모델 훈련 |
| 후반 핵심 | IPO 준비 | 시장 지배 | 인수 유도 | 흑자 유지 | AI 안전성 |
| 위험 요소 | 장애/보안 | 성장 정체 | 현금 부족 | 투자 유혹 | AI 규제 |

### 4.3 AWS 학습 패턴 비교

| AWS 패턴 | 유니콘 | 니치 | 인수 | 부트스트랩 | AI |
|----------|-------|------|------|-----------|-----|
| 수평 확장 | 핵심 | - | - | - | 보조 |
| 서버리스 | 보조 | 핵심 | 보조 | 핵심 | 보조 |
| 컨테이너 | 핵심 | - | 보조 | - | 핵심 |
| 글로벌 DB | 핵심 | - | - | - | 보조 |
| AI/ML | - | - | 핵심 | - | 핵심 |
| 비용 최적화 | 보조 | 핵심 | - | 핵심 | - |
| DR/고가용성 | 핵심 | 보조 | - | - | 보조 |
| 보안/컴플라이언스 | 보조 | 보조 | 보조 | - | 핵심 |

---

## 5. 프론트엔드 표시 사항

### 5.1 승리 경로 힌트 UI

게임 진행 중 현재 달성 가능한 승리 경로를 실시간으로 표시:

```
[승리 경로 진행률]

🏆 유니콘 IPO      ████████░░ 80%  (인프라 부족)
🎯 니치 마켓 강자   ██████░░░░ 60%  (자금 부족)
🤝 기술 인수합병    ████░░░░░░ 40%  (Bedrock 필요)
🌱 부트스트랩       ██░░░░░░░░ 20%  (투자 이력 있음 - 불가)
🧠 AI 혁신 리더     ███░░░░░░░ 30%  (SageMaker 필요)
```

### 5.2 엔딩 화면

승리 시 해당 경로의 엔딩 텍스트 + 학습한 AWS 패턴 요약 + 다른 경로 도전 유도:

```
[엔딩 화면 구성]

1. 경로별 고유 엔딩 텍스트 (위에 작성된 내용)
2. "이번 게임에서 배운 AWS 패턴" 카드 목록
3. "아직 도전하지 않은 경로" 표시
4. "다시 도전하기" 버튼 (다른 경로 추천)
```

### 5.3 경로 선택 가이드 (게임 시작 시)

```
[시작 화면]

어떤 CTO가 되고 싶으신가요?

🏆 유니콘 도전     "세상을 바꾸겠다!" (★★★★)
🎯 시장 지배자     "작지만 확실하게" (★★★)
🤝 기술 천재       "기술이 곧 가치다" (★★★)
🌱 자유로운 기업가  "내 방식대로" (★★)
🧠 AI 혁신가       "AI로 미래를 만든다" (★★★★★)

※ 경로 선택은 참고용입니다. 게임 중 전략을 자유롭게 변경할 수 있습니다.
```

---

## 6. 구현 우선순위

### Phase 1: 핵심 시스템 (필수)

1. `GameStatus` 열거형 확장 (5개 승리 상태 추가)
2. `VICTORY_PATHS` 상수 정의 (`game-constants.ts`)
3. `checkVictoryPaths()` 판정 로직 구현
4. 턴 25 종료 로직 수정 (다중 경로 체크)
5. Game 엔티티에 `victoryPath` 필드 추가
6. 기존 `WON_IPO` 하위 호환 처리

### Phase 2: 프론트엔드 (중요)

7. 엔딩 화면 5종 디자인 및 구현
8. 승리 경로 진행률 표시 UI
9. 시작 화면 경로 가이드

### Phase 3: 밸런싱 & 폴리시 (권장)

10. 각 경로별 밸런스 테스트 (실제 플레이 시뮬레이션)
11. 경로별 특수 이벤트 추가 (인수 제안 이벤트 등)
12. 리더보드 경로별 분류
13. 업적/도전 과제 시스템

### Phase 4: 콘텐츠 확장 (선택)

14. 경로별 특수 선택지 추가 (`game_choices_db.json`)
15. 경로 분기 내러티브 이벤트 추가
16. AWS 패턴 학습 카드 시스템
17. 경로 조합 히든 엔딩

---

## 7. 밸런스 시뮬레이션

### 7.1 각 경로의 이론적 달성 가능성

현재 `game_choices_db.json`의 253개 선택지 기반으로 각 경로의 달성 가능성을 분석한다.

#### 유니콘 IPO (기존 경로와 유사)

```
최적 경로 예시:
턴 1: 소규모 마케팅 (users +100)
턴 2: 투자자 피칭 (cash +2,000만)
턴 3: Aurora 전환 (인프라 강화)
턴 4: AutoScaling + ALB (확장성)
턴 5: EKS 전환 (컨테이너화)
턴 6: DevOps 플랫폼 (EKS 확보)
턴 7: 공격적 마케팅 (users +50,000)
...
턴 19: 기술 안정성 (Aurora Global DB + EKS)
...

예상 최종 상태:
- users: ~150,000+ (달성 가능)
- cash: ~3-5억 (투자 유치로 달성)
- trust: ~80-95 (관리 필요)
- infra: EKS + Aurora Global DB (달성 가능)
```

#### 니치 마켓 강자

```
최적 경로 예시:
턴 1: 기능 개발 (기반 강화)
턴 2: SI 컨설팅 프로젝트 (cash +300만)
턴 3: 유료 플랜 도입 (cash +10만/월)
턴 4: B2B SaaS 전환 (cash +30만/월)
턴 5: 수익화 모델 (cash +50만/월)
턴 6: 엔터프라이즈 플랜 (cash +30만/월)
...
턴 12: 수익성 중심 (cash +5,000만)
턴 16: 프리미엄 티어 (cash +3,000만)
...

예상 최종 상태:
- users: ~30,000-50,000 (충분)
- cash: ~5-8억 (수익 누적)
- trust: ~90+ (안정적 운영)
- infra: Aurora + Redis + Lambda (EKS 없음)

핵심 과제: 투자 유치를 1회 이하로 제한
```

#### 기술 인수합병

```
최적 경로 예시:
턴 1: 기능 개발 (기술 기반)
턴 2: 투자자 피칭 (자금 확보)
턴 3: Aurora 전환 (DB 안정화)
...
턴 6: AI 기능 추가 - Bedrock (핵심!)
...
턴 11: SageMaker 도입 (핵심!)
턴 13: 차별화 기술 개발 (Bedrock + SageMaker)
...
턴 21: 특허 포트폴리오 구축

예상 최종 상태:
- users: ~50,000-100,000 (충분)
- cash: 양수 (파산 제외)
- trust: ~70-80 (기술 신뢰)
- infra: Bedrock + SageMaker + 5종 이상 (7종 달성)
```

#### 부트스트랩 수익화

```
최적 경로 예시:
턴 1: 소규모 마케팅 (유저 시드)
턴 2: 구독 서비스 출시 (즉시 수익화)
턴 3: 유료 플랜 도입 (수익 강화)
턴 4: B2B SaaS 전환 (안정 수익)
...
턴 6: 엔터프라이즈 플랜 (수익 극대화)
...
턴 12: 투자 유치 -> 수익성 중심 선택 (투자 거부!)
...

핵심 과제:
- 투자 유치 선택지를 모두 회피해야 함
- 현재 선택지 구조에서 투자 없이 생존 가능한지 검증 필요
- Lambda 인프라 선택 기회: 턴 6(Bedrock+Lambda), 턴 11(Lambda+EC2)

예상 최종 상태:
- users: ~10,000-20,000 (충분)
- cash: ~2-3억 (수익 누적, 투자 없이)
- trust: ~60-70 (안정적)
- infra: Lambda + S3 + RDS (최소 구성)
- investmentRounds: 0, equity: 100%
```

#### AI 혁신 리더

```
최적 경로 예시:
턴 1: 소규모 마케팅 (유저 시드)
턴 2: 투자자 피칭 (자금 확보 필수)
...
턴 5: EKS 전환 (GPU 워크로드 준비)
턴 6: AI 기능 추가 - Bedrock + Lambda (핵심!)
턴 7: 공격적 마케팅 (users 확보)
...
턴 10: AI 네이티브 전환 - Bedrock + Lambda (핵심!)
턴 11: SageMaker + Bedrock + RDS (핵심! DevOps 자동화)
턴 13: 차별화 기술 개발 - Bedrock + SageMaker (핵심!)
...

핵심 과제:
- Bedrock, SageMaker, EKS, Lambda 4개 필수 인프라를 모두 확보
- 총 인프라 8종 이상 (EC2 기본 포함하면 다양한 선택 필요)
- users 200,000 달성 (AI 바이럴 효과 필요)
- trust 85 유지 (AI 안전성)

예상 최종 상태:
- users: ~200,000+ (공격적 성장 + AI 효과)
- cash: ~1-3억 (AI 투자비 과다)
- trust: ~85-90 (관리 필요)
- infra: Bedrock + SageMaker + EKS + Lambda + Aurora + S3 + Redis + CloudFront (8종)
```

---

## 8. 기존 데이터와의 호환성

### 8.1 game_choices_db.json 변경 불필요

현재 253개 선택지는 변경 없이 다중 승리 경로를 지원할 수 있다. 각 경로는 기존 선택지의 조합으로 달성 가능하도록 설계되었다.

### 8.2 기존 게임 저장 데이터 호환

`WON_IPO` 상태의 기존 게임 데이터는 `WON_IPO_UNICORN`으로 매핑한다.

### 8.3 턴 999 (기존 성공 엔딩) 처리

기존의 턴 999 이벤트 텍스트는 유니콘 IPO 경로의 엔딩으로 유지하되, 새로운 경로별 엔딩 턴 번호를 추가한다:

```
턴 999: WON_IPO_UNICORN 엔딩
턴 998: WON_NICHE_DOMINATOR 엔딩
턴 997: WON_ACQUIRED 엔딩
턴 996: WON_BOOTSTRAP 엔딩
턴 995: WON_AI_LEADER 엔딩
```

---

## 9. 요약

| 경로 | 코드명 | 핵심 가치 | 난이도 | AWS 핵심 학습 |
|------|--------|----------|--------|--------------|
| 유니콘 IPO | WON_IPO_UNICORN | 규모와 성장 | ★★★★ | 수평 확장, 글로벌 DB, DR |
| 니치 마켓 강자 | WON_NICHE_DOMINATOR | 수익성과 효율 | ★★★ | 서버리스, 비용 최적화 |
| 기술 인수합병 | WON_ACQUIRED | 기술 우위 | ★★★ | AI/ML, 데이터 파이프라인 |
| 부트스트랩 수익화 | WON_BOOTSTRAP | 자립과 자유 | ★★ | 최소 아키텍처, Serverless-first |
| AI 혁신 리더 | WON_AI_LEADER | AI 혁신 | ★★★★★ | 생성형 AI, ML 생명주기, GPU |

5가지 경로는 실제 스타트업 세계의 다양한 성공 유형을 반영하며, 각 경로를 통해 서로 다른 AWS 아키텍처 패턴을 학습할 수 있다. 플레이어는 한 번의 클리어로 끝나지 않고, 5가지 다른 전략으로 5번 이상 재도전할 동기를 갖게 된다.
