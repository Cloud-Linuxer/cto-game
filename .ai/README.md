# AI Squad - AWS 스타트업 타이쿤

> **이 디렉토리는 게임 개발 AI 스쿼드의 모든 지식과 절차를 담고 있습니다.**
>
> 사람은 의사결정하고, AI는 구조화합니다.

---

## 📁 디렉토리 구조

```
.ai/
├── README.md                  # 이 파일
├── roles/                     # 역할 정의 (6개)
│   ├── producer.md           # 에픽 분해, 일정 설계
│   ├── designer.md           # 게임 규칙, 밸런스 설계
│   ├── client.md             # Frontend 구현 계획
│   ├── server.md             # Backend 구현 계획
│   ├── qa.md                 # 테스트 계획, 품질 게이트
│   └── liveops.md            # 모니터링, 배포, 핫픽스
├── context/                   # 게임 지식 (컨텍스트)
│   ├── vision.md             # 게임 비전, 타겟 유저
│   ├── gdd.md                # 게임 디자인 문서
│   ├── economy.md            # 경제 시스템 (작성 예정)
│   ├── content/              # 스토리 텍스트, 이벤트
│   └── specs/                # API, 이벤트, DB 스펙
├── skills/                    # 작업 절차 (5개)
│   ├── epic-breakdown.md     # EPIC을 Feature로 분해
│   ├── feature-spec.md       # 기능 명세서 작성
│   ├── implementation-plan.md # 구현 계획 수립
│   ├── test-plan.md          # 테스트 계획 작성
│   └── release-check.md      # 릴리즈 체크리스트 실행
└── templates/                 # 산출물 템플릿
    ├── epic-template.md
    ├── feature-template.md   (작성 예정)
    ├── implementation-template.md (작성 예정)
    ├── test-template.md      (작성 예정)
    └── release-template.md   (작성 예정)
```

---

## 🎯 역할별 책임 요약

| 역할 | 입력 | 출력 | 핵심 책임 |
|------|------|------|-----------|
| **Producer** | PO 목표 | EPIC 문서 | Feature 분해, 의존성, 릴리즈 전략 |
| **Designer** | EPIC | Feature Spec | 게임 규칙, 밸런스, 수치 모델 |
| **Client** | Feature Spec | Implementation Plan | Frontend 아키텍처, UI/UX 계획 |
| **Server** | Feature Spec | Implementation Plan | Backend 아키텍처, API/DB 설계 |
| **QA** | Impl Plan | Test Plan | 테스트 시나리오, 품질 게이트 |
| **LiveOps** | Test Plan | Monitoring Plan | 배포, 모니터링, 핫픽스 |

---

## 🔄 기본 워크플로우

```
┌────────────────────────────────────────────────────────────┐
│  1. PO가 목표 제시 (3줄 이내)                               │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  2. Producer AI: EPIC 분해                                 │
│     - epic-breakdown.md 스킬 실행                           │
│     - 출력: EPIC-XX.md                                      │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  3. Designer AI: 시스템 설계                                │
│     - feature-spec.md 스킬 실행                             │
│     - 출력: FEATURE-XX.md                                   │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  4. Client/Server AI: 구현 계획                             │
│     - implementation-plan.md 스킬 실행                      │
│     - 출력: IMPL-CLIENT-XX.md, IMPL-SERVER-XX.md            │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  5. QA AI: 테스트 계획                                      │
│     - test-plan.md 스킬 실행                                │
│     - 출력: TEST-XX.md                                      │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  6. [구현] Tech Lead가 코드 작성 및 리뷰                     │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  7. QA AI: 릴리즈 체크                                      │
│     - release-check.md 스킬 실행                            │
│     - 출력: RELEASE-vX.X.X-checklist.md                     │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  8. LiveOps AI: 배포 및 모니터링                            │
└────────────────────────────────────────────────────────────┘
```

---

## 🚀 빠른 시작 (Quick Start)

### 1. 새로운 기능 개발 시작

```bash
# PO가 목표 정의
echo "유저가 게임 중 랜덤 이벤트를 만나게 하고 싶다" > goal.txt

# Producer AI에게 EPIC 분해 요청
# → 결과: docs/epics/EPIC-03-dynamic-event-system.md
```

### 2. AI 역할 호출 방법 (예시)

**Producer AI 호출**:
```
@Producer AI

목표: 유저가 게임 중 랜덤 이벤트를 만나게 하고 싶다.

다음 문서를 참조하여 EPIC을 작성해주세요:
- .ai/roles/producer.md (역할 정의)
- .ai/skills/epic-breakdown.md (작업 절차)
- .ai/context/vision.md (게임 비전)
- .ai/context/gdd.md (게임 규칙)

출력: docs/epics/EPIC-03-dynamic-event-system.md
```

**Designer AI 호출**:
```
@Designer AI

Producer AI가 작성한 EPIC-03을 읽고,
Feature 1: 이벤트 트리거 조건 시스템에 대한 Feature Spec을 작성해주세요.

참조:
- .ai/roles/designer.md
- .ai/skills/feature-spec.md
- docs/epics/EPIC-03-dynamic-event-system.md

출력: docs/features/FEATURE-03-1-event-trigger.md
```

---

## 📋 문서 네이밍 규칙

```
docs/
├── epics/
│   └── EPIC-{번호}-{제목}.md            # 예: EPIC-03-dynamic-event-system.md
├── features/
│   └── FEATURE-{EPIC번호}-{순서}-{제목}.md  # 예: FEATURE-03-1-event-trigger.md
├── implementation/
│   ├── IMPL-CLIENT-{번호}-{제목}.md     # 예: IMPL-CLIENT-03-event-popup.md
│   └── IMPL-SERVER-{번호}-{제목}.md     # 예: IMPL-SERVER-03-event-api.md
├── test-plans/
│   └── TEST-{번호}-{제목}.md            # 예: TEST-03-event-system.md
└── releases/
    ├── RELEASE-v{버전}-checklist.md    # 예: RELEASE-v0.2.0-checklist.md
    └── RELEASE-v{버전}-notes.md        # 예: RELEASE-v0.2.0-notes.md
```

---

## 🛡️ 품질 보증 원칙

### 1. 역할 고정
- 한 AI = 한 역할
- 역할 간 책임 중복 금지
- Producer가 코드를 짜지 않음
- QA가 게임 규칙을 설계하지 않음

### 2. 컨텍스트는 파일로 관리
- 기억은 대화가 아니라 문서에 남긴다
- AI 세션은 언제든 종료된다는 전제
- 모든 결정은 문서로 추적 가능

### 3. 사람은 승인자
- AI 산출물은 항상 초안
- 릴리즈 가능한 품질은 인간 리드가 보증
- 최종 의사결정은 PO/Tech Lead/QA Lead

### 4. 템플릿 엄수
- 모든 산출물은 템플릿을 따른다
- 일관성이 품질을 보장한다

---

## 📊 성공 기준

### 초기 (1개월)
- [ ] 첫 EPIC으로 구조 검증 완료
- [ ] 모든 역할 정의서 작성 완료
- [ ] 최소 1개 기능을 AI 스쿼드로 개발

### 중기 (3개월)
- [ ] 회의 시간 30% 감소
- [ ] 요구사항 누락 50% 감소
- [ ] 릴리즈 전 QA 이슈 40% 감소

### 장기 (6개월)
- [ ] 핫픽스 대응 속도 2배 개선
- [ ] 개발 생산성 측정 가능
- [ ] 팀 전체가 AI 스쿼드 활용

---

## 🔧 유지보수

### 문서 업데이트 주기
- **역할 정의**: 분기별 리뷰
- **컨텍스트**: 게임 규칙 변경 시 즉시
- **스킬**: 프로세스 개선 시 즉시
- **템플릿**: 산출물 포맷 변경 시

### 버전 관리
- 모든 문서는 Git으로 관리
- 중요한 변경은 PR + 리뷰
- 문서 하단에 버전 및 업데이트 날짜 명시

---

## 📚 참고 문서

- **프로젝트 가이드**: `/home/cto-game/CLAUDE.md`
- **게임 데이터**: `/home/cto-game/game_choices_db.json`
- **Backend 문서**: `/home/cto-game/backend/docs/`
- **Frontend 설계**: `/home/cto-game/frontend_architecture.md`

---

## 📞 문제 해결

### Q1: AI가 역할 밖의 일을 한다면?
→ 역할 정의서를 다시 읽히고, "Out of Scope" 섹션을 강조

### Q2: 산출물 품질이 낮다면?
→ 스킬 문서의 "품질 체크" 섹션 확인
→ 템플릿을 더 구체적으로 수정

### Q3: AI가 컨텍스트를 잊는다면?
→ 문서 참조를 명시적으로 요청
→ "다음 문서를 읽고..." 형태로 프롬프트 작성

### Q4: 역할 간 조율이 필요하다면?
→ EPIC 문서의 "조율 포인트" 섹션 활용
→ 각 AI에게 다른 AI의 산출물을 명시적으로 전달

---

## 🎓 학습 자료

1. **역할 이해하기**: `.ai/roles/` 디렉토리의 모든 문서 읽기
2. **스킬 익히기**: `.ai/skills/` 디렉토리의 절차 따라하기
3. **예시 학습**: 첫 EPIC 작성 후 산출물 리뷰
4. **반복 개선**: 회고를 통해 프로세스 개선

---

**문서 버전**: v1.0
**최종 업데이트**: 2026-02-04
**다음 리뷰 예정**: 2026-03-04

---

**한 줄 요약**:
> 사람은 판단하고, AI는 구조화한다.
> 이 스쿼드는 '개발 조직'이 아니라 '게임 생산 라인'이다.
