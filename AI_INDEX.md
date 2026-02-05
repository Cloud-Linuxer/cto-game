# AI Squad Index - AWS 스타트업 타이쿤

> **이 문서는 AI 에이전트의 지도입니다.**
> 내용을 직접 쓰지 말고, "어디에 무엇이 있는지"만 정의합니다.

---

## 프로젝트 개요
- **게임명**: AWS 스타트업 타이쿤 (AWS Startup Tycoon)
- **장르**: 텍스트 기반 비즈니스 시뮬레이션
- **핵심**: 비즈니스 의사결정 + AWS 인프라 설계의 결합
- **현재 단계**: Phase 0 완료 (Backend MVP), Phase 1 진행 중 (Frontend + 고급 기능)

---

## 역할 정의 (Roles)

각 AI 에이전트의 책임과 산출물이 정의되어 있습니다.

| 역할 | 문서 | 주요 책임 |
|------|------|----------|
| Producer | `.ai/roles/producer.md` | 에픽 분해, 일정 설계, 의존성 관리, 릴리즈 전략 |
| Designer | `.ai/roles/designer.md` | 게임 시스템 설계, 밸런스 조정, GDD 작성 |
| Client Dev | `.ai/roles/client.md` | Frontend 아키텍처, UI/UX 구현, 클라이언트 최적화 |
| Server Dev | `.ai/roles/server.md` | Backend API 설계, DB 스키마, 보안, 성능 |
| QA | `.ai/roles/qa.md` | 테스트 계획, 품질 게이트, 회귀 테스트, 릴리즈 체크리스트 |
| LiveOps | `.ai/roles/liveops.md` | 모니터링, 알람, 핫픽스, 운영 이슈 대응 |

---

## 컨텍스트 (Context)

게임의 핵심 지식이 저장되어 있습니다. AI는 이 문서들을 참조하여 작업합니다.

### 게임 비전 및 설계
- **비전**: `.ai/context/vision.md` - 게임의 목적, 타겟 유저, 핵심 가치
- **GDD**: `.ai/context/gdd.md` - 게임 디자인 문서 (시스템, 메커니즘, 진행 구조)
- **경제 시스템**: `.ai/context/economy.md` - 자원 관리, 밸런스, 수치 모델
- **콘텐츠**: `.ai/context/content/` - 턴별 이벤트, 선택지, 스토리 텍스트

### 기술 사양
- **API 스펙**: `.ai/context/specs/api-spec.md` - REST API 엔드포인트 정의
- **이벤트 시스템**: `.ai/context/specs/event-spec.md` - 이벤트 구조 및 트리거 조건
- **데이터 스키마**: `.ai/context/specs/data-schema.md` - DB 테이블 구조
- **클라이언트 아키텍처**: `.ai/context/client-arch.md` - Frontend 구조 및 상태 관리
- **서버 아키텍처**: `.ai/context/server-arch.md` - Backend 구조, 모듈 설계
- **AWS 인프라**: `.ai/context/aws-infra.md` - 6단계 인프라 진화 로드맵

### 릴리즈 및 운영
- **릴리즈 규칙**: `.ai/context/release-rules.md` - 배포 전 체크리스트, 승인 프로세스
- **모니터링 전략**: `.ai/context/monitoring.md` - 지표, 알람, 대시보드

### 워크플로우
- **Task 기반 워크플로우**: `.ai/context/workflow.md` - EPIC → Feature → Task 연결, 상태 관리, 디렉토리 구조 규칙

---

## 스킬 (Skills)

AI가 수행하는 작업의 절차가 정의되어 있습니다.

| 스킬 | 문서 | 용도 |
|------|------|------|
| Epic Breakdown | `.ai/skills/epic-breakdown.md` | 대규모 기능을 실행 가능한 단위로 분해 |
| Feature Spec | `.ai/skills/feature-spec.md` | 기능 명세서 작성 (요구사항, 수용 기준) |
| Implementation Plan | `.ai/skills/implementation-plan.md` | 구현 계획 수립 (순서, 리스크, 의존성) |
| Test Plan | `.ai/skills/test-plan.md` | 테스트 시나리오 및 검증 기준 작성 |
| Release Check | `.ai/skills/release-check.md` | 릴리즈 전 최종 검증 체크리스트 |
| Balance Analysis | `.ai/skills/balance-analysis.md` | 게임 밸런스 분석 및 조정 제안 |
| Performance Review | `.ai/skills/performance-review.md` | 성능 병목 분석 및 최적화 제안 |

---

## 산출물 템플릿 (Outputs)

모든 산출물은 일관된 형식을 따릅니다.

- **EPIC 문서**: `.ai/templates/epic-template.md`
- **Feature Spec**: `.ai/templates/feature-template.md`
- **Implementation Plan**: `.ai/templates/implementation-template.md`
- **Test Plan**: `.ai/templates/test-template.md`
- **Release Checklist**: `.ai/templates/release-template.md`
- **Release Note**: `.ai/templates/release-note-template.md`

---

## 워크플로우 (Workflow)

**전체 흐름** (Task 기반):

```
1. [PO] 목표 정의 (3줄 이내)
   ↓
2. [Producer AI] EPIC 설계 → epic-breakdown.md 실행
   ↓
3. [Producer AI] Task 생성 → TaskCreate로 Feature별 Task 등록 + 의존성 설정
   ↓
4. [Designer/Server/Client AI] Task 실행
   - TaskList로 담당 Task 확인
   - blockedBy 해결된 Task만 시작 (TaskUpdate: in_progress)
   - Feature Spec / Implementation Plan 작성
   - 코드 구현 및 테스트
   - Task 완료 (TaskUpdate: completed)
   ↓
5. [QA AI] 검증
   - 모든 Feature Task가 completed 상태 확인
   - Test Plan 작성 (test-plan.md 실행)
   - Verification Report 작성
   - Release Checklist 작성 (release-check.md 실행)
   ↓
6. [Tech Lead] 코드 리뷰 및 승인
   ↓
7. [LiveOps AI] 배포 및 모니터링
   - Staging → Production 배포
   - 모니터링 알람 설정
   - Release Note 작성
```

**상세 워크플로우**: `.ai/context/workflow.md` 참조

---

## 디렉토리 구조 (Directory Structure)

모든 산출물은 아래 구조에 따라 저장됩니다.

```
docs/
├── epics/                    # EPIC 문서 (전략적 계획)
│   ├── EPIC-03-dynamic-event-system.md
│   ├── EPIC-04-trust-system-improvement.md
│   └── EPIC-{번호}-{kebab-case-제목}.md
│
├── features/                 # Feature Spec 문서 (설계)
│   ├── epic-03/
│   ├── epic-04/
│   └── epic-{번호}/
│       └── feature-{번호}-{kebab-case-기능명}.md
│
├── implementations/          # Implementation Plan 문서 (구현 계획)
│   ├── epic-03/
│   ├── epic-04/
│   └── epic-{번호}/
│       └── impl-{feature번호}-{kebab-case-설명}.md
│
├── verification/             # Verification Report 및 Checklist (검증)
│   ├── epic-{번호}-verification-report.md
│   ├── epic-{번호}-release-checklist.md
│   └── epic-{번호}-final-verification-report.md
│
└── release-notes/           # Release Note (릴리즈 노트)
    └── epic-{번호}-release-note.md
```

**명명 규칙**:
- 모든 파일명은 **kebab-case** (소문자, 하이픈 구분)
- EPIC: `EPIC-{번호}-{제목}.md` (예: `EPIC-05-user-analytics.md`)
- Feature: `feature-{번호}-{기능명}.md` (예: `feature-1-data-collection.md`)
- Implementation: `impl-{feature번호}-{설명}.md` (예: `impl-1-api-implementation.md`)

---

## 금지 사항 (Don't)

- ❌ AI가 역할 밖의 일을 하지 않는다 (Producer AI가 코드를 짜지 않음)
- ❌ 컨텍스트를 대화로 전달하지 않는다 (반드시 파일에 기록)
- ❌ 최종 승인은 AI가 하지 않는다 (사람이 검증)
- ❌ 템플릿 없이 산출물을 작성하지 않는다
- ❌ Task 없이 Feature를 구현하지 않는다 (Task 생성 및 추적 필수)
- ❌ Task 상태를 업데이트하지 않는다 (작업 시작 시 in_progress, 완료 시 completed)
- ❌ 의존성을 무시하고 작업을 시작하지 않는다 (blockedBy 해결 필수)
- ❌ 명명 규칙을 무시하지 않는다 (kebab-case 통일)
- ❌ 디렉토리 구조를 무시하지 않는다 (산출물을 올바른 위치에 저장)

---

## 참고 문서

- 원본 프로젝트 가이드: `/home/cto-game/CLAUDE.md`
- 게임 데이터: `/home/cto-game/game_choices_db.json`
- Backend 문서: `/home/cto-game/backend/docs/`
- Frontend 설계: `/home/cto-game/frontend_architecture.md`
- 기술 스택: `/home/cto-game/tech_stack_architecture.md`

---

## 초기 구축 체크리스트

- [x] AI_INDEX.md 생성
- [x] roles/ 6개 역할 정의 완료
- [x] context/ 핵심 문서 작성
- [x] skills/ 6개 스킬 정의 완료
- [x] templates/ 산출물 템플릿 작성
- [x] 첫 EPIC으로 구조 검증
- [x] Task 기반 워크플로우 통합 (v1.2)
- [x] 디렉토리 구조 표준화 (v1.2)
- [x] 명명 규칙 통일 (kebab-case) (v1.2)
- [x] epic-breakdown.md에 Task 생성 단계 추가 (v1.2)
- [x] workflow.md 작성 (v1.2)

---

**마지막 업데이트**: 2026-02-04
**문서 버전**: v1.2
**상태**: ✅ Task 시스템 통합 완료
