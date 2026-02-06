# AWS 스타트업 타이쿤 (AWS Startup Tycoon)

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Tests](https://img.shields.io/badge/tests-317%20passing-brightgreen.svg)

**당신은 스타트업의 CTO입니다!** 비즈니스 결정과 AWS 인프라 설계를 통해 IPO까지 도달하세요.

[**🎮 게임 플레이**](#quick-start) | [**📚 문서**](#documentation) | [**🛠️ 개발 가이드**](#development) | [**🚀 배포**](#deployment)

---

## 📖 목차

- [개요](#개요)
- [주요 기능](#주요-기능)
- [게임 플레이](#게임-플레이)
- [기술 스택](#기술-스택)
- [빠른 시작](#빠른-시작)
- [프로젝트 구조](#프로젝트-구조)
- [개발 가이드](#개발-가이드)
- [테스트](#테스트)
- [배포](#배포)
- [문서](#문서)
- [기여하기](#기여하기)
- [라이선스](#라이선스)

---

## 🎯 개요

**AWS 스타트업 타이쿤**은 텍스트 기반 비즈니스 시뮬레이션 게임으로, 플레이어가 스타트업의 CTO가 되어 비즈니스 의사결정과 AWS 인프라 설계를 동시에 수행합니다.

### 게임 컨셉

- **비즈니스 레이어**: 마케팅, 투자 유치, 팀 채용, 수익화, 글로벌 확장
- **인프라 레이어**: AWS 리소스 관리 (EC2 → Aurora → EKS → Global DB)
- **교육적 가치**: 실제 AWS 아키텍처 패턴을 게임으로 학습

### 게임 목표

✅ **성공**: IPO 달성 (1조원+ 기업가치)
- 요구사항: 10만+ 사용자, 월 3억원+ 매출, 99.9% SLA

❌ **실패**: 서버 장애 → 사용자 이탈 → 파산
- 시나리오: 잘못된 인프라 결정, 투자 유치 실패, 팀 붕괴

---

## ✨ 주요 기능

### 🎮 게임 시스템

#### 1. 턴 기반 선택 시스템
- **25턴** 진행 (초기 1개 선택 → 후기 2개 선택)
- **253개** 선택지 (비즈니스 + 인프라)
- **동적 이벤트**: 14가지 이벤트 타입 (위기, 기회, 경쟁, 규제 등)

#### 2. 신뢰도 시스템 (Trust System)
- 투자자/시장 신뢰도 추적
- 연속 수용량 초과 경고 (3회 이상 → 투자자 경고)
- 회복 메커니즘: 안정성 보너스, 위기 극복 보너스, 투명성 1.5배
- 대체 투자 경로: Bridge Financing, 정부 지원금

#### 3. AWS 퀴즈 시스템
- **5개 퀴즈** per 게임 (Turn 5, 9, 13, 17, 21 ±2)
- **3가지 난이도**: EASY, MEDIUM, HARD
- **보너스 점수**: 5개 전부 맞추면 +50,000점 (+26% 점수 부스트)
- **LLM 생성**: vLLM (gpt-oss-20b) 동적 퀴즈 생성

#### 4. 인프라 진화 (6단계)
```
EC2 단일 인스턴스 (~500명)
  ↓
Aurora Serverless (~5K명)
  ↓
ALB + Auto Scaling + Redis (~50K명)
  ↓
EKS + Karpenter (~1M명)
  ↓
Aurora Global DB + AI/ML (~10M명)
  ↓
IPO급 MSA 아키텍처 (무제한 확장)
```

### 🎨 UI/UX 특징

- **모바일 최적화**: 390x844 해상도 완벽 지원 (iPhone 12 Mini)
- **반응형 디자인**: Progressive Enhancement (mobile → tablet → desktop)
- **WCAG 2.5.5 준수**: 모든 터치 타겟 44px 이상
- **AWS 공식 아이콘**: 15개 AWS 서비스 아이콘 통합
- **한국어 타이포그래피**: `word-break: keep-all` 적용

### 📊 리더보드

- 글로벌 랭킹 시스템
- 점수 계산: 사용자 수, 자금, 신뢰도, 인프라, 퀴즈 보너스
- Top 20 / 최근 기록 탭

---

## 🎮 게임 플레이

### 게임 흐름

1. **난이도 선택**: EASY (1.2배 매출) / NORMAL (1.0배) / HARD (0.8배 매출)
2. **Turn 진행**: 매 턴마다 5-6개 선택지 제시
3. **선택 실행**: 비즈니스/인프라 결정
4. **메트릭 변화**: 사용자, 자금, 신뢰도, 인프라 변동
5. **퀴즈 도전**: 특정 턴에 AWS 퀴즈 출현
6. **결과**: IPO 성공 or 파산/실패

### 핵심 메트릭

| 메트릭 | 설명 | 초기값 |
|--------|------|--------|
| 💰 **Cash** | 보유 자금 | 10M (시드 투자) |
| 👥 **Users** | 서비스 사용자 | 0명 |
| 💵 **Revenue** | 월 매출 | 0원 |
| ⭐ **Trust** | 투자자 신뢰도 | 50 (중립) |
| ☁️ **Infrastructure** | AWS 스택 | ["EC2"] |
| 👨‍💻 **Team** | 팀 규모 | 1명 (창업자) |
| 📈 **SLA** | 서비스 가용성 | 99.0% |

### 승리 조건 (IPO)

- ✅ 사용자 ≥ 100,000명
- ✅ 월 매출 ≥ 300,000,000원 (3억)
- ✅ 신뢰도 ≥ 80 (NORMAL 모드)
- ✅ 인프라: Aurora Global DB + EKS

### 패배 조건

- ❌ **파산**: 자금 < 0
- ❌ **서버 장애**: 신뢰도 < 20
- ❌ **IPO 실패**: Turn 25 종료 시 조건 미달

---

## 🛠️ 기술 스택

### Frontend

| 기술 | 버전 | 용도 |
|------|------|------|
| **Next.js** | 15.1.5 | App Router, React 19 |
| **TypeScript** | 5.x | 타입 안정성 |
| **Redux Toolkit** | 2.2.1 | 상태 관리 + RTK Query |
| **TailwindCSS** | 3.4.17 | 스타일링 + 반응형 |
| **Framer Motion** | 12.31.0 | 애니메이션 |
| **Playwright** | - | E2E 테스트 |

### Backend

| 기술 | 버전 | 용도 |
|------|------|------|
| **NestJS** | 10.x | REST API + WebSocket |
| **TypeScript** | 5.x | 타입 안정성 |
| **TypeORM** | 0.3.x | ORM (SQLite → Aurora) |
| **SQLite** | 3.x | 개발 DB |
| **Jest** | 29.x | 단위/통합 테스트 |
| **Swagger** | 7.x | API 문서 |

### AI/ML

| 기술 | 용도 |
|------|------|
| **vLLM** | 동적 이벤트 생성 (gpt-oss-20b) |
| **Redis** | LLM 캐싱 (60%+ hit rate) |

### Infrastructure (Planned)

- **Aurora MySQL Serverless v2**: 프로덕션 DB
- **ElastiCache Redis**: 게임 상태 캐싱
- **EKS + Karpenter**: 컨테이너 오케스트레이션
- **CloudFront + S3**: 정적 호스팅
- **GitHub Actions**: CI/CD

---

## 🚀 빠른 시작

### 사전 요구사항

- **Node.js**: 18.x 이상
- **npm**: 9.x 이상
- **Git**: 최신 버전

### 설치

```bash
# 1. 저장소 클론
git clone https://github.com/Cloud-Linuxer/cto-game.git
cd cto-game

# 2. Backend 설치
cd backend
npm install
npm run import-data  # 게임 데이터 임포트
cd ..

# 3. Frontend 설치
cd frontend
npm install
cd ..
```

### 개발 서버 실행

#### 옵션 1: 자동 스크립트 (권장)

```bash
# Backend, Frontend, Cloudflare Tunnel 동시 실행
npm run dev:all
```

#### 옵션 2: 수동 실행

```bash
# Terminal 1: Backend
cd backend
npm run start:dev

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Cloudflare Tunnel (Optional)
cloudflared tunnel --url http://localhost:3001
```

### 접속

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **API Docs**: http://localhost:3000/api-docs
- **Public URL**: Cloudflare Tunnel URL (로그에서 확인)

---

## 📁 프로젝트 구조

```
cto-game/
├── backend/                    # NestJS Backend
│   ├── src/
│   │   ├── game/              # 게임 로직 (7개 서비스)
│   │   ├── turn/              # 턴 관리
│   │   ├── event/             # 동적 이벤트 (14 타입)
│   │   ├── leaderboard/       # 리더보드
│   │   ├── security/          # 보안 서비스
│   │   ├── llm/               # LLM 통합 (vLLM)
│   │   ├── config/            # 설정
│   │   └── database/          # TypeORM Entities (9개)
│   ├── test/                  # 단위/통합 테스트
│   ├── package.json
│   └── nest-cli.json
│
├── frontend/                   # Next.js Frontend
│   ├── app/                   # App Router (Next.js 15)
│   │   ├── page.tsx           # 랜딩 페이지
│   │   ├── game/[gameId]/     # 게임 플레이
│   │   ├── leaderboard/       # 리더보드
│   │   └── test/              # 테스트 페이지
│   ├── components/            # React 컴포넌트 (19개)
│   │   ├── QuizPopup/         # 퀴즈 시스템
│   │   ├── metrics/           # 신뢰도 게이지
│   │   └── ...
│   ├── store/                 # Redux Store
│   ├── lib/                   # 유틸리티
│   ├── types/                 # TypeScript 타입
│   └── e2e/                   # Playwright E2E
│
├── docs/                       # 문서
│   ├── epics/                 # EPIC 문서
│   ├── features/              # Feature 스펙
│   ├── implementations/       # 구현 가이드
│   ├── testing/               # 테스트 가이드
│   └── verification/          # 검증 결과
│
├── .ai/                        # AI Agent 구조
│   ├── roles/                 # 6개 AI 역할
│   ├── skills/                # 5개 스킬
│   ├── context/               # 컨텍스트 문서
│   └── templates/             # 템플릿
│
├── aws_image/                  # AWS 공식 아이콘
├── game_choices_db.json        # 게임 데이터 (253 선택지)
├── CLAUDE.md                   # 프로젝트 가이드
└── README.md                   # 이 파일
```

---

## 💻 개발 가이드

### Backend 개발

```bash
cd backend

# 개발 서버 실행 (Hot Reload)
npm run start:dev

# 테스트 실행
npm test                    # 단위 테스트
npm run test:watch          # Watch 모드
npm run test:cov            # 커버리지

# 데이터 재임포트
npm run import-data

# 빌드
npm run build

# 프로덕션 실행
npm run start:prod
```

### Frontend 개발

```bash
cd frontend

# 개발 서버 실행
npm run dev

# 타입 체크
npm run type-check

# 린트
npm run lint
npm run lint:fix

# 테스트
npm run test              # Jest 단위 테스트
npm run test:e2e          # Playwright E2E

# 빌드
npm run build

# 프로덕션 실행
npm start
```

### API 엔드포인트

#### Game API

```http
POST   /api/game/start              # 게임 시작
GET    /api/game/:gameId            # 게임 상태 조회
POST   /api/game/:gameId/choice     # 선택 실행
DELETE /api/game/:gameId            # 게임 삭제
GET    /api/game/:gameId/trust-history  # 신뢰도 히스토리
```

#### Leaderboard API

```http
POST   /api/leaderboard/submit      # 점수 제출
GET    /api/leaderboard/top         # Top 랭킹
GET    /api/leaderboard             # 전체 리더보드
GET    /api/leaderboard/statistics  # 통계
POST   /api/leaderboard/clear       # 초기화 (dev only)
```

자세한 API 문서: http://localhost:3000/api-docs

---

## 🧪 테스트

### Backend 테스트 현황

```
총 테스트: 317개
통과: 317개 (100%)
실패: 0개
커버리지: 52.67% (핵심 서비스 90%+)
```

**주요 커버리지**:
- GameService: 91%
- TrustHistoryService: 95%
- AlternativeInvestmentService: 96%
- EventQualityScorerService: 96%
- PromptBuilderService: 100%

### Frontend 테스트

```bash
# 컴포넌트 테스트
npm run test

# E2E 테스트 (Playwright)
npm run test:e2e

# 특정 테스트 실행
npm run test -- QuizPopup.test.tsx
```

### 테스트 가이드

- 단위 테스트: `*.spec.ts` (Jest)
- E2E 테스트: `e2e/*.spec.ts` (Playwright)
- 시각적 테스트: `/test/quiz-popup`, `/test/multiple-choice-quiz`

---

## 🚀 배포

### 프로덕션 빌드

```bash
# Backend
cd backend
npm run build
npm run start:prod

# Frontend
cd frontend
npm run build
npm start
```

### Docker (예정)

```bash
# Backend
docker build -t cto-game-backend ./backend
docker run -p 3000:3000 cto-game-backend

# Frontend
docker build -t cto-game-frontend ./frontend
docker run -p 3001:3001 cto-game-frontend
```

### AWS 배포 (예정)

- **ECS/EKS**: 컨테이너 오케스트레이션
- **Aurora Serverless**: 데이터베이스
- **CloudFront + S3**: 프론트엔드 호스팅
- **Route 53**: DNS 관리
- **CloudWatch**: 모니터링

---

## 📚 문서

### 프로젝트 문서

- **CLAUDE.md**: 전체 프로젝트 가이드
- **docs/epics/**: EPIC 문서 (12개)
- **docs/features/**: Feature 스펙
- **docs/implementations/**: 구현 가이드
- **docs/testing/**: 테스트 가이드

### 주요 EPIC

| EPIC | 제목 | 상태 | 완료율 |
|------|------|------|--------|
| EPIC-03 | 동적 이벤트 시스템 | 🚧 In Progress | 85% |
| EPIC-04 | 신뢰도 시스템 개편 | ✅ Complete | 100% |
| EPIC-06 | LLM 프로덕션 준비 | 🚧 In Progress | 80% |
| EPIC-07 | AWS 퀴즈 시스템 | ✅ Complete | 100% |
| EPIC-08 | 신뢰도 밸런싱 | ✅ Complete | 100% |
| EPIC-09 | 후반 수용량 밸런스 | ✅ Complete | 100% |
| EPIC-10 | 프론트엔드 정리 | ✅ Complete | 100% |
| EPIC-12 | 모바일 반응형 | ✅ Complete | 100% |

### API 문서

Swagger UI: http://localhost:3000/api-docs

---

## 🤝 기여하기

### 기여 가이드

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### 코딩 컨벤션

- **TypeScript**: Strict 모드
- **Linting**: ESLint + Prettier
- **Commits**: Conventional Commits (feat/fix/docs/test/refactor)
- **Tests**: 80% 커버리지 목표

### 브랜치 전략

- `main`: 프로덕션 브랜치
- `develop`: 개발 브랜치
- `feature/*`: 기능 개발
- `fix/*`: 버그 수정
- `epic/*`: EPIC 작업

---

## 📄 라이선스

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 팀

- **Product Owner**: linuxer
- **Tech Lead**: Claude Code (AI-Assisted Development)
- **Architecture**: 6 AI Roles (Producer, Designer, Client, Server, QA, LiveOps)

---

## 🙏 감사의 말

- **AWS**: 공식 아이콘 및 아키텍처 참고
- **OpenAI**: LLM 모델 (gpt-oss-20b via vLLM)
- **Anthropic**: Claude Code AI Agent
- **Next.js**: 프론트엔드 프레임워크
- **NestJS**: 백엔드 프레임워크

---

## 📞 문의

- **GitHub**: https://github.com/Cloud-Linuxer/cto-game
- **Issues**: https://github.com/Cloud-Linuxer/cto-game/issues

---

## 🗺️ 로드맵

### Phase 1 (진행 중)
- ✅ 핵심 게임 로직
- ✅ 신뢰도 시스템
- ✅ 퀴즈 시스템
- ✅ 모바일 최적화
- 🚧 동적 이벤트 통합
- 🚧 LLM 프로덕션 배포

### Phase 2 (예정)
- Aurora MySQL 마이그레이션
- Redis 캐싱 레이어
- AWS Cognito 인증
- WebSocket 실시간 통신
- 다국어 지원 (i18n)

### Phase 3 (미래)
- 멀티플레이어 모드
- 시즌 리더보드
- 커스텀 시나리오
- AWS 자격증 연동

---

**Made with ❤️ and ☕ by the CTO Game Team**

**Powered by AWS, Next.js, NestJS, and AI**
