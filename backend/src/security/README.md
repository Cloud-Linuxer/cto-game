# Security Module

이벤트 시스템 및 전반적인 애플리케이션 보안 강화를 위한 모듈입니다.

## 개요

이 모듈은 게임 이벤트 시스템의 보안을 강화하기 위한 4가지 핵심 서비스를 제공합니다.

- **SecureRandomService**: 암호학적으로 안전한 난수 생성
- **EventStateValidatorService**: 게임 상태 무결성 검증
- **EventGuardService**: 이벤트 실행 권한 및 속도 제한
- **InputSanitizerService**: 입력 데이터 정제 및 XSS 방지

## 설치 및 사용

### 모듈 임포트

```typescript
import { Module } from '@nestjs/common';
import { SecurityModule } from './security/security.module';

@Module({
  imports: [SecurityModule],
})
export class AppModule {}
```

### 서비스 사용

```typescript
import { Injectable } from '@nestjs/common';
import {
  SecureRandomService,
  EventStateValidatorService,
  EventGuardService,
  InputSanitizerService,
} from './security';

@Injectable()
export class EventService {
  constructor(
    private readonly secureRandom: SecureRandomService,
    private readonly validator: EventStateValidatorService,
    private readonly guard: EventGuardService,
    private readonly sanitizer: InputSanitizerService,
  ) {}

  async executeEvent(gameId: string, userId: string, game: Game) {
    // 1. 권한 검증
    await this.guard.checkEventPermission(gameId, userId, game);

    // 2. 상태 검증
    const validation = this.validator.validateGameState(game);
    if (!validation.isValid) {
      throw new BadRequestException(validation.errors.join(', '));
    }

    // 3. 시드 생성
    const seed = this.secureRandom.generateEventSeed(
      gameId,
      game.currentTurn,
      game.users,
      game.cash,
    );

    // 4. 입력 정제
    const safeText = this.sanitizer.sanitizeText(userInput);

    // ... 이벤트 실행 로직
  }
}
```

## 서비스 상세 설명

### 1. SecureRandomService

암호학적으로 안전한 난수 생성 서비스입니다. Node.js `crypto` 모듈 기반으로 예측 불가능한 난수를 생성합니다.

#### 주요 기능

**generateSecureInt(max: number): number**
- 0 이상 max 미만의 안전한 정수 생성
- Modulo bias 방지를 위한 rejection sampling 적용

```typescript
const randomIndex = this.secureRandom.generateSecureInt(100); // 0~99
```

**generateEventSeed(gameId, turn, users, cash): string**
- 게임 상태 기반 256비트 시드 생성
- 타임스탬프 + 나노초 정밀도 + 암호학적 솔트 결합
- 동일 상태에서도 재현 불가능한 시드 보장

```typescript
const seed = this.secureRandom.generateEventSeed('game-123', 5, 1000, 50000000);
// 출력: 'a3f5c7d9...' (64자 SHA-256 해시)
```

**selectWeightedIndex(seed, weights): number**
- 시드 기반 가중치 랜덤 선택
- 동일 시드에 대해 결정론적 선택 (테스트 가능)

```typescript
const weights = [10, 20, 30, 40]; // 비율: 10%, 20%, 30%, 40%
const index = this.secureRandom.selectWeightedIndex(seed, weights);
```

**generateSecureUUID(): string**
- RFC4122 표준 UUID v4 생성
- 암호학적으로 안전한 128비트 난수 기반

```typescript
const uuid = this.secureRandom.generateSecureUUID();
// 출력: '550e8400-e29b-41d4-a716-446655440000'
```

#### 보안 고려사항

- ⛔ Math.random() 사용 금지 → crypto.randomBytes() 사용
- ✅ Modulo bias 방지 (rejection sampling)
- ✅ 타임스탬프 기반 재현 방지
- ✅ 충분한 엔트로피 확보 (256비트 시드)

---

### 2. EventStateValidatorService

게임 상태의 무결성과 일관성을 검증하는 서비스입니다.

#### 주요 기능

**validateGameState(game: Game): ValidationResult**
- 게임 상태의 모든 필드 검증
- 범위 검증 (users, cash, trust, turn 등)
- 논리적 일관성 검증 (예: users > maxUserCapacity * 10 탐지)

```typescript
const result = this.validator.validateGameState(game);
if (!result.isValid) {
  console.error('검증 실패:', result.errors);
  throw new BadRequestException(result.errors.join(', '));
}
```

**validateStateTransition(before: Game, after: Game): ValidationResult**
- 이벤트 전후 상태 변화 검증
- 과도한 메트릭 변화 탐지 (단일 이벤트로 500만 유저 증가 등)
- 턴 진행 검증 (최대 5턴 점프 허용)
- 타임스탬프 역행 탐지

```typescript
const beforeState = cloneDeep(game);
// ... 이벤트 실행 ...
const result = this.validator.validateStateTransition(beforeState, game);
if (!result.isValid) {
  await this.rollbackGameState(beforeState);
  throw new BadRequestException('비정상적인 상태 변화 감지');
}
```

**generateStateHash(game: Game): string**
- 게임 상태의 SHA-256 해시 생성
- 무결성 검증용 체크섬

```typescript
const hashBefore = this.validator.generateStateHash(game);
// ... 데이터베이스 저장 ...
const hashAfter = this.validator.generateStateHash(loadedGame);
if (hashBefore !== hashAfter) {
  throw new Error('데이터 무결성 손상');
}
```

**canExecuteEvent(game: Game): ValidationResult**
- 이벤트 실행 가능 여부 사전 검증
- 게임 상태, 턴 범위, 파산 상태 확인

```typescript
const canExecute = this.validator.canExecuteEvent(game);
if (!canExecute.isValid) {
  throw new ForbiddenException(canExecute.errors.join(', '));
}
```

#### 검증 한계값

| 메트릭 | 최소값 | 최대값 |
|--------|--------|--------|
| users | 0 | 100,000,000 (1억) |
| cash | -100,000,000,000 (-1000억) | 1,000,000,000,000 (1조) |
| trust | 0 | 100 |
| currentTurn | 1 | 100 |
| infrastructure | - | 50개 |
| hiredStaff | - | 20명 |

#### 상태 전환 한계값

| 변화 메트릭 | 최대 변화량 |
|------------|-------------|
| 단일 이벤트 유저 변화 | 5,000,000 (500만) |
| 단일 이벤트 자금 변화 | 100,000,000,000 (1000억) |
| 단일 이벤트 신뢰도 변화 | 50 |
| 턴 진행 | 최대 5턴 점프 |

---

### 3. EventGuardService

이벤트 실행 권한 검증 및 비정상 패턴 탐지 서비스입니다.

#### 주요 기능

**checkEventPermission(gameId, userId, game): Promise<void>**
- 게임 상태 검증 (PLAYING 상태만 허용)
- 속도 제한 검증
- 사용자 권한 검증 (Phase 1+ Cognito 연동 시)

```typescript
await this.guard.checkEventPermission(gameId, userId, game);
// ForbiddenException 발생 가능
```

**checkRateLimit(gameId: string): Promise<void>**
- 분당 요청 제한 (60회/분)
- Burst 제한 (10초 내 10회)
- 최소 요청 간격 (100ms)

```typescript
await this.guard.checkRateLimit(gameId);
// 속도 제한 초과 시 ForbiddenException 발생
```

**detectAnomalousPattern(gameId, choiceId, turn): number**
- 동일 선택 연속 실행 탐지 (5회 이상)
- 급격한 턴 진행 탐지 (1분 내 20턴 이상)
- 턴 역행 탐지 (시간여행 공격)

```typescript
const anomalyScore = this.guard.detectAnomalousPattern(gameId, choiceId, turn);
if (anomalyScore > 50) {
  this.logger.warn(`높은 의심 점수: ${anomalyScore}/100`);
  // 추가 검증 또는 로깅
}
```

**cleanupStaleMetrics(): void**
- 24시간 이상 활동 없는 게임 메트릭 정리
- 메모리 관리 (주기적 호출 권장)

```typescript
// Cron job으로 매일 실행
@Cron('0 0 * * *') // 매일 자정
handleCron() {
  this.guard.cleanupStaleMetrics();
}
```

#### 속도 제한 설정

| 제한 종류 | 값 |
|----------|-----|
| 분당 최대 요청 | 60회 |
| 시간당 최대 요청 | 600회 |
| 최소 요청 간격 | 100ms |
| Burst 임계값 | 10초 내 10회 |

#### 비정상 패턴 임계값

| 패턴 | 임계값 |
|------|--------|
| 동일 선택 연속 실행 | 5회 |
| 1분 내 급격한 턴 진행 | 20턴 |
| 턴 역행 시도 | 3회 (이후 차단) |

---

### 4. InputSanitizerService

사용자 입력 및 템플릿 변수 정제 서비스입니다.

#### 주요 기능

**sanitizeText(input: string, allowHtml?: boolean): string**
- XSS 패턴 제거 (`<script>`, `javascript:`, `onclick=` 등)
- HTML 태그 제거 또는 화이트리스트 필터링
- 길이 제한 (10,000자)

```typescript
const userInput = '<script>alert("XSS")</script>안전한 텍스트';
const safe = this.sanitizer.sanitizeText(userInput);
// 출력: '안전한 텍스트'

const richText = '<p><strong>굵은 글씨</strong></p>';
const safeHtml = this.sanitizer.sanitizeText(richText, true);
// 출력: '<p><strong>굵은 글씨</strong></p>' (허용된 태그 유지)
```

**sanitizeTemplateVariables(variables: Record<string, any>): Record<string, string>**
- 템플릿 변수 이름 검증 (알파벳, 숫자, 언더스코어, 한글만 허용)
- 변수 값 정제 (XSS 제거)
- 타입별 처리 (number, string, boolean, array)

```typescript
const variables = {
  users: 1000,
  companyName: '<script>alert(1)</script>스타트업',
  features: ['기능1', '기능2'],
};

const safe = this.sanitizer.sanitizeTemplateVariables(variables);
// {
//   users: '1000',
//   companyName: '스타트업',
//   features: '기능1, 기능2'
// }
```

**sanitizeSqlParameter(input: string): string**
- SQL Injection 패턴 탐지 (`UNION SELECT`, `DROP TABLE` 등)
- 싱글쿼트 이스케이프

```typescript
const username = "O'Reilly";
const safe = this.sanitizer.sanitizeSqlParameter(username);
// 출력: "O''Reilly"

const malicious = "' OR '1'='1";
this.sanitizer.sanitizeSqlParameter(malicious);
// BadRequestException 발생
```

**sanitizeFilePath(input: string): string**
- Path Traversal 방지 (`../`, `..\\`)
- 절대 경로 금지
- 파일명 검증 (알파벳, 숫자, 언더스코어, 하이픈, 점만 허용)

```typescript
const path = '../../../etc/passwd';
this.sanitizer.sanitizeFilePath(path);
// BadRequestException 발생

const safe = this.sanitizer.sanitizeFilePath('uploads/docs/file.pdf');
// 출력: 'file.pdf'
```

**validateUUID(input: string): boolean**
- UUID v4 형식 검증

```typescript
const uuid = '550e8400-e29b-41d4-a716-446655440000';
this.sanitizer.validateUUID(uuid); // true

this.sanitizer.validateUUID('not-a-uuid'); // false
```

**sanitizeJson(input: string, maxDepth?: number): any**
- JSON 파싱 및 검증
- 크기 제한 (100KB)
- 중첩 깊이 제한 (기본 5단계)

```typescript
const json = '{"name": "테스트", "value": 123}';
const parsed = this.sanitizer.sanitizeJson(json);
// { name: '테스트', value: 123 }

const deepJson = '{"a":{"b":{"c":{"d":{"e":{"f":"too deep"}}}}}}';
this.sanitizer.sanitizeJson(deepJson, 5);
// BadRequestException 발생 (깊이 6 > 최대 5)
```

#### 허용된 HTML 태그 (화이트리스트)

- `<b>`, `<i>`, `<u>`: 기본 텍스트 스타일
- `<strong>`, `<em>`: 강조
- `<br>`, `<p>`, `<span>`: 레이아웃

#### XSS 방지 패턴

- `<script>` 태그
- `javascript:` 프로토콜
- 이벤트 핸들러 (`onclick=`, `onerror=` 등)
- `<iframe>`, `<object>`, `<embed>`, `<applet>` 태그
- `eval()`, `expression()` 함수

#### SQL Injection 방지 패턴

- `UNION SELECT`
- `DROP TABLE`
- `DELETE FROM`
- `INSERT INTO`
- `UPDATE SET`
- SQL 주석 (`--`, `#`, `/* */`)
- Tautology 패턴 (`OR 1=1`)

---

## 사용 예시

### 이벤트 실행 플로우 (완전한 보안 적용)

```typescript
@Injectable()
export class EventService {
  constructor(
    private readonly secureRandom: SecureRandomService,
    private readonly validator: EventStateValidatorService,
    private readonly guard: EventGuardService,
    private readonly sanitizer: InputSanitizerService,
    private readonly gameRepository: Repository<Game>,
  ) {}

  async executeRandomEvent(
    gameId: string,
    userId: string,
  ): Promise<EventResult> {
    // 1. 게임 로드
    const game = await this.gameRepository.findOne({ where: { gameId } });
    if (!game) {
      throw new NotFoundException('게임을 찾을 수 없습니다');
    }

    // 2. 권한 및 속도 제한 검증
    await this.guard.checkEventPermission(gameId, userId, game);

    // 3. 게임 상태 검증
    const stateValidation = this.validator.validateGameState(game);
    if (!stateValidation.isValid) {
      throw new BadRequestException(
        `게임 상태 오류: ${stateValidation.errors.join(', ')}`,
      );
    }

    // 4. 이벤트 실행 가능 여부 확인
    const canExecute = this.validator.canExecuteEvent(game);
    if (!canExecute.isValid) {
      throw new ForbiddenException(
        `이벤트 실행 불가: ${canExecute.errors.join(', ')}`,
      );
    }

    // 5. 상태 스냅샷 (롤백용)
    const stateHashBefore = this.validator.generateStateHash(game);
    const gameStateBefore = cloneDeep(game);

    try {
      // 6. 암호학적 시드 생성
      const seed = this.secureRandom.generateEventSeed(
        gameId,
        game.currentTurn,
        game.users,
        game.cash,
      );

      // 7. 가중치 기반 이벤트 선택
      const eventWeights = [30, 25, 20, 15, 10]; // 5개 이벤트
      const eventIndex = this.secureRandom.selectWeightedIndex(seed, eventWeights);

      // 8. 이벤트 데이터 가져오기
      const event = await this.getEventByIndex(eventIndex);

      // 9. 템플릿 변수 정제
      const variables = this.sanitizer.sanitizeTemplateVariables({
        users: game.users,
        cash: game.cash,
        companyName: game.companyName,
      });

      // 10. 이벤트 텍스트 렌더링
      const eventText = this.renderTemplate(event.template, variables);

      // 11. 이벤트 효과 적용
      game.users += event.effects.users;
      game.cash += event.effects.cash;
      game.trust += event.effects.trust;
      game.currentTurn++;

      // 12. 상태 전환 검증
      const transitionValidation = this.validator.validateStateTransition(
        gameStateBefore,
        game,
      );
      if (!transitionValidation.isValid) {
        throw new Error(
          `비정상적인 상태 변화: ${transitionValidation.errors.join(', ')}`,
        );
      }

      // 13. 비정상 패턴 탐지
      const anomalyScore = this.guard.detectAnomalousPattern(
        gameId,
        eventIndex,
        game.currentTurn,
      );
      if (anomalyScore > 70) {
        this.logger.warn(
          `높은 비정상 점수 감지: ${anomalyScore}/100 (game: ${gameId})`,
        );
      }

      // 14. 게임 상태 저장
      await this.gameRepository.save(game);

      // 15. 결과 반환
      return {
        eventText: this.sanitizer.sanitizeText(eventText, true),
        effects: event.effects,
        anomalyScore,
      };
    } catch (error) {
      // 롤백
      this.logger.error(`이벤트 실행 실패, 롤백: ${error.message}`);
      await this.gameRepository.save(gameStateBefore);
      throw error;
    }
  }
}
```

---

## 테스트

각 서비스는 완전한 단위 테스트를 포함합니다.

```bash
# 전체 테스트 실행
npm test -- src/security

# 개별 서비스 테스트
npm test -- secure-random.service.spec.ts
npm test -- event-state-validator.service.spec.ts
npm test -- event-guard.service.spec.ts
npm test -- input-sanitizer.service.spec.ts

# 커버리지 확인
npm test -- --coverage src/security
```

### 테스트 커버리지 목표

- ✅ Statements: > 90%
- ✅ Branches: > 85%
- ✅ Functions: > 90%
- ✅ Lines: > 90%

---

## 보안 모범 사례

### 1. 난수 생성

❌ **나쁜 예:**
```typescript
const random = Math.random() * 100; // 예측 가능
const seed = `${gameId}-${turn}`; // 재현 가능
```

✅ **좋은 예:**
```typescript
const random = this.secureRandom.generateSecureInt(100);
const seed = this.secureRandom.generateEventSeed(gameId, turn, users, cash);
```

### 2. 상태 검증

❌ **나쁜 예:**
```typescript
if (game.users < 0) {
  throw new Error('유저 수 음수');
}
// 다른 필드 검증 누락
```

✅ **좋은 예:**
```typescript
const validation = this.validator.validateGameState(game);
if (!validation.isValid) {
  throw new BadRequestException(validation.errors.join(', '));
}
```

### 3. 속도 제한

❌ **나쁜 예:**
```typescript
// 속도 제한 없음 → DDoS 취약
await this.executeEvent(gameId);
```

✅ **좋은 예:**
```typescript
await this.guard.checkEventPermission(gameId, userId, game);
await this.executeEvent(gameId);
```

### 4. 입력 정제

❌ **나쁜 예:**
```typescript
const message = `환영합니다, ${userInput}님!`; // XSS 취약
```

✅ **좋은 예:**
```typescript
const safeName = this.sanitizer.sanitizeText(userInput);
const message = `환영합니다, ${safeName}님!`;
```

---

## 로깅 및 모니터링

### 로그 레벨

- **ERROR**: 보안 위협 탐지 (SQL Injection, Path Traversal 등)
- **WARN**: 속도 제한 위반, 비정상 패턴, 상태 검증 실패
- **DEBUG**: 시드 생성, 해시 계산, 메트릭 초기화
- **VERBOSE**: 각 검증 단계 통과, 난수 생성 세부사항

### 모니터링 메트릭

다음 메트릭을 CloudWatch 또는 Datadog으로 전송 권장:

```typescript
// 속도 제한 위반 횟수
cloudwatch.putMetric('RateLimitViolations', count);

// 비정상 패턴 탐지 횟수
cloudwatch.putMetric('AnomalyDetections', count);

// 상태 검증 실패 횟수
cloudwatch.putMetric('StateValidationFailures', count);

// XSS 시도 탐지 횟수
cloudwatch.putMetric('XSSAttempts', count);
```

---

## FAQ

### Q1: 왜 Math.random()을 사용하면 안 되나요?

Math.random()은 예측 가능한 PRNG(Pseudo-Random Number Generator)입니다. 공격자가 패턴을 분석하여 다음 난수를 예측할 수 있습니다. `crypto.randomBytes()`는 운영체제의 CSPRNG(Cryptographically Secure PRNG)를 사용하여 예측 불가능합니다.

### Q2: 속도 제한은 왜 필요한가요?

속도 제한 없이는 공격자가 자동화된 스크립트로 초당 수천 번의 요청을 보내 서버를 마비시키거나(DDoS), 게임 상태를 빠르게 조작할 수 있습니다.

### Q3: 상태 해시는 어떻게 활용하나요?

상태 해시는 게임 상태의 "지문"입니다. 데이터베이스 저장 전후 해시를 비교하여 데이터 손상을 탐지하거나, 클라이언트-서버 간 상태 동기화 검증에 사용할 수 있습니다.

### Q4: XSS 방지만으로 충분한가요?

아니요. 이 모듈은 XSS, SQL Injection, Path Traversal, Command Injection, DoS 등 다양한 공격을 방어합니다. 하지만 HTTPS, CORS, CSP, Rate Limiting 등 인프라 수준의 보안도 함께 적용해야 합니다.

### Q5: 프로덕션 배포 전 체크리스트는?

- ✅ 모든 사용자 입력에 `sanitizeText()` 적용
- ✅ 모든 이벤트 실행에 `checkEventPermission()` 적용
- ✅ 모든 상태 변경에 `validateStateTransition()` 적용
- ✅ 모든 난수 생성에 `SecureRandomService` 사용
- ✅ HTTPS 활성화 (TLS 1.2+)
- ✅ CORS 정책 설정
- ✅ Rate Limiting 활성화 (NestJS Throttler 또는 WAF)
- ✅ 보안 헤더 설정 (helmet.js)
- ✅ 정기적인 보안 로그 모니터링

---

## 라이선스

이 모듈은 프로젝트의 메인 라이선스를 따릅니다.

## 기여

보안 취약점을 발견하면 공개 이슈 대신 비공개로 보고해 주세요.

