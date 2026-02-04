# Skill: Release Check

**사용자**: QA AI, LiveOps AI
**목적**: 릴리즈 전 최종 검증 체크리스트를 실행하고 배포 준비 상태를 확인한다.

---

## 입력

- **QA AI의 Test Plan** (테스트 결과)
- **Server/Client AI의 Implementation Plan** (배포 대상)
- `.ai/context/release-rules.md` - 릴리즈 규칙
- **Git commit history** (변경 사항)

---

## 출력

- **Release Checklist 문서** (`docs/releases/RELEASE-{버전}-checklist.md`)
- 템플릿: `.ai/templates/release-template.md`
- **Release Note** (`docs/releases/RELEASE-{버전}-notes.md`)

---

## 절차

### Step 1: 변경 사항 확인

1. **Git diff** 분석
2. **변경된 파일** 목록 작성
3. **Breaking Changes** 여부 확인

**예시**:
```markdown
## 변경 사항

### Backend
- `src/event/` - 새로운 이벤트 시스템 추가
- `src/database/entities/` - DynamicEvent, EventHistory 엔티티 추가
- `src/database/migrations/` - 테이블 생성 마이그레이션

### Frontend
- `components/EventPopup/` - 이벤트 팝업 UI 추가
- `store/eventSlice.ts` - 이벤트 상태 관리 추가

### 영향 범위
- **Breaking Changes**: None
- **API 변경**: 새로운 엔드포인트 추가 (기존 API 변경 없음)
- **DB 마이그레이션**: Yes (새 테이블 생성)
```

---

### Step 2: 기능 검증

Test Plan의 모든 테스트가 통과했는지 확인한다.

```markdown
## 기능 검증

### Unit Tests
- [ ] EventService: 8/8 tests passed ✅
- [ ] EventMatcherService: 5/5 tests passed ✅
- [ ] GameService (회귀): 11/11 tests passed ✅
- **Total Coverage**: 85.3% (목표: 80%+) ✅

### Integration Tests
- [ ] POST /api/event/trigger - 정상 케이스 ✅
- [ ] POST /api/event/trigger - 404 에러 ✅
- [ ] POST /api/event/trigger - 409 중복 에러 ✅
- [ ] GET /api/event/history - 정상 조회 ✅

### E2E Tests
- [ ] 이벤트 팝업 표시 및 선택 ✅
- [ ] 게임 상태 업데이트 ✅
- [ ] 모바일 반응형 확인 ✅

### 회귀 테스트
- [ ] 기존 게임 생성 플로우 ✅
- [ ] 기존 턴 진행 플로우 ✅
- [ ] 선택지 실행 플로우 ✅
- [ ] 리더보드 조회 ✅
```

---

### Step 3: 성능 검증

성능 기준을 충족하는지 확인한다.

```markdown
## 성능 검증

### API Response Time (k6 부하 테스트)
- **p50**: 85ms ✅ (목표: < 100ms)
- **p95**: 178ms ✅ (목표: < 200ms)
- **p99**: 245ms ⚠️ (목표: < 300ms, 근접)

### 동시 접속
- **100 concurrent users**: 정상 처리 ✅
- **Error rate**: 0.1% ✅ (목표: < 1%)

### Database Performance
- **Query time (avg)**: 28ms ✅ (목표: < 50ms)
- **Connection pool**: 12/50 사용 중 ✅

### Frontend Bundle Size
- **Main bundle**: 245KB (gzipped) ✅
- **Lazy-loaded chunks**: EventPopup 32KB ✅

### 결론
- ✅ 모든 성능 기준 충족
- ⚠️ p99는 목표치에 근접하나 허용 범위 내
```

---

### Step 4: 보안 검증

보안 체크리스트를 실행한다.

```markdown
## 보안 검증

### Input Validation
- [ ] DTO validation (class-validator) 적용 ✅
- [ ] UUID format 검증 ✅
- [ ] turnNumber 범위 검증 (1-25) ✅

### SQL Injection 방어
- [ ] TypeORM parameterized queries 사용 ✅
- [ ] 직접 SQL 실행 없음 ✅

### XSS 방어
- [ ] 사용자 입력 sanitization ✅
- [ ] React의 자동 escaping 활용 ✅

### CSRF (Phase 1+)
- [ ] N/A (Phase 0에서는 미적용)

### Rate Limiting (Phase 1+)
- [ ] N/A (Phase 0에서는 미적용)

### 인증/인가 (Phase 1+)
- [ ] N/A (Phase 0에서는 미적용)

### 환경 변수 보안
- [ ] .env 파일 .gitignore 등록 ✅
- [ ] API keys 노출 없음 ✅

### 결론
- ✅ Phase 0 보안 기준 충족
- ℹ️ Phase 1에서 인증/인가 추가 예정
```

---

### Step 5: DB 마이그레이션 검증

마이그레이션이 안전한지 확인한다.

```markdown
## DB 마이그레이션 검증

### Migration Files
- [ ] `1707000000000-CreateDynamicEventTable.ts` ✅
- [ ] `1707000000001-CreateEventHistoryTable.ts` ✅

### Up Migration Test (개발 환경)
```bash
$ npm run migration:run
✅ CreateDynamicEventTable executed successfully
✅ CreateEventHistoryTable executed successfully
```

### Down Migration Test (Rollback)
```bash
$ npm run migration:revert
✅ CreateEventHistoryTable reverted successfully
✅ CreateDynamicEventTable reverted successfully
```

### 데이터 무결성
- [ ] Foreign key constraints 확인 ✅
- [ ] Unique constraints 확인 (gameId + turnNumber) ✅
- [ ] 인덱스 생성 확인 ✅

### 백업 계획
- [ ] 프로덕션 DB 백업 완료 ✅
- [ ] 롤백 스크립트 준비 ✅

### 결론
- ✅ 마이그레이션 안전성 검증 완료
- ✅ 롤백 가능성 확인
```

---

### Step 6: 배포 준비 상태 확인

인프라 및 배포 설정을 확인한다.

```markdown
## 배포 준비 상태

### 빌드 검증
```bash
# Backend
$ cd backend && npm run build
✅ Build completed successfully

# Frontend
$ cd frontend && npm run build
✅ Build completed successfully
```

### 환경 변수
- [ ] `.env.production` 설정 확인 ✅
- [ ] DATABASE_URL 설정 ✅
- [ ] API_BASE_URL 설정 ✅

### Dependencies
- [ ] `npm audit` 실행 - 0 vulnerabilities ✅
- [ ] Outdated packages 확인 - 모두 최신 ✅

### 문서
- [ ] API 문서 (Swagger) 업데이트 ✅
- [ ] README 업데이트 ✅
- [ ] CHANGELOG 업데이트 ✅

### Git
- [ ] 모든 변경사항 커밋됨 ✅
- [ ] 브랜치: `feature/event-system` → `main` merge 준비 ✅
- [ ] Git tag: `v0.2.0` 생성 예정 ✅

### 결론
- ✅ 배포 준비 완료
```

---

### Step 7: 릴리즈 게이트 검증

모든 품질 게이트를 통과했는지 최종 확인한다.

```markdown
## 릴리즈 게이트 검증

### Phase 0 기준

#### 필수 (Must-Have)
- [ ] ✅ Unit Test Coverage > 70% (실제: 85.3%)
- [ ] ✅ Critical Bugs = 0
- [ ] ✅ API Response < 300ms (p95: 178ms)
- [ ] ✅ 모든 기능 테스트 통과
- [ ] ✅ 회귀 테스트 통과
- [ ] ✅ 보안 체크리스트 통과
- [ ] ✅ DB 마이그레이션 검증 완료

#### 권장 (Should-Have)
- [ ] ✅ Integration Test 커버리지 > 50%
- [ ] ✅ E2E Test 핵심 플로우 커버
- [ ] ✅ 문서 업데이트
- [ ] ✅ 코드 리뷰 완료

#### 선택 (Nice-to-Have)
- [ ] ⬜ 성능 프로파일링
- [ ] ⬜ 접근성(a11y) 검증
- [ ] ⬜ i18n 적용

### 블로커 (Blocker)
- ❌ None

### 결론
- ✅ **모든 필수 게이트 통과**
- ✅ **릴리즈 승인 가능**
```

---

### Step 8: 릴리즈 노트 작성

사용자 및 개발팀을 위한 릴리즈 노트를 작성한다.

```markdown
# Release v0.2.0 - 동적 이벤트 시스템

**릴리즈 날짜**: 2026-02-05
**릴리즈 타입**: Minor Release (기능 추가)

---

## 🎉 새로운 기능 (New Features)

### 동적 이벤트 시스템
- 게임 진행 중 특정 조건에서 랜덤 이벤트가 발생합니다
- 이벤트는 플레이어의 게임 상태(cash, users, infrastructure)에 따라 발생합니다
- 각 이벤트는 3개의 선택지를 제공하며, 선택에 따라 게임 상태가 변경됩니다

**주요 특징**:
- 30% 기본 확률로 이벤트 발생 (조건 충족 시 확률 증가)
- 같은 이벤트가 연속으로 발생하지 않음
- 이벤트 히스토리 저장 및 조회 가능

---

## 🔧 개선 사항 (Improvements)

- 게임 리플레이 가치 향상 (예측 가능성 감소)
- 플레이어 의사결정 깊이 증가

---

## 🐛 버그 수정 (Bug Fixes)

- None (신규 기능 릴리즈)

---

## 📊 API 변경사항 (API Changes)

### 새로운 엔드포인트

#### POST /api/event/trigger
이벤트를 트리거합니다.

**Request**:
```json
{
  "gameId": "uuid",
  "turnNumber": 10
}
```

**Response**:
```json
{
  "eventId": "uuid",
  "eventText": "대형 투자자가 관심을 보이고 있습니다.",
  "choices": [...]
}
```

#### GET /api/event/history/:gameId
게임의 이벤트 히스토리를 조회합니다.

**Response**:
```json
{
  "events": [
    {
      "eventId": "uuid",
      "turnNumber": 10,
      "selectedChoiceId": "uuid",
      "triggeredAt": "2026-02-05T10:00:00Z"
    }
  ]
}
```

---

## 🗄️ DB 마이그레이션 (Database Changes)

### 새로운 테이블
- `dynamic_events`: 이벤트 정의 저장
- `event_history`: 이벤트 발생 이력 저장

### 마이그레이션 실행 방법
```bash
npm run migration:run
```

### 롤백 방법 (필요 시)
```bash
npm run migration:revert
```

---

## ⚠️ Breaking Changes

- None (기존 API 호환성 유지)

---

## 📈 성능 지표

- API Response Time (p95): 178ms
- Unit Test Coverage: 85.3%
- E2E Test Coverage: 핵심 플로우 100%

---

## 🔐 보안 업데이트

- DTO validation 강화 (turnNumber 범위 검증)
- SQL Injection 방어 (TypeORM parameterized queries)

---

## 📚 문서 업데이트

- Swagger API 문서 업데이트
- 이벤트 시스템 설계 문서 추가 (`backend/docs/event-system-design.md`)

---

## 🛠️ 개발자 노트

### 기술 스택
- NestJS event module
- TypeORM entities: DynamicEvent, EventHistory
- Frontend: EventPopup component (React + Redux)

### 알려진 제한사항
- Phase 0에서는 기본 이벤트만 지원 (LLM 생성 이벤트는 Phase 1+)
- 이벤트 선택 타임아웃 기능은 Phase 1에 추가 예정

---

## 🚀 다음 단계 (Roadmap)

- Phase 1: LLM 기반 동적 이벤트 생성
- Phase 1: 이벤트 선택 타임아웃 구현
- Phase 1: 이벤트 효과 애니메이션 개선

---

**Contributors**: Backend Team, Frontend Team, QA Team
**Reviewed by**: Tech Lead, QA Lead
**Approved by**: PO
```

---

### Step 9: 롤백 계획 수립

문제 발생 시 롤백 절차를 명시한다.

```markdown
## 롤백 계획

### 롤백 조건 (Rollback Triggers)
1. **Critical**: 5xx error rate > 5% for 3min
2. **Critical**: 게임 진행 불가 (턴 진행 실패)
3. **High**: p95 latency > 1000ms for 10min
4. **High**: DB 마이그레이션 실패

---

### 롤백 절차

#### Step 1: 즉시 조치 (5분 이내)
```bash
# Git revert
git revert HEAD
git push origin main

# 또는 이전 버전으로 롤백
git reset --hard v0.1.0
git push -f origin main
```

#### Step 2: DB 롤백 (10분 이내)
```bash
# TypeORM migration revert
npm run migration:revert
```

#### Step 3: 서비스 재시작
```bash
# Backend restart
pm2 restart backend

# Frontend redeploy
npm run build
pm2 restart frontend
```

#### Step 4: 검증
- [ ] 기존 게임 플로우 정상 작동 확인
- [ ] 에러율 정상 (<0.1%)
- [ ] 응답 시간 정상 (<200ms p95)

---

### 롤백 후 조치
1. 장애 원인 분석 (Root Cause Analysis)
2. 사후 보고서 작성 (Post-Mortem)
3. 재발 방지 대책 수립
```

---

## 품질 체크

작성한 Release Checklist가 아래 기준을 충족하는지 확인한다:

- [ ] 모든 테스트가 통과했는가?
- [ ] 성능 기준을 충족하는가?
- [ ] 보안 체크리스트를 완료했는가?
- [ ] DB 마이그레이션이 검증되었는가?
- [ ] 릴리즈 노트가 작성되었는가?
- [ ] 롤백 계획이 준비되었는가?
- [ ] Critical Blocker가 없는가?

---

## 최종 승인

```markdown
## 승인 서명

### QA Lead
- **이름**: {이름}
- **승인 날짜**: {날짜}
- **코멘트**: 모든 테스트 통과, 릴리즈 승인

### Tech Lead
- **이름**: {이름}
- **승인 날짜**: {날짜}
- **코멘트**: 아키텍처 및 코드 품질 검증 완료

### PO/PM
- **이름**: {이름}
- **승인 날짜**: {날짜}
- **코멘트**: 비즈니스 요구사항 충족, 릴리즈 승인

---

**릴리즈 상태**: ✅ Approved / ⬜ Pending / ❌ Rejected
**예정 배포 시간**: 2026-02-05 10:00 AM (KST)
```

---

## 안티 패턴 (하지 말 것)

❌ **테스트 없이 릴리즈**
→ 모든 테스트 통과 필수

❌ **롤백 계획 없이 배포**
→ 문제 발생 시 대응 불가

❌ **성능/보안 검증 생략**
→ 프로덕션 장애 위험

❌ **릴리즈 노트 생략**
→ 팀 커뮤니케이션 실패

❌ **승인 없이 배포**
→ 거버넌스 위반

---

**문서 버전**: v1.0
**최종 업데이트**: 2026-02-04
