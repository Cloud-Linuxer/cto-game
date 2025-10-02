# 게임 데이터 관리 스크립트

게임 데이터를 검증하고 수정하기 위한 유틸리티 스크립트 모음입니다.

## 사용 가능한 명령어

### 1. 데이터 검증 (Validate)

```bash
npm run data:validate
```

게임 데이터의 무결성을 확인합니다:
- 중복된 choice ID 검사
- next_turn 누락 검사
- 전체 턴 및 선택지 개수 확인

**출력 예시:**
```
🔍 Validating game data...

📊 Total turns: 31
📋 Total choices: 148
✨ Unique choice IDs: 148

✅ No duplicates found!
✅ Validation complete!
```

### 2. 중복 ID 자동 수정 (Fix Duplicates)

```bash
npm run data:fix
```

중복된 choice ID를 자동으로 수정합니다:
- 중복 ID를 새로운 고유 ID로 변경
- game_choices_db.json 파일 업데이트
- 변경 내역 출력

**출력 예시:**
```
🔧 Fixing duplicate choice IDs...

   Turn 3: Changed duplicate ID 9003 → 9993
   Turn 3: Changed duplicate ID 9004 → 9994

✅ Fixed 2 duplicate IDs
📝 Updated /home/cto-game/backend/game_choices_db.json
```

### 3. 데이터베이스 재시딩 (Reseed)

```bash
npm run data:seed
```

데이터베이스를 초기화하고 game_choices_db.json의 데이터를 다시 삽입합니다:
- 기존 데이터 완전 삭제 (TRUNCATE)
- 트랜잭션 기반 안전한 삽입
- 실패 시 자동 롤백

**출력 예시:**
```
🔌 Connecting to database...
🗑️  Clearing existing data...
📊 Loading game data...
💾 Seeding database...
✅ Successfully seeded 31 turns with 148 choices
```

## 데이터 수정 워크플로우

게임 데이터를 수정할 때 다음 순서를 따르세요:

### 1단계: JSON 파일 수정
```bash
# game_choices_db.json 파일을 직접 편집
vim game_choices_db.json
```

### 2단계: 데이터 검증
```bash
npm run data:validate
```

중복 ID나 데이터 오류가 있는지 확인합니다.

### 3단계: 문제 자동 수정 (필요시)
```bash
npm run data:fix
```

중복 ID가 발견되면 자동으로 수정합니다.

### 4단계: 데이터베이스 재시딩
```bash
npm run data:seed
```

수정된 데이터를 데이터베이스에 반영합니다.

### 5단계: 백엔드 재시작 (선택사항)
```bash
npm run start:dev
```

이미 실행 중이라면 자동으로 새 데이터를 로드합니다.

## 예시: 선택지 텍스트 수정하기

Turn 5의 choice 23을 "개발팀 확장"에서 "디자이너 채용"으로 변경하는 경우:

```bash
# 1. JSON 파일 수정
vim game_choices_db.json
# Turn 5의 choice 23 title을 변경

# 2. 검증
npm run data:validate

# 3. 재시딩
npm run data:seed

# 완료! 데이터베이스에 즉시 반영됩니다.
```

## 스크립트 파일 설명

### validate-data.js
- 위치: `scripts/validate-data.js`
- 기능: 데이터 무결성 검증
- 종료 코드: 문제 발견 시 1, 정상 시 0

### fix-duplicates.js
- 위치: `scripts/fix-duplicates.js`
- 기능: 중복 ID 자동 수정
- 파일 수정: game_choices_db.json을 직접 업데이트

### seed.js
- 위치: `scripts/seed.js`
- 기능: 독립적인 데이터베이스 시딩
- 트랜잭션: 실패 시 자동 롤백으로 안전성 보장

## 주의사항

1. **백업**: 중요한 수정 전에는 game_choices_db.json 파일을 백업하세요.
2. **검증 필수**: 수정 후 항상 `npm run data:validate`로 검증하세요.
3. **트랜잭션**: seed.js는 트랜잭션을 사용하므로 실패 시 자동으로 롤백됩니다.
4. **ID 고유성**: choice ID는 전체 게임에서 고유해야 합니다. 중복 시 자동 수정됩니다.

## 트러블슈팅

### 시딩 실패 시
```bash
# 1. 데이터 검증
npm run data:validate

# 2. 문제 수정
npm run data:fix

# 3. 재시도
npm run data:seed
```

### PostgreSQL 연결 오류 시
```bash
# Docker 컨테이너 확인
docker ps | grep cto-game-db

# 컨테이너가 없으면 시작
docker compose up -d
```

### 중복 키 오류 시
```bash
# 중복 ID 자동 수정
npm run data:fix

# 데이터베이스 재시딩
npm run data:seed
```
