# RELEASE v{버전} - Checklist

**릴리즈 날짜**: {날짜}
**릴리즈 타입**: Major / Minor / Patch
**관련 EPIC**: EPIC-{번호}

---

## 변경 사항

### 새로운 기능 (New Features)
- {기능 1}
- {기능 2}
- {기능 3}

### 개선 사항 (Improvements)
- {개선 1}
- {개선 2}

### 버그 수정 (Bug Fixes)
- {버그 1}
- {버그 2}

---

## 기능 검증

### Unit Tests
- [ ] {ServiceName}: {숫자}/{숫자} tests passed ✅/❌
- [ ] {ComponentName}: {숫자}/{숫자} tests passed ✅/❌
- [ ] **Total Coverage**: {숫자}% (목표: 80%+) ✅/❌

### Integration Tests
- [ ] POST /api/{endpoint} - 정상 케이스 ✅/❌
- [ ] POST /api/{endpoint} - 에러 케이스 ✅/❌
- [ ] GET /api/{endpoint} - 정상 조회 ✅/❌

### E2E Tests
- [ ] {핵심 플로우 1} ✅/❌
- [ ] {핵심 플로우 2} ✅/❌
- [ ] 모바일 반응형 확인 ✅/❌

### 회귀 테스트
- [ ] {기존 기능 1} ✅/❌
- [ ] {기존 기능 2} ✅/❌
- [ ] {기존 기능 3} ✅/❌

---

## 성능 검증

### API Response Time (부하 테스트)
- **p50**: {숫자}ms ✅/⚠️/❌ (목표: < {목표}ms)
- **p95**: {숫자}ms ✅/⚠️/❌ (목표: < {목표}ms)
- **p99**: {숫자}ms ✅/⚠️/❌ (목표: < {목표}ms)

### 동시 접속
- **{동시 사용자 수} concurrent users**: 정상 처리 ✅/❌
- **Error rate**: {숫자}% ✅/❌ (목표: < 1%)

### Database Performance
- **Query time (avg)**: {숫자}ms ✅/❌ (목표: < {목표}ms)
- **Connection pool**: {사용}/{전체} ✅/❌

### Frontend Bundle Size
- **Main bundle**: {숫자}KB (gzipped) ✅/❌
- **Lazy-loaded chunks**: {리스트} ✅/❌

### 결론
- ✅ 모든 성능 기준 충족
- ⚠️ {항목}은 목표치에 근접하나 허용 범위 내
- ❌ {항목}이 기준 미달 - 릴리즈 보류

---

## 보안 검증

### Input Validation
- [ ] DTO validation 적용 ✅/❌
- [ ] {타입} format 검증 ✅/❌
- [ ] {파라미터} 범위 검증 ✅/❌

### SQL Injection 방어
- [ ] Parameterized queries 사용 ✅/❌
- [ ] 직접 SQL 실행 없음 ✅/❌

### XSS 방어
- [ ] 사용자 입력 sanitization ✅/❌
- [ ] {프레임워크} 자동 escaping 활용 ✅/❌

### CSRF (Phase 1+)
- [ ] CSRF 토큰 적용 ✅/❌/N/A

### Rate Limiting (Phase 1+)
- [ ] API Rate Limiting 설정 ✅/❌/N/A

### 인증/인가 (Phase 1+)
- [ ] JWT 토큰 검증 ✅/❌/N/A
- [ ] Role-based access control ✅/❌/N/A

### 환경 변수 보안
- [ ] .env 파일 .gitignore 등록 ✅/❌
- [ ] API keys 노출 없음 ✅/❌

### 결론
- ✅ Phase {숫자} 보안 기준 충족
- ℹ️ Phase {숫자}에서 {기능} 추가 예정

---

## DB 마이그레이션 검증

### Migration Files
- [ ] `{timestamp}-{description}.ts` ✅/❌
- [ ] `{timestamp}-{description}.ts` ✅/❌

### Up Migration Test (개발 환경)
```bash
$ npm run migration:run
✅/❌ {MigrationName} executed successfully
✅/❌ {MigrationName} executed successfully
```

### Down Migration Test (Rollback)
```bash
$ npm run migration:revert
✅/❌ {MigrationName} reverted successfully
✅/❌ {MigrationName} reverted successfully
```

### 데이터 무결성
- [ ] Foreign key constraints 확인 ✅/❌
- [ ] Unique constraints 확인 ✅/❌
- [ ] 인덱스 생성 확인 ✅/❌

### 백업 계획
- [ ] 프로덕션 DB 백업 완료 ✅/❌
- [ ] 롤백 스크립트 준비 ✅/❌

### 결론
- ✅ 마이그레이션 안전성 검증 완료
- ✅ 롤백 가능성 확인

---

## 배포 준비 상태

### 빌드 검증
```bash
# Backend
$ cd backend && npm run build
✅/❌ Build completed successfully

# Frontend
$ cd frontend && npm run build
✅/❌ Build completed successfully
```

### 환경 변수
- [ ] `.env.production` 설정 확인 ✅/❌
- [ ] DATABASE_URL 설정 ✅/❌
- [ ] API_BASE_URL 설정 ✅/❌

### Dependencies
- [ ] `npm audit` 실행 - {숫자} vulnerabilities ✅/❌
- [ ] Outdated packages 확인 ✅/❌

### 문서
- [ ] API 문서 (Swagger) 업데이트 ✅/❌
- [ ] README 업데이트 ✅/❌
- [ ] CHANGELOG 업데이트 ✅/❌

### Git
- [ ] 모든 변경사항 커밋됨 ✅/❌
- [ ] 브랜치: `{branch}` → `{target}` merge 준비 ✅/❌
- [ ] Git tag: `v{버전}` 생성 예정 ✅/❌

### 결론
- ✅ 배포 준비 완료
- ❌ {항목} 미완료 - 배포 보류

---

## 릴리즈 게이트 검증

### Phase {숫자} 기준

#### 필수 (Must-Have)
- [ ] ✅/❌ Unit Test Coverage > {목표}% (실제: {숫자}%)
- [ ] ✅/❌ Critical Bugs = 0
- [ ] ✅/❌ API Response < {목표}ms (p95: {숫자}ms)
- [ ] ✅/❌ 모든 기능 테스트 통과
- [ ] ✅/❌ 회귀 테스트 통과
- [ ] ✅/❌ 보안 체크리스트 통과
- [ ] ✅/❌ DB 마이그레이션 검증 완료

#### 권장 (Should-Have)
- [ ] ✅/❌ Integration Test 커버리지 > {목표}%
- [ ] ✅/❌ E2E Test 핵심 플로우 커버
- [ ] ✅/❌ 문서 업데이트
- [ ] ✅/❌ 코드 리뷰 완료

#### 선택 (Nice-to-Have)
- [ ] ⬜ 성능 프로파일링
- [ ] ⬜ 접근성(a11y) 검증
- [ ] ⬜ i18n 적용

### 블로커 (Blocker)
- ❌ {블로커 1}: {설명}
- ❌ {블로커 2}: {설명}

### 결론
- ✅ **모든 필수 게이트 통과 - 릴리즈 승인 가능**
- ⚠️ **{항목} 보류 - 조건부 승인**
- ❌ **블로커 존재 - 릴리즈 불가**

---

## API 변경사항

### 새로운 엔드포인트

#### {HTTP Method} /api/{endpoint}
{설명}

**Request**:
```json
{
  "{field}": "{type}"
}
```

**Response**:
```json
{
  "{field}": "{type}"
}
```

### 변경된 엔드포인트

#### {HTTP Method} /api/{endpoint}
**변경 내용**: {설명}

**이전**:
```json
{ "{oldField}": "{type}" }
```

**이후**:
```json
{ "{newField}": "{type}" }
```

### Breaking Changes

- ❌ None (기존 API 호환성 유지)
- ⚠️ {변경 사항}: {마이그레이션 가이드}

---

## DB 마이그레이션

### 새로운 테이블
- `{table_name}`: {설명}

### 변경된 테이블
- `{table_name}`: {변경 내용}

### 마이그레이션 실행 방법
```bash
npm run migration:run
```

### 롤백 방법 (필요 시)
```bash
npm run migration:revert
```

---

## 롤백 계획

### 롤백 조건 (Rollback Triggers)
1. **Critical**: {조건 1}
2. **Critical**: {조건 2}
3. **High**: {조건 3}

---

### 롤백 절차

#### Step 1: 즉시 조치 (5분 이내)
```bash
# Git revert
git revert HEAD
git push origin main

# 또는 이전 버전으로 롤백
git reset --hard v{이전 버전}
git push -f origin main
```

#### Step 2: DB 롤백 (10분 이내)
```bash
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
- [ ] 기존 기능 정상 작동 확인
- [ ] 에러율 정상 (<0.1%)
- [ ] 응답 시간 정상 (<{목표}ms p95)

---

### 롤백 후 조치
1. 장애 원인 분석 (Root Cause Analysis)
2. 사후 보고서 작성 (Post-Mortem)
3. 재발 방지 대책 수립

---

## 릴리즈 노트

{별도 파일: RELEASE-v{버전}-notes.md 참조}

---

## 최종 승인

### QA Lead
- **이름**: {이름}
- **승인 날짜**: {날짜}
- **코멘트**: {코멘트}
- **승인**: ✅ Approved / ⬜ Pending / ❌ Rejected

### Tech Lead
- **이름**: {이름}
- **승인 날짜**: {날짜}
- **코멘트**: {코멘트}
- **승인**: ✅ Approved / ⬜ Pending / ❌ Rejected

### PO/PM
- **이름**: {이름}
- **승인 날짜**: {날짜}
- **코멘트**: {코멘트}
- **승인**: ✅ Approved / ⬜ Pending / ❌ Rejected

---

**릴리즈 상태**: ✅ Approved / ⬜ Pending / ❌ Rejected
**예정 배포 시간**: {날짜} {시간} (KST)

---

**작성자**: QA AI / LiveOps AI
**작성일**: {날짜}
**최종 업데이트**: {날짜}
