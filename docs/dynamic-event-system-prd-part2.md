# AWS 스타트업 타이쿤 - 동적 이벤트 시스템 PRD (Part 2)

## 4. 연쇄 이벤트 (Chain Events)

### 4.1 설계 원칙

- 2~4턴에 걸쳐 전개되는 내러티브 아크
- 첫 번째 이벤트의 선택이 후속 이벤트의 내용과 난이도를 결정
- 연쇄 이벤트 도중에도 기존 턴 선택지는 정상 제공
- 게임당 최대 2개의 연쇄 이벤트 활성화 가능

### 4.2 연쇄 이벤트 목록

#### 연쇄 C01: 경쟁사 인수전 (3턴 아크)

```yaml
chainId: "CHAIN_ACQUISITION_WAR"
name: "경쟁사 인수전"
totalSteps: 3
triggerCondition:
  minTurn: 8
  maxTurn: 18
  minUsers: 10000
  minCash: 20000000
  baseProbability: 0.06

# --- 1단계: 인수 기회 발생 ---
step1:
  eventId: "CHAIN_ACQ_01"
  title: "경쟁사 매물 등장"
  description: |
    같은 도메인의 경쟁 스타트업이 자금난으로 매각을 검토하고 있습니다.
    "경쟁사 A의 핵심 기술과 유저 베이스를 인수할 기회입니다.
    하지만 다른 바이어도 관심을 보이고 있어 빠른 결정이 필요합니다."
  responses:
    - responseId: "C01_S1_R1"
      text: |
        적극적 인수 추진: 기술 실사를 시작하고 인수 의향서(LOI)를 보냅니다.
      effects:
        users: 0
        cash: -5000000
        trust: 3
        infra: []
      triggersEvent: "CHAIN_ACQ_02_AGGRESSIVE"
      awsLesson: |
        [AWS 교훈] 인수 시 가장 큰 기술적 과제는 시스템 통합입니다.
        AWS Migration Hub로 마이그레이션을 체계적으로 관리하고,
        Application Discovery Service로 상대방 인프라를 먼저 파악하세요.

    - responseId: "C01_S1_R2"
      text: |
        신중한 접근: 기술 자산만 선별적으로 인수합니다.
        (acqui-hire 또는 기술 자산 인수)
      effects:
        users: 0
        cash: -2000000
        trust: 1
        infra: []
      triggersEvent: "CHAIN_ACQ_02_CAREFUL"
      awsLesson: |
        [AWS 교훈] 기술 자산 인수 시 데이터 마이그레이션이 핵심입니다.
        AWS DMS(Database Migration Service)와 AWS SCT(Schema Conversion Tool)로
        이기종 데이터베이스 간 마이그레이션을 자동화할 수 있습니다.

    - responseId: "C01_S1_R3"
      text: |
        인수 포기: 자체 성장에 집중합니다.
      effects:
        users: 0
        cash: 0
        trust: 0
        infra: []
      triggersEvent: null  # 연쇄 종료
      awsLesson: |
        [AWS 교훈] 인수 대신 자체 역량을 키우려면 AWS의 서비스를 적극 활용하세요.
        Amazon Bedrock으로 AI 기능을, Amplify로 빠른 프론트엔드 개발을 실현할 수 있습니다.

# --- 2단계A: 적극적 인수 경로 ---
step2_aggressive:
  eventId: "CHAIN_ACQ_02_AGGRESSIVE"
  title: "인수 실사 진행 중 - 예상치 못한 발견"
  description: |
    기술 실사 과정에서 경쟁사의 인프라가 예상보다 열악한 것이 확인되었습니다.
    "보안 취약점이 다수 발견되었고, 기술 부채가 심각합니다.
    하지만 유저 데이터와 도메인 전문성은 가치가 있습니다."
  responses:
    - responseId: "C01_S2A_R1"
      text: |
        인수 가격 재협상: 기술 부채를 근거로 가격을 낮추고 인수를 완료합니다.
        이후 인프라 통합에 상당한 투자가 필요합니다.
      effects:
        users: 8000
        cash: -30000000
        trust: 5
        infra: []
      triggersEvent: "CHAIN_ACQ_03_INTEGRATION"
      awsLesson: |
        [AWS 교훈] 인프라 통합 비용을 정확히 산정하려면
        AWS Migration Evaluator를 활용하세요.
        TCO(Total Cost of Ownership) 분석으로 실제 마이그레이션 비용을 예측할 수 있습니다.

    - responseId: "C01_S2A_R2"
      text: |
        인수 철회: 리스크가 너무 크다고 판단하여 인수를 포기합니다.
      effects:
        users: 0
        cash: -5000000
        trust: -3
        infra: []
      triggersEvent: null
      awsLesson: |
        [AWS 교훈] 기술 실사에서 발견된 보안 취약점은 인수 후 모두 내 책임이 됩니다.
        AWS Inspector로 취약점을 자동 스캔하고,
        Security Hub로 보안 상태를 중앙에서 관리하는 것이 필수입니다.

# --- 2단계B: 신중한 인수 경로 ---
step2_careful:
  eventId: "CHAIN_ACQ_02_CAREFUL"
  title: "기술 자산 인수 협상"
  description: |
    핵심 개발자 3명과 특허 기술의 인수 협상이 진행 중입니다.
    "기술팀은 합류 의사가 있지만, 기존 시스템과의 통합이 과제입니다."
  responses:
    - responseId: "C01_S2B_R1"
      text: |
        팀 통합 우선: 새 팀원의 빠른 온보딩을 위해
        개발 환경과 CI/CD를 표준화합니다.
      effects:
        users: 2000
        cash: -10000000
        trust: 5
        infra: []
      triggersEvent: "CHAIN_ACQ_03_TALENT"
      awsLesson: |
        [AWS 교훈] AWS Cloud9 또는 CodeCatalyst로 통합 개발 환경을 제공하면
        새 팀원의 온보딩 시간을 대폭 단축할 수 있습니다.
        표준화된 CI/CD(CodePipeline)는 팀 통합의 기술적 기반입니다.

    - responseId: "C01_S2B_R2"
      text: |
        기술만 인수: 특허와 소스코드만 인수하고 인력은 포기합니다.
      effects:
        users: 0
        cash: -8000000
        trust: 0
        infra: []
      triggersEvent: null
      awsLesson: |
        [AWS 교훈] 코드 인수 시 AWS CodeGuru Reviewer로 코드 품질을 자동 분석하고,
        보안 취약점을 사전에 발견할 수 있습니다.

# --- 3단계: 통합 결과 ---
step3_integration:
  eventId: "CHAIN_ACQ_03_INTEGRATION"
  title: "인수 통합 완료 - 시너지 효과"
  description: |
    3개월간의 인프라 통합 프로젝트가 마무리되고 있습니다.
    최종 마이그레이션 전략을 결정해야 합니다.
  responses:
    - responseId: "C01_S3A_R1"
      text: |
        AWS 기반 통합: 모든 시스템을 AWS로 일원화하고
        EKS 클러스터에서 통합 운영합니다.
      effects:
        users: 5000
        cash: -15000000
        trust: 12
        infra: ["EKS", "Aurora"]
      awsLesson: |
        [AWS 교훈] EKS에서 멀티 서비스를 운영하면 리소스 효율성이 높아집니다.
        Karpenter로 노드 자동 프로비저닝, Istio/App Mesh로 서비스 메시를 구축하면
        마이크로서비스 간 통신을 안전하고 효율적으로 관리할 수 있습니다.

    - responseId: "C01_S3A_R2"
      text: |
        점진적 통합: 스트랭글러 패턴으로 서비스를 하나씩 마이그레이션합니다.
      effects:
        users: 3000
        cash: -8000000
        trust: 8
        infra: []
      awsLesson: |
        [AWS 교훈] 스트랭글러 패턴(Strangler Fig Pattern)은 레거시 시스템을
        점진적으로 대체하는 마이그레이션 전략입니다.
        API Gateway를 프록시로 사용하여 트래픽을 신규/레거시 시스템으로 분배하세요.

step3_talent:
  eventId: "CHAIN_ACQ_03_TALENT"
  title: "영입 인재의 성과"
  description: |
    합류한 시니어 개발자들이 인프라 개선안을 제안했습니다.
  responses:
    - responseId: "C01_S3B_R1"
      text: |
        제안 전면 수용: 서버리스 아키텍처로 대전환합니다.
      effects:
        users: 3000
        cash: -10000000
        trust: 10
        infra: ["Lambda"]
      awsLesson: |
        [AWS 교훈] Lambda + API Gateway + DynamoDB 조합은
        서버리스 3총사로 불리며, 트래픽에 따라 자동 스케일링되고
        미사용 시 비용이 0에 수렴합니다.

    - responseId: "C01_S3B_R2"
      text: |
        선별 적용: 신규 기능에만 서버리스를 적용하고
        기존 시스템은 유지합니다.
      effects:
        users: 1500
        cash: -5000000
        trust: 6
        infra: ["Lambda"]
      awsLesson: |
        [AWS 교훈] 하이브리드 아키텍처(컨테이너 + 서버리스)는 실용적인 접근입니다.
        EventBridge로 이벤트 기반 연동을 하면
        서로 다른 아키텍처 스타일을 느슨하게 결합할 수 있습니다.
```

#### 연쇄 C02: 글로벌 진출기 (3턴 아크)

```yaml
chainId: "CHAIN_GLOBAL_EXPANSION"
name: "글로벌 진출 스토리"
totalSteps: 3
triggerCondition:
  minTurn: 12
  maxTurn: 20
  minUsers: 30000
  minCash: 50000000
  minTrust: 50
  baseProbability: 0.08

# --- 1단계: 해외 시장 기회 ---
step1:
  eventId: "CHAIN_GLOBAL_01"
  title: "동남아 시장 진출 기회"
  description: |
    동남아시아 파트너사로부터 현지 서비스 런칭 제안이 왔습니다.
    "인도네시아, 베트남, 태국에서 우리 서비스에 대한 수요가 감지되고 있습니다.
    하지만 해외 인프라 구축은 전혀 다른 도전입니다."
  responses:
    - responseId: "C02_S1_R1"
      text: |
        풀 스케일 진출: 싱가포르 리전에 독립 인프라를 구축합니다.
      effects:
        users: 5000
        cash: -25000000
        trust: 8
        infra: ["multi-region"]
      triggersEvent: "CHAIN_GLOBAL_02_FULL"
      awsLesson: |
        [AWS 교훈] AWS 싱가포르 리전(ap-southeast-1)은 동남아 서비스의 허브입니다.
        멀티 리전 배포 시 Route 53의 지리적 라우팅(Geolocation Routing)으로
        사용자를 가장 가까운 리전으로 자동 연결합니다.

    - responseId: "C02_S1_R2"
      text: |
        CDN 우선 전략: CloudFront로 콘텐츠만 먼저 서비스하고
        반응을 본 후 결정합니다.
      effects:
        users: 2000
        cash: -8000000
        trust: 3
        infra: ["CloudFront"]
      triggersEvent: "CHAIN_GLOBAL_02_CDN"
      awsLesson: |
        [AWS 교훈] CloudFront의 엣지 로케이션은 동남아에도 다수 존재합니다.
        Lambda@Edge로 엣지에서 로직을 실행하면
        오리진 서버 없이도 기본적인 서비스가 가능합니다.

    - responseId: "C02_S1_R3"
      text: |
        해외 진출 보류: 국내 시장 강화에 집중합니다.
      effects:
        users: 0
        cash: 0
        trust: -2
        infra: []
      triggersEvent: null
      awsLesson: |
        [AWS 교훈] 글로벌 진출을 보류하더라도 글로벌 아키텍처 설계는 미리 해두세요.
        Region-agnostic한 IaC 코드를 작성하면 나중에 빠르게 확장할 수 있습니다.

# --- 2단계A: 풀 스케일 ---
step2_full:
  eventId: "CHAIN_GLOBAL_02_FULL"
  title: "해외 런칭 후 데이터 규제 이슈"
  description: |
    동남아 런칭 후 각국의 데이터 현지화(Data Residency) 규제에 직면했습니다.
    "인도네시아는 개인정보를 반드시 국내에 저장하도록 요구합니다.
    현재 아키텍처로는 대응이 어렵습니다."
  responses:
    - responseId: "C02_S2A_R1"
      text: |
        Aurora Global Database 도입: 멀티 리전 데이터베이스로
        각 리전에서 데이터를 현지 저장하면서 글로벌 동기화합니다.
      effects:
        users: 10000
        cash: -20000000
        trust: 12
        infra: ["Aurora Global DB"]
      triggersEvent: "CHAIN_GLOBAL_03_SUCCESS"
      awsLesson: |
        [AWS 교훈] Aurora Global Database는 최대 6개 리전에 1초 이내 복제를 제공합니다.
        각 리전의 읽기 전용 복제본으로 현지 읽기 성능을 최적화하면서,
        데이터 현지화 규제도 충족할 수 있습니다.

    - responseId: "C02_S2A_R2"
      text: |
        리전별 독립 운영: 각 국가별로 완전히 독립된 스택을 운영합니다.
      effects:
        users: 5000
        cash: -15000000
        trust: 5
        infra: []
      triggersEvent: "CHAIN_GLOBAL_03_ISOLATED"
      awsLesson: |
        [AWS 교훈] 리전별 독립 운영은 데이터 규제에는 유리하지만 운영 복잡도가 높습니다.
        AWS Organizations + Control Tower로 멀티 리전 거버넌스를 중앙 관리하세요.

# --- 2단계B: CDN 우선 ---
step2_cdn:
  eventId: "CHAIN_GLOBAL_02_CDN"
  title: "해외 트래픽 급증"
  description: |
    CDN 기반 서비스가 예상외로 큰 인기를 끌고 있습니다.
    "동남아 트래픽이 전체의 40%를 차지하고 있습니다.
    API 지연 시간이 문제가 되기 시작했습니다."
  responses:
    - responseId: "C02_S2B_R1"
      text: |
        Global Accelerator 도입: AWS Global Accelerator로
        API 요청도 최적 경로로 라우팅합니다.
      effects:
        users: 8000
        cash: -12000000
        trust: 8
        infra: []
      triggersEvent: "CHAIN_GLOBAL_03_SUCCESS"
      awsLesson: |
        [AWS 교훈] AWS Global Accelerator는 AWS 글로벌 네트워크를 통해
        TCP/UDP 트래픽을 최적 경로로 전달합니다.
        CloudFront가 HTTP에 특화되었다면, Global Accelerator는 모든 프로토콜에 적용 가능합니다.

    - responseId: "C02_S2B_R2"
      text: |
        싱가포르 리전 확장: CDN 성공을 기반으로 본격적인 리전 확장을 결정합니다.
      effects:
        users: 5000
        cash: -18000000
        trust: 6
        infra: ["multi-region"]
      triggersEvent: "CHAIN_GLOBAL_03_SUCCESS"
      awsLesson: |
        [AWS 교훈] CDN 캐시 히트율과 API 지연 시간 데이터로 리전 확장 시점을 판단하세요.
        CloudWatch RUM(Real User Monitoring)으로 실제 사용자 경험을 측정하면
        데이터 기반의 인프라 의사결정이 가능합니다.

# --- 3단계: 결과 ---
step3_success:
  eventId: "CHAIN_GLOBAL_03_SUCCESS"
  title: "글로벌 서비스 안정화"
  description: |
    해외 서비스가 안정적으로 운영되고 있습니다. 최종 최적화 전략을 결정하세요.
  responses:
    - responseId: "C02_S3_R1"
      text: |
        AI 현지화: Amazon Translate + Bedrock으로 각 시장에 맞는
        자동 현지화 시스템을 구축합니다.
      effects:
        users: 15000
        cash: -10000000
        trust: 10
        infra: ["Bedrock"]
      awsLesson: |
        [AWS 교훈] Amazon Translate는 75개 이상의 언어를 지원하며,
        Custom Terminology로 도메인 전문 용어도 정확히 번역합니다.
        Bedrock의 LLM과 결합하면 자연스러운 현지화 콘텐츠를 자동 생성할 수 있습니다.

    - responseId: "C02_S3_R2"
      text: |
        비용 최적화: 글로벌 인프라의 FinOps 체계를 확립합니다.
      effects:
        users: 5000
        cash: 15000000
        trust: 6
        infra: []
      awsLesson: |
        [AWS 교훈] 멀티 리전 운영 시 비용이 급증합니다.
        AWS Cost Explorer의 리전별 비용 분석, Savings Plans의 컴퓨팅 유연형 옵션,
        S3 Intelligent-Tiering 등으로 글로벌 비용을 최적화하세요.
```

#### 연쇄 C03: AI 혁명 (2턴 아크)

```yaml
chainId: "CHAIN_AI_REVOLUTION"
name: "AI 혁명의 파도"
totalSteps: 2
triggerCondition:
  minTurn: 10
  maxTurn: 22
  minUsers: 15000
  baseProbability: 0.10

step1:
  eventId: "CHAIN_AI_01"
  title: "생성형 AI 열풍"
  description: |
    ChatGPT급 AI 서비스가 전 세계적으로 화제입니다.
    투자자와 유저 모두 AI 기능을 기대하고 있습니다.
    "AI를 도입하지 않으면 시대에 뒤처질 것 같습니다.
    하지만 GPU 비용이 만만치 않습니다."
  responses:
    - responseId: "C03_S1_R1"
      text: |
        Bedrock 도입: Amazon Bedrock의 기초 모델 API를 활용하여
        자사 서비스에 AI 기능을 빠르게 추가합니다.
      effects:
        users: 5000
        cash: -12000000
        trust: 8
        infra: ["Bedrock"]
      triggersEvent: "CHAIN_AI_02_BEDROCK"
      awsLesson: |
        [AWS 교훈] Amazon Bedrock은 Anthropic Claude, Meta Llama 등
        주요 기초 모델을 API로 제공합니다. GPU 인프라 구축 없이
        서버리스로 AI를 활용할 수 있어 스타트업에 최적입니다.

    - responseId: "C03_S1_R2"
      text: |
        SageMaker 자체 모델: 자체 데이터로 커스텀 ML 모델을 학습합니다.
        시간이 걸리지만 차별화된 AI를 만들 수 있습니다.
      effects:
        users: 2000
        cash: -20000000
        trust: 5
        infra: ["Bedrock"]
      triggersEvent: "CHAIN_AI_02_SAGEMAKER"
      awsLesson: |
        [AWS 교훈] Amazon SageMaker는 ML 워크플로 전체(데이터 준비, 학습, 배포, 모니터링)를
        관리합니다. SageMaker JumpStart로 사전 학습 모델을 빠르게 시작하고,
        자체 데이터로 파인튜닝하는 것이 효율적입니다.

    - responseId: "C03_S1_R3"
      text: |
        관망: AI 열풍이 안정될 때까지 기다립니다.
        현재 서비스 품질 향상에 집중합니다.
      effects:
        users: -3000
        cash: 0
        trust: -5
        infra: []
      triggersEvent: null
      awsLesson: |
        [AWS 교훈] AI 도입 시기를 놓치면 경쟁에서 뒤처질 수 있습니다.
        최소한 Bedrock의 Playground에서 프로토타이핑은 해보세요.
        API 호출 비용만 발생하므로 실험 비용이 매우 낮습니다.

step2_bedrock:
  eventId: "CHAIN_AI_02_BEDROCK"
  title: "AI 기능 폭발적 인기"
  description: |
    AI 기반 추천 기능이 유저들 사이에서 큰 호응을 얻고 있습니다.
    하지만 API 호출 비용이 예상보다 빠르게 증가하고 있습니다.
  responses:
    - responseId: "C03_S2A_R1"
      text: |
        프로비전드 처리량: Bedrock Provisioned Throughput을 구매하여
        비용을 예측 가능하게 관리합니다.
      effects:
        users: 10000
        cash: -15000000
        trust: 10
        infra: []
      awsLesson: |
        [AWS 교훈] Bedrock Provisioned Throughput은 전용 모델 처리 용량을 예약하여
        비용을 안정화하고 일관된 지연 시간을 보장합니다.
        트래픽이 예측 가능하다면 On-Demand 대비 큰 비용 절감이 가능합니다.

    - responseId: "C03_S2A_R2"
      text: |
        캐싱 최적화: 반복 질의에 대한 응답을 캐싱하고
        프롬프트 엔지니어링으로 토큰 사용을 최적화합니다.
      effects:
        users: 7000
        cash: -5000000
        trust: 8
        infra: ["Redis"]
      awsLesson: |
        [AWS 교훈] AI 응답 캐싱은 ElastiCache에 저장하여 동일 질의의 재처리를 방지합니다.
        Semantic caching(의미 기반 캐싱)을 적용하면 유사 질의도 캐시로 처리할 수 있습니다.
        프롬프트 최적화로 입력 토큰을 30-50% 줄일 수 있습니다.

step2_sagemaker:
  eventId: "CHAIN_AI_02_SAGEMAKER"
  title: "커스텀 모델 학습 완료"
  description: |
    자체 데이터로 학습한 모델이 놀라운 성능을 보여주고 있습니다.
    하지만 GPU 인스턴스 비용이 월 수천만원에 달합니다.
  responses:
    - responseId: "C03_S2B_R1"
      text: |
        모델 최적화: SageMaker Neo로 모델을 컴파일하고
        Inferentia 칩으로 추론 비용을 절감합니다.
      effects:
        users: 8000
        cash: -10000000
        trust: 12
        infra: []
      awsLesson: |
        [AWS 교훈] AWS Inferentia/Trainium 칩은 ML 추론/학습에 특화된 커스텀 칩입니다.
        GPU 대비 최대 70% 비용 절감이 가능합니다.
        SageMaker Neo로 모델을 자동 최적화하면 별도 코드 변경 없이 성능이 향상됩니다.

    - responseId: "C03_S2B_R2"
      text: |
        서버리스 추론: SageMaker Serverless Inference로 전환하여
        사용한 만큼만 비용을 지불합니다.
      effects:
        users: 5000
        cash: -3000000
        trust: 8
        infra: []
      awsLesson: |
        [AWS 교훈] SageMaker Serverless Inference는 트래픽이 일정하지 않은 경우에 최적입니다.
        호출이 없으면 비용이 0이고, 트래픽에 따라 자동으로 스케일됩니다.
        Cold start가 있으므로 실시간성이 중요한 경우 Provisioned를 고려하세요.
```

---

## 5. 위기 이벤트 (Crisis Events)

### 5.1 설계 원칙

- 현재 인프라 상태에 따라 위기의 영향도가 달라짐
- 올바른 인프라를 갖추고 있으면 자동으로 방어되거나 피해가 최소화
- 교육적 핵심: "왜 이 AWS 서비스가 필요한가"를 체감하게 함
- 발생 확률은 낮지만(5-8%), 영향도는 크게 설계

### 5.2 위기 이벤트 목록

#### 위기 CR01: DDoS 대규모 공격

```yaml
eventId: "CRISIS_DDOS_ATTACK"
title: "[위기] 대규모 DDoS 공격"
type: CRISIS
severity: CRITICAL
description: |
  대규모 DDoS 공격이 감지되었습니다.
  "초당 수백만 건의 요청이 들어오고 있습니다!
  서비스가 완전히 마비되기 직전입니다.
  즉각적인 대응이 필요합니다!"
triggerCondition:
  minTurn: 6
  maxTurn: 24
  minUsers: 5000
  baseProbability: 0.05

# 인프라에 따른 자동 방어 (이벤트 발생 전 체크)
autoDefense:
  - condition:
      requireInfra: ["CloudFront"]  # CloudFront가 있으면
    effect: "DDoS 트래픽의 70%가 엣지에서 흡수됩니다."
    damageReduction: 0.7

responses:
  - responseId: "CR01_R1"
    text: |
      Shield Advanced 긴급 활성화: AWS Shield Advanced를 즉시 활성화하여
      L3/L4/L7 공격을 자동 차단합니다.
      DDoS Response Team(DRT)의 24/7 지원도 받을 수 있습니다.
    effects:
      users: -500
      cash: -8000000
      trust: 10
      infra: []
    awsLesson: |
      [AWS 교훈] AWS Shield Standard는 무료로 L3/L4 DDoS를 방어합니다.
      Shield Advanced($3,000/월)는 L7 공격 방어, 비용 보호, DRT 전담 지원을 추가합니다.
      CloudFront와 결합하면 엣지에서 공격을 흡수하여 오리진을 보호합니다.

  - responseId: "CR01_R2"
    text: |
      WAF 규칙 긴급 추가: Rate-based Rule로 비정상 트래픽을 차단하고,
      IP 평판 리스트로 알려진 공격 IP를 블랙리스트합니다.
    effects:
      users: -2000
      cash: -3000000
      trust: 3
      infra: []
    awsLesson: |
      [AWS 교훈] AWS WAF의 Rate-based Rules는 5분 동안 특정 IP의 요청이
      임계값을 넘으면 자동 차단합니다.
      AWS Managed Rules의 IP Reputation List로 봇넷 IP를 사전 차단하세요.

  - responseId: "CR01_R3"
    text: |
      서비스 일시 중단: 공격이 멈출 때까지 서비스를 내립니다.
      안전하지만 유저 이탈이 불가피합니다.
    effects:
      users: -8000
      cash: 0
      trust: -15
      infra: []
    awsLesson: |
      [AWS 교훈] 서비스 중단은 최후의 수단이어야 합니다.
      사전에 DDoS 대응 런북(Runbook)을 준비하고,
      정기적으로 DDoS 시뮬레이션 테스트를 실시하세요.
      AWS의 DDoS 시뮬레이션 테스트 정책을 확인하세요.
```

#### 위기 CR02: 데이터 유출 사고

```yaml
eventId: "CRISIS_DATA_BREACH"
title: "[위기] 개인정보 유출 사고"
type: CRISIS
severity: CRITICAL
description: |
  DB에 저장된 유저 개인정보가 외부에 유출된 정황이 발견되었습니다.
  "해킹에 의한 것인지, 내부자에 의한 것인지 아직 파악이 안 됩니다.
  유출 규모와 경로를 빠르게 확인해야 합니다."
triggerCondition:
  minTurn: 7
  maxTurn: 23
  minUsers: 5000
  baseProbability: 0.04

autoDefense:
  - condition:
      requireInfra: ["Aurora"]  # Aurora의 자동 암호화
    effect: "데이터가 암호화되어 있어 유출되더라도 복호화가 어렵습니다."
    damageReduction: 0.5

responses:
  - responseId: "CR02_R1"
    text: |
      전면 대응: 즉시 사고 대응팀을 가동합니다.
      CloudTrail 로그 분석, GuardDuty 위협 탐지, Macie로 민감 데이터 스캔,
      영향 유저 전원 통보, KISA 침해사고 신고를 동시 진행합니다.
    effects:
      users: -5000
      cash: -20000000
      trust: -10
      infra: []
    awsLesson: |
      [AWS 교훈] 사고 대응의 핵심은 CloudTrail(API 감사 로그) + GuardDuty(위협 탐지) +
      Detective(조사 분석) 3종 세트입니다.
      Amazon Macie는 S3에 저장된 민감 데이터(PII)를 자동으로 식별합니다.
      사전에 사고 대응 런북을 Systems Manager에 준비해두세요.

  - responseId: "CR02_R2"
    text: |
      최소 공개: 법적 요건만 충족하는 범위에서 조용히 처리합니다.
      유출 규모를 최소화하여 발표합니다.
    effects:
      users: -2000
      cash: -10000000
      trust: -20
      infra: []
    awsLesson: |
      [AWS 교훈] 데이터 유출 은폐는 발각 시 더 큰 피해를 초래합니다.
      투명한 대응이 장기적 신뢰에 유리합니다.
      AWS Security Hub에서 보안 상태를 상시 모니터링하고,
      EventBridge로 보안 이벤트 자동 대응을 구성하세요.

  - responseId: "CR02_R3"
    text: |
      보안 대전환: 사고를 계기로 제로 트러스트 아키텍처를 도입합니다.
      VPC 재설계, 네트워크 마이크로세그멘테이션, IAM 전면 재구성을 실행합니다.
    effects:
      users: -3000
      cash: -25000000
      trust: -5
      infra: []
    awsLesson: |
      [AWS 교훈] 제로 트러스트는 "절대 신뢰하지 않고, 항상 검증한다"는 원칙입니다.
      VPC Private Link로 인터넷 노출을 최소화하고,
      AWS Verified Access로 애플리케이션 수준 접근 제어를 구현하세요.
      Network Firewall로 VPC 간 트래픽도 검사합니다.
```

#### 위기 CR03: 리전 전체 장애

```yaml
eventId: "CRISIS_REGION_FAILURE"
title: "[위기] AWS 리전 전체 장애"
type: CRISIS
severity: CRITICAL
description: |
  AWS 서울 리전에 전례 없는 대규모 장애가 발생했습니다.
  EC2, RDS, S3 등 주요 서비스가 모두 영향을 받고 있습니다.
  "AWS 공식 발표에 따르면 복구에 수 시간이 소요될 것으로 예상됩니다.
  우리 서비스는 완전히 중단된 상태입니다."
triggerCondition:
  minTurn: 10
  maxTurn: 24
  minUsers: 10000
  baseProbability: 0.03

autoDefense:
  - condition:
      requireInfra: ["dr-configured"]
    effect: "DR 환경이 구성되어 있어 자동 페일오버가 시작됩니다."
    damageReduction: 0.8
  - condition:
      requireInfra: ["multi-region"]
    effect: "멀티 리전 아키텍처로 다른 리전에서 서비스가 계속됩니다."
    damageReduction: 0.95

responses:
  - responseId: "CR03_R1"
    text: |
      대기 및 복구: AWS의 복구를 기다리며, 복구 후 데이터 정합성을 검증합니다.
    effects:
      users: -10000
      cash: -5000000
      trust: -20
      infra: []
    awsLesson: |
      [AWS 교훈] 단일 리전에 의존하면 리전 장애 시 속수무책입니다.
      이것이 DR(Disaster Recovery) 전략이 필요한 이유입니다.
      AWS의 4가지 DR 전략: Backup/Restore, Pilot Light, Warm Standby, Multi-site Active/Active.

  - responseId: "CR03_R2"
    text: |
      긴급 리전 마이그레이션: 도쿄 리전으로 긴급 마이그레이션을 시도합니다.
      백업 데이터를 기반으로 최대한 빠르게 서비스를 복구합니다.
    effects:
      users: -5000
      cash: -30000000
      trust: -8
      infra: ["multi-region"]
    awsLesson: |
      [AWS 교훈] 사전에 Pilot Light 이상의 DR 전략을 구성해두면
      리전 장애 시 수분 내에 복구할 수 있습니다.
      Route 53 Health Check + DNS 페일오버로 자동 전환을 구성하세요.
      Aurora Global Database의 Cross-Region Failover는 1분 이내에 완료됩니다.

  - responseId: "CR03_R3"
    text: |
      유저 커뮤니케이션: 기술적 대응과 함께 투명한 장애 공지를 발행합니다.
      복구 상황을 실시간으로 공유합니다.
    effects:
      users: -7000
      cash: -2000000
      trust: -10
      infra: []
    awsLesson: |
      [AWS 교훈] 장애 커뮤니케이션은 Status Page(AWS Health Dashboard와 유사)로 자동화하세요.
      CloudWatch Synthetics의 카나리아로 서비스 가용성을 외부에서 모니터링하고,
      장애 감지 시 SNS + Lambda로 자동 공지를 발송하세요.
```

#### 위기 CR04: 비용 폭발

```yaml
eventId: "CRISIS_COST_EXPLOSION"
title: "[위기] AWS 비용 폭발"
type: CRISIS
severity: HIGH
description: |
  이번 달 AWS 비용이 예산의 300%를 초과했습니다.
  "누군가 대형 인스턴스를 방치했거나, 예상치 못한 트래픽 패턴이 발생한 것 같습니다.
  이대로면 현금이 빠르게 소진됩니다."
triggerCondition:
  minTurn: 5
  maxTurn: 22
  minUsers: 3000
  baseProbability: 0.08

responses:
  - responseId: "CR04_R1"
    text: |
      비용 긴급 감사: Cost Explorer로 비용 급증 원인을 분석하고,
      미사용 리소스를 즉시 정리합니다. Budgets 알림을 설정합니다.
    effects:
      users: 0
      cash: 8000000
      trust: 3
      infra: []
    awsLesson: |
      [AWS 교훈] AWS Cost Explorer의 비용 이상 탐지(Cost Anomaly Detection)는
      ML 기반으로 비정상적인 비용 증가를 자동 감지합니다.
      AWS Budgets에서 예산 초과 시 자동 조치(EC2/RDS 중지)를 설정할 수 있습니다.

  - responseId: "CR04_R2"
    text: |
      아키텍처 최적화: 서버리스 전환과 Spot 인스턴스 활용으로
      근본적인 비용 구조를 개선합니다.
    effects:
      users: 0
      cash: 15000000
      trust: 5
      infra: []
    awsLesson: |
      [AWS 교훈] EC2 Spot 인스턴스는 On-Demand 대비 최대 90% 저렴합니다.
      Fargate Spot, Lambda의 종량제 모델을 활용하면 비용을 예측 가능하게 관리할 수 있습니다.
      Compute Optimizer가 인스턴스 타입 최적화를 자동 추천합니다.

  - responseId: "CR04_R3"
    text: |
      일시적 축소: 비핵심 서비스를 일시 중단하고 최소한의 인프라만 운영합니다.
    effects:
      users: -3000
      cash: 5000000
      trust: -5
      infra: []
    awsLesson: |
      [AWS 교훈] 비용 위기 시 먼저 줄일 수 있는 것:
      1) 미사용 EBS 볼륨/스냅샷 정리
      2) 개발/스테이징 환경 야간 중지(Instance Scheduler)
      3) S3 Lifecycle Policy로 오래된 객체 Glacier로 이동
      4) NAT Gateway 트래픽 최적화
```

#### 위기 CR05: 데이터베이스 손상

```yaml
eventId: "CRISIS_DB_CORRUPTION"
title: "[위기] 데이터베이스 손상"
type: CRISIS
severity: CRITICAL
description: |
  배포 스크립트 오류로 프로덕션 데이터베이스의 핵심 테이블 데이터가 손상되었습니다.
  "마이그레이션 스크립트가 잘못 실행되어 유저 프로필 데이터가 일부 덮어쓰기 되었습니다.
  영향 범위를 파악하고 복구해야 합니다."
triggerCondition:
  minTurn: 6
  maxTurn: 23
  minUsers: 3000
  baseProbability: 0.05

autoDefense:
  - condition:
      requireInfra: ["Aurora"]
    effect: "Aurora의 백트래킹 기능으로 특정 시점으로 DB를 되돌릴 수 있습니다."
    damageReduction: 0.8

responses:
  - responseId: "CR05_R1"
    text: |
      PITR 복구: Point-in-Time Recovery를 사용하여
      손상 직전 시점으로 데이터베이스를 복구합니다.
    effects:
      users: -500
      cash: -3000000
      trust: 5
      infra: []
    requireInfra: ["Aurora"]
    awsLesson: |
      [AWS 교훈] Aurora/RDS의 PITR(Point-in-Time Recovery)은 최대 35일 이내의
      임의 시점으로 DB를 복구할 수 있습니다. 5분 단위의 자동 백업이 기본 활성화되어 있습니다.
      Aurora의 Backtrack 기능은 DB를 되감기(rewind)하여 더 빠른 복구가 가능합니다.

  - responseId: "CR05_R2"
    text: |
      수동 복구: 백업 스냅샷에서 데이터를 추출하여 손상된 부분만 수동 복구합니다.
      시간이 오래 걸리지만 데이터 유실을 최소화합니다.
    effects:
      users: -2000
      cash: -5000000
      trust: -5
      infra: []
    awsLesson: |
      [AWS 교훈] AWS Backup으로 중앙 집중식 백업 정책을 관리하세요.
      Cross-region 백업으로 리전 장애에도 데이터를 보호하고,
      백업 볼트 잠금(Vault Lock)으로 실수나 악의적 삭제를 방지할 수 있습니다.

  - responseId: "CR05_R3"
    text: |
      유저 보상: 데이터 복구와 함께 영향받은 유저에게 보상을 제공합니다.
      투명한 사과와 재발 방지 대책을 공유합니다.
    effects:
      users: -1000
      cash: -10000000
      trust: 2
      infra: []
    awsLesson: |
      [AWS 교훈] 데이터 손상 재발 방지를 위해:
      1) RDS Proxy로 커넥션 관리를 안정화하세요
      2) Schema 변경은 Blue/Green Deployment로 안전하게 실행하세요
      3) DMS로 변경 사항을 검증 환경에서 먼저 테스트하세요
```
