# IMPL-{CLIENT/SERVER}-{번호}: {제목}

## 개요
{구현할 기능 설명 - 1-2문장}

## 관련 문서
- **EPIC**: EPIC-{번호}
- **Feature Spec**: FEATURE-{번호}
- **참조 코드**: {기존 파일 경로}

---

## 아키텍처

### 파일 구조
```
{frontend/backend}/
├── {directory}/
│   ├── {file1}.{ext}      # {설명}
│   ├── {file2}.{ext}      # {설명}
│   └── {file3}.{ext}      # {설명}
```

---

## [Client] 컴포넌트 설계 (Client AI만 작성)

### 컴포넌트 트리
```
components/
  {ParentComponent}/
    {ParentComponent}.tsx       # Container
    {ChildComponent1}.tsx       # Presentation
    {ChildComponent2}.tsx       # Presentation
```

### Props/State 정의
```typescript
// {ComponentName}.tsx
interface {ComponentName}Props {
  {prop1}: {type};
  {prop2}: {type};
  on{Action}: (param: {type}) => void;
}

interface {ComponentName}State {
  {state1}: {type};
  {state2}: {type};
}
```

### 상태 관리 (Redux)
```typescript
// Redux Store Structure
interface {SliceName}State {
  {field1}: {type};
  {field2}: {type};
  loading: boolean;
  error: string | null;
}

// Actions
- {action1}({params})
- {action2}({params})

// Selectors
- select{DataName}
- select{DataName}Loading
- select{DataName}Error
```

---

## [Server] 모듈 설계 (Server AI만 작성)

### 모듈 구조
```
backend/src/{module}/
├── {module}.controller.ts      # API 엔드포인트
├── {module}.service.ts         # 비즈니스 로직
├── {module}.module.ts          # 모듈 정의
├── dto/
│   ├── {request}.dto.ts
│   └── {response}.dto.ts
└── entities/
    └── {entity}.entity.ts
```

### API 설계
```yaml
POST /api/{endpoint}
Request:
  body:
    {field1}: {type}
    {field2}: {type}
Response:
  200:
    {result}: {type}
  400: Bad Request
  404: Not Found
  500: Internal Error
```

### DB 스키마
```typescript
@Entity('{table_name}')
export class {EntityName} {
  @PrimaryGeneratedColumn('{type}')
  {id}: {type};

  @Column({ type: '{type}' })
  {field1}: {type};

  @Column({ type: '{type}' })
  {field2}: {type};

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 비즈니스 로직
```typescript
class {ServiceName} {
  async {method1}({params}): Promise<{ReturnType}> {
    // 1. {단계 1 설명}
    // 2. {단계 2 설명}
    // 3. {단계 3 설명}
    return result;
  }
}
```

---

## API 연동 (Client AI만 작성)

### 1. API 호출
```typescript
// RTK Query
const {api} = createApi({
  endpoints: (builder) => ({
    {endpointName}: builder.{mutation/query}<{Response}, {Request}>({
      query: (req) => ({
        url: '/api/{endpoint}',
        method: '{GET/POST/PUT/DELETE}',
        body: req,
      }),
    }),
  }),
});
```

### 2. 에러 처리
- **Network Error**: 재시도 로직 (3회)
- **400 Bad Request**: 사용자에게 알림
- **404 Not Found**: {처리 방법}
- **500 Server Error**: 에러 페이지 표시

### 3. 로딩 상태
```typescript
const { data, isLoading, error } = use{ApiName}Query(params);

if (isLoading) return <Spinner />;
if (error) return <ErrorMessage error={error} />;
return <DataDisplay data={data} />;
```

---

## 보안 (Server AI만 작성)

### Input Validation
```typescript
export class {DtoName} {
  @IsString()
  @IsNotEmpty()
  {field1}: string;

  @IsInt()
  @Min({min})
  @Max({max})
  {field2}: number;
}
```

### Error Handling
```typescript
try {
  // 비즈니스 로직
} catch (error) {
  if (error instanceof NotFoundException) {
    throw new NotFoundException('{error message}');
  }
  this.logger.error(`{context}: ${error.message}`, error.stack);
  throw new InternalServerErrorException('{safe error message}');
}
```

---

## 성능 최적화

### [Client] 최적화
```typescript
// Code Splitting
const {Component} = lazy(() => import('./{Component}'));

// Memoization
const {Component} = React.memo(({ prop1, prop2 }) => {
  // ...
});

const memoized{Data} = useMemo(() => {
  return {계산 로직};
}, [dependencies]);

// Debouncing
const debounced{Value} = useDeferredValue({value});
```

### [Server] 최적화
```typescript
// Query Optimization
const {data} = await this.repository.findOne({
  where: { {condition} },
  relations: ['{relation1}', '{relation2}'],  // Eager loading
  select: ['{field1}', '{field2}'],           // 필요한 필드만
});

// Caching (Phase 1+)
@Cacheable('{cache-key}', { ttl: {seconds} })
async {methodName}(): Promise<{Type}> {
  return this.repository.find();
}

// Indexing
@Index(['{field1}', '{field2}'])
export class {Entity} { ... }
```

---

## 접근성 (a11y) (Client AI만 작성)

- [ ] `<button>` 태그에 `aria-label` 추가
- [ ] 키보드 네비게이션: Tab/Enter로 이동
- [ ] 색상 대비비 4.5:1 이상 유지
- [ ] 스크린 리더 호환성 테스트

---

## 국제화 (i18n) (Client AI만 작성)

```typescript
// next-intl 사용
import { useTranslations } from 'next-intl';

const t = useTranslations('{namespace}');
<h1>{t('title')}</h1>
<p>{t('description', { variable: value })}</p>
```

---

## 구현 순서

### Milestone 1: {이름} (Day 1-2)
1. [ ] {작업 1}
2. [ ] {작업 2}
3. [ ] {작업 3}

### Milestone 2: {이름} (Day 3-4)
4. [ ] {작업 4}
5. [ ] {작업 5}
6. [ ] {작업 6}

### Milestone 3: {이름} (Day 5)
7. [ ] {작업 7}
8. [ ] {작업 8}
9. [ ] {작업 9}

### Milestone 4: 최적화 및 정리 (Day 6)
10. [ ] 에러 처리 개선
11. [ ] 로깅 추가
12. [ ] 코드 리뷰 준비

---

## 리스크 및 고려사항

| 리스크 | 영향도 | 대응 방안 | 우회 방안 |
|--------|--------|-----------|-----------|
| {리스크 1} | High/Medium/Low | {대응 방법} | {우회 방법} |
| {리스크 2} | High/Medium/Low | {대응 방법} | {우회 방법} |

---

## QA 요청사항

### Unit Test
- [ ] {Service/Component}.{method1}() - 정상 케이스
- [ ] {Service/Component}.{method1}() - 에러 케이스
- [ ] {Service/Component}.{method2}() - Edge Case

### Integration Test
- [ ] {API endpoint} - 정상 요청
- [ ] {API endpoint} - 잘못된 입력
- [ ] {API endpoint} - 권한 없음

### Edge Case
- [ ] {Edge case 1}
- [ ] {Edge case 2}
- [ ] {Edge case 3}

### Performance Test
- [ ] {핵심 로직} < {목표}ms
- [ ] API 응답 시간 < {목표}ms (p95)

---

## 참고 코드

```typescript
// {설명}
{샘플 코드}
```

---

**작성자**: {Client/Server} AI
**작성일**: {날짜}
**검토자**: {Tech Lead 이름}
**상태**: Draft / Review / Approved
