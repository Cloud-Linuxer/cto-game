# AWS CTO Game Backend

AWS 스타트업 타이쿤 게임의 백엔드 API 서버 (Phase 0 MVP)

## 기술 스택

- **Framework**: NestJS 10 (TypeScript)
- **Database**: SQLite (개발), Aurora MySQL Serverless (프로덕션)
- **ORM**: TypeORM 0.3
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest (단위 테스트 + E2E)

## 프로젝트 구조

```
backend/
├── src/
│   ├── main.ts                 # 애플리케이션 엔트리 포인트
│   ├── app.module.ts           # 루트 모듈
│   ├── database/               # DB 설정 및 엔티티
│   │   ├── database.config.ts
│   │   └── entities/
│   │       ├── game.entity.ts
│   │       ├── turn.entity.ts
│   │       ├── choice.entity.ts
│   │       └── choice-history.entity.ts
│   ├── game/                   # 게임 모듈
│   │   ├── game.controller.ts
│   │   ├── game.service.ts
│   │   ├── game.module.ts
│   │   └── game.service.spec.ts
│   ├── turn/                   # 턴 모듈
│   │   ├── turn.controller.ts
│   │   ├── turn.service.ts
│   │   ├── turn.module.ts
│   │   └── turn.service.spec.ts
│   └── common/                 # 공통 모듈
│       ├── dto/                # DTO 정의
│       └── filters/            # Exception Filters
├── scripts/
│   └── import-game-data.ts     # 게임 데이터 임포트 스크립트
├── test/
│   └── game.e2e-spec.ts        # E2E 테스트
└── data/
    └── cto-game.db             # SQLite 데이터베이스 (자동 생성)
```

## 설치 및 실행

### 1. 의존성 설치

```bash
cd backend
npm install
```

### 2. 게임 데이터 임포트

```bash
npm run import-data
```

**예상 출력:**
```
📦 게임 데이터 임포트 시작...
📚 총 22개 턴 데이터 발견
🗑️  기존 데이터 삭제 완료
✅ 턴 1 임포트 완료 (선택지 5개)
✅ 턴 2 임포트 완료 (선택지 6개)
...
🎉 게임 데이터 임포트 성공!
   - 턴 수: 22개
   - 선택지 수: 3700+개
✅ 데이터 무결성 확인 완료!
```

### 3. 개발 서버 실행

```bash
npm run start:dev
```

서버가 `http://localhost:3000`에서 실행됩니다.

### 4. API 문서 확인

브라우저에서 [http://localhost:3000/api-docs](http://localhost:3000/api-docs)를 열어 Swagger UI를 확인할 수 있습니다.

## API 엔드포인트

### 게임 관리

- **POST** `/api/game/start` - 새 게임 시작
- **GET** `/api/game/:gameId` - 게임 상태 조회
- **POST** `/api/game/:gameId/choice` - 선택 실행
- **DELETE** `/api/game/:gameId` - 게임 삭제

### 턴 정보

- **GET** `/api/turn` - 모든 턴 목록 조회
- **GET** `/api/turn/:turnNumber` - 특정 턴 정보 조회

## 테스트

### 단위 테스트 실행

```bash
npm run test
```

### E2E 테스트 실행

```bash
npm run test:e2e
```

### 커버리지 확인

```bash
npm run test:cov
```

**목표 커버리지**: 80%+ (Statements, Functions, Lines)

## 게임 플로우 예시

### 1. 게임 시작

```bash
curl -X POST http://localhost:3000/api/game/start
```

**응답:**
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "currentTurn": 1,
  "users": 0,
  "cash": 10000000,
  "trust": 50,
  "infrastructure": ["EC2"],
  "status": "PLAYING",
  "createdAt": "2025-10-01T12:00:00.000Z",
  "updatedAt": "2025-10-01T12:00:00.000Z"
}
```

### 2. 턴 1 정보 조회

```bash
curl http://localhost:3000/api/turn/1
```

**응답:**
```json
{
  "turnId": 1,
  "turnNumber": 1,
  "eventText": "1턴 이벤트: 스타트업 진행 상황",
  "description": "...",
  "choices": [
    {
      "choiceId": 1,
      "turnNumber": 1,
      "text": "투자자 피칭 실행",
      "effects": {
        "users": 13078,
        "cash": 1718648,
        "trust": 18,
        "infra": ["Aurora", "EKS"]
      },
      "nextTurn": 2
    },
    ...
  ]
}
```

### 3. 선택 실행

```bash
curl -X POST http://localhost:3000/api/game/{gameId}/choice \
  -H "Content-Type: application/json" \
  -d '{"choiceId": 1}'
```

**응답:**
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "currentTurn": 2,
  "users": 13078,
  "cash": 11718648,
  "trust": 68,
  "infrastructure": ["EC2", "Aurora", "EKS"],
  "status": "PLAYING",
  ...
}
```

## 게임 규칙

### 초기 상태

- 자금: 10,000,000원 (1천만원)
- 유저: 0명
- 신뢰도: 50
- 인프라: EC2

### 승리 조건 (IPO 성공)

- 유저 수: 100,000명 이상
- 자금: 300,000,000원 이상 (3억원)
- 신뢰도: 99 이상
- 인프라: Aurora Global DB + EKS 보유

### 패배 조건

1. **파산**: 자금이 음수가 됨
2. **서버 장애**: 유저가 있는 상태에서 신뢰도가 20 미만
3. **IPO 실패**: 22턴 이후 IPO 조건 미달성

## 개발 명령어

```bash
# 빌드
npm run build

# 프로덕션 실행
npm run start:prod

# 린트 검사
npm run lint

# 포맷팅
npm run format

# 테스트 (watch 모드)
npm run test:watch
```

## 환경 변수

`.env` 파일 설정:

```env
NODE_ENV=development
PORT=3000
DB_PATH=data/cto-game.db
```

## 다음 단계 (Phase 1)

- [ ] WebSocket 실시간 통신 추가
- [ ] Redis 캐싱 구현
- [ ] AWS Cognito 인증 연동
- [ ] Aurora MySQL 마이그레이션
- [ ] 도커라이즈 및 ECS 배포

## 라이선스

MIT
