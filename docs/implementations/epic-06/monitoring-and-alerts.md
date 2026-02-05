# LLM Event System - Monitoring & Alerts

**EPIC-06 Feature 4: 모니터링 및 알람 설정**

LLM 이벤트 생성 시스템의 실시간 모니터링 및 알람 체계 구축 가이드입니다.

---

## 메트릭 API

### 1. GET /api/llm/metrics

**설명**: LLM 시스템의 전체 메트릭 조회

**응답 예시**:
```json
{
  "generation": {
    "totalGenerated": 1000,
    "successfulValidations": 850,
    "failedValidations": 100,
    "llmFailures": 50,
    "averageGenerationTimeMs": 1500,
    "successRate": 0.85,
    "failureRate": 0.15
  },
  "cache": {
    "hits": 600,
    "misses": 400,
    "sets": 400,
    "hitRate": 0.6
  },
  "system": {
    "llmEnabled": true,
    "vllmEndpoint": "http://localhost:8000",
    "cacheMaxSize": 1000,
    "cacheTTL": 300
  },
  "timestamp": "2026-02-05T10:30:00.000Z"
}
```

**사용 예시**:
```bash
curl http://localhost:3000/api/llm/metrics
```

---

### 2. GET /api/llm/health

**설명**: LLM 시스템 헬스 체크

**상태 기준**:
- `healthy`: 모든 지표가 정상 범위
- `degraded`: 일부 지표가 경고 범위 (캐시 hit rate <40% 또는 평균 응답 >3s)
- `unhealthy`: 실패율 >10%

**응답 예시**:
```json
{
  "status": "healthy",
  "checks": {
    "llmEnabled": true,
    "recentFailureRate": 0.05,
    "cacheHitRate": 0.7,
    "averageLatency": 1500
  },
  "timestamp": "2026-02-05T10:30:00.000Z"
}
```

**사용 예시**:
```bash
curl http://localhost:3000/api/llm/health
```

---

### 3. GET /api/llm/config

**설명**: LLM 시스템 설정 조회 (디버깅용)

**응답 예시**:
```json
{
  "vllm": {
    "endpoint": "http://localhost:8000",
    "timeoutMs": 3000,
    "maxRetries": 1,
    "modelName": "gpt-oss-20b"
  },
  "cache": {
    "ttlSeconds": 300,
    "maxSize": 1000
  },
  "features": {
    "enabled": true,
    "triggerRate": 0.1
  }
}
```

---

## 모니터링 메트릭

### Generation Metrics (생성 메트릭)

| 메트릭 | 설명 | 정상 범위 | 경고 임계값 | 위험 임계값 |
|--------|------|-----------|-------------|-------------|
| `totalGenerated` | 총 생성된 이벤트 수 | - | - | - |
| `successfulValidations` | 검증 성공 수 | - | - | - |
| `failedValidations` | 검증 실패 수 | - | - | - |
| `llmFailures` | LLM 호출 실패 수 | - | - | - |
| `averageGenerationTimeMs` | 평균 생성 시간 (ms) | <1500ms | 1500-3000ms | >3000ms |
| `successRate` | 성공률 (0-1) | >0.9 | 0.8-0.9 | <0.8 |
| `failureRate` | 실패율 (0-1) | <0.05 | 0.05-0.1 | >0.1 |

### Cache Metrics (캐시 메트릭)

| 메트릭 | 설명 | 정상 범위 | 경고 임계값 | 위험 임계값 |
|--------|------|-----------|-------------|-------------|
| `hits` | 캐시 히트 수 | - | - | - |
| `misses` | 캐시 미스 수 | - | - | - |
| `sets` | 캐시 저장 수 | - | - | - |
| `hitRate` | 캐시 히트율 (0-1) | >0.6 | 0.4-0.6 | <0.4 |

### System Metrics (시스템 메트릭)

| 메트릭 | 설명 |
|--------|------|
| `llmEnabled` | LLM 기능 활성화 여부 |
| `vllmEndpoint` | vLLM 서비스 엔드포인트 |
| `cacheMaxSize` | 캐시 최대 크기 |
| `cacheTTL` | 캐시 TTL (초) |

---

## 알람 규칙

### Critical Alerts (긴급 알람)

**1. High Failure Rate (실패율 과다)**

**조건**:
```
failureRate > 0.1 for 5 minutes
```

**의미**: 생성 실패율이 10%를 초과하여 LLM 시스템에 심각한 문제 발생

**대응**:
1. Slack #alerts 채널에 즉시 알림
2. Feature Flag 자동 비활성화 (Static Event로 전환)
3. vLLM 서비스 로그 확인
4. Redis 연결 상태 확인

**알람 메시지 예시**:
```
🚨 CRITICAL: LLM Event System - High Failure Rate
- Failure Rate: 15%
- Total Attempts: 200
- Failed: 30 (Validations: 20, LLM: 10)
- Action: Feature Flag disabled, switched to Static Events
- Investigate: vLLM health, Redis connectivity
```

---

**2. Service Unavailable (서비스 불가)**

**조건**:
```
llmFailures > 10 consecutive calls
```

**의미**: vLLM 서비스가 연속 10회 이상 응답하지 않음

**대응**:
1. vLLM 서비스 상태 확인 (`kubectl get pods -n llm`)
2. vLLM 로그 확인 (`kubectl logs -n llm vllm-pod`)
3. Feature Flag 비활성화
4. vLLM 재시작 고려

---

### High Priority Alerts (높은 우선순위 알람)

**3. High Latency (높은 응답 시간)**

**조건**:
```
averageGenerationTimeMs > 5000 for 10 minutes
```

**의미**: 평균 생성 시간이 5초를 초과하여 유저 경험 저하

**대응**:
1. Slack 알림
2. 캐시 성능 확인
3. vLLM 리소스 사용량 확인 (CPU, Memory, GPU)
4. 프롬프트 최적화 검토

**알람 메시지 예시**:
```
⚠️ HIGH: LLM Event System - High Latency
- Average Generation Time: 5.5s
- Target: <3s (p95)
- Cache Hit Rate: 45%
- Investigate: vLLM resources, cache performance
```

---

**4. P95 Latency Exceeded (P95 응답 시간 초과)**

**조건**:
```
p95(generationTimeMs) > 5000 for 10 minutes
```

**의미**: 상위 5% 요청의 응답 시간이 5초 초과

**대응**:
1. 성능 프로파일링 실행
2. 느린 요청의 게임 상태 패턴 분석
3. 프롬프트 길이 최적화

---

### Medium Priority Alerts (중간 우선순위 알람)

**5. Low Cache Hit Rate (낮은 캐시 히트율)**

**조건**:
```
cacheHitRate < 0.4 for 15 minutes
```

**의미**: 캐시 효율이 낮아 vLLM 호출이 과도하게 발생

**대응**:
1. Slack 알림
2. 캐시 키 생성 로직 확인
3. 게임 상태 다양성 분석
4. 캐시 버킷 전략 조정 고려

**알람 메시지 예시**:
```
⚠️ MEDIUM: LLM Event System - Low Cache Hit Rate
- Cache Hit Rate: 35%
- Target: >60%
- Cache Hits: 350 / Cache Misses: 650
- Investigate: cache key strategy, game state diversity
```

---

**6. Redis Connection Issues (Redis 연결 문제)**

**조건**:
```
redis_connection_errors > 5 in 5 minutes
```

**의미**: Redis 연결이 불안정하여 캐시 기능 저하

**대응**:
1. Redis 서비스 상태 확인
2. In-memory 캐시 폴백 동작 확인
3. Redis 재시작 고려

---

### Low Priority Alerts (낮은 우선순위 알람)

**7. Quality Score Degradation (품질 점수 저하)**

**조건**:
```
qualityScore < 70 for 5 consecutive events
```

**의미**: 생성 이벤트의 품질이 지속적으로 저하

**대응**:
1. Slack 알림
2. 품질 점수 세부 분석 (coherence, balance, entertainment, educational)
3. 프롬프트 개선 고려
4. Few-shot 예제 업데이트 고려

---

## 대시보드 구성

### Grafana Dashboard 구성 (권장)

**Panel 1: Generation Metrics**
- Metric: `llm.generation.total`
- Visualization: Graph (Time Series)
- Queries:
  - Total Generated (rate)
  - Successful Validations (rate)
  - Failed Validations (rate)
  - LLM Failures (rate)

**Panel 2: Success & Failure Rate**
- Metric: `llm.generation.success_rate`, `llm.generation.failure_rate`
- Visualization: Graph with Threshold Lines
- Thresholds:
  - Success Rate: Warning <0.9, Critical <0.8
  - Failure Rate: Warning >0.05, Critical >0.1

**Panel 3: Generation Time**
- Metric: `llm.generation.duration_ms`
- Visualization: Heatmap
- Aggregations: p50, p95, p99, avg

**Panel 4: Cache Performance**
- Metric: `llm.cache.hit_rate`
- Visualization: Gauge
- Thresholds:
  - Green: >0.6
  - Yellow: 0.4-0.6
  - Red: <0.4

**Panel 5: System Health**
- Metric: `llm.health.status`
- Visualization: Stat Panel
- Values: healthy, degraded, unhealthy

**Panel 6: Quality Score Distribution (추후 확장)**
- Metric: `llm.quality.score`
- Visualization: Histogram
- Buckets: 0-60, 60-70, 70-80, 80-90, 90-100

---

## CloudWatch Dashboard (AWS 환경)

### Dashboard JSON 구성

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["LLM", "TotalGenerated"],
          [".", "SuccessfulValidations"],
          [".", "FailedValidations"],
          [".", "LLMFailures"]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "ap-northeast-2",
        "title": "LLM Event Generation"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["LLM", "FailureRate"]
        ],
        "period": 300,
        "stat": "Average",
        "region": "ap-northeast-2",
        "title": "Failure Rate",
        "yAxis": {
          "left": {
            "min": 0,
            "max": 0.2
          }
        },
        "annotations": {
          "horizontal": [
            {
              "value": 0.1,
              "label": "Critical Threshold",
              "color": "#d62728"
            }
          ]
        }
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["LLM", "GenerationTime", { "stat": "p95" }],
          ["...", { "stat": "Average" }]
        ],
        "period": 300,
        "region": "ap-northeast-2",
        "title": "Generation Time",
        "annotations": {
          "horizontal": [
            {
              "value": 3000,
              "label": "Target (p95)",
              "color": "#ff7f0e"
            },
            {
              "value": 5000,
              "label": "Critical",
              "color": "#d62728"
            }
          ]
        }
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["LLM", "CacheHitRate"]
        ],
        "period": 300,
        "stat": "Average",
        "region": "ap-northeast-2",
        "title": "Cache Hit Rate",
        "yAxis": {
          "left": {
            "min": 0,
            "max": 1
          }
        },
        "annotations": {
          "horizontal": [
            {
              "value": 0.6,
              "label": "Target",
              "color": "#2ca02c"
            },
            {
              "value": 0.4,
              "label": "Warning",
              "color": "#ff7f0e"
            }
          ]
        }
      }
    }
  ]
}
```

---

## 알람 통합 (Slack)

### Slack Webhook 설정

```bash
# .env 파일에 추가
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_ALERT_CHANNEL=#llm-alerts
```

### 알람 전송 예시

```typescript
import axios from 'axios';

async function sendSlackAlert(message: string, level: 'critical' | 'high' | 'medium' | 'low') {
  const emoji = {
    critical: '🚨',
    high: '⚠️',
    medium: '⚠️',
    low: '💡',
  }[level];

  const color = {
    critical: '#d62728',
    high: '#ff7f0e',
    medium: '#ffbb78',
    low: '#aec7e8',
  }[level];

  await axios.post(process.env.SLACK_WEBHOOK_URL, {
    channel: process.env.SLACK_ALERT_CHANNEL,
    text: `${emoji} ${message}`,
    attachments: [
      {
        color,
        fields: [
          {
            title: 'Timestamp',
            value: new Date().toISOString(),
            short: true,
          },
          {
            title: 'Service',
            value: 'LLM Event System',
            short: true,
          },
        ],
      },
    ],
  });
}
```

---

## 메트릭 수집 최적화

### 1. 비동기 메트릭 수집

메트릭 수집이 API 응답 시간에 영향을 주지 않도록 비동기 처리:

```typescript
// 백그라운드 메트릭 수집
setInterval(async () => {
  const metrics = await metricsService.collect();
  await metricsService.publish(metrics);
}, 60000); // 1분마다
```

### 2. 메트릭 샘플링

모든 요청을 추적하는 대신 샘플링:

```typescript
const SAMPLING_RATE = 0.1; // 10%만 추적

if (Math.random() < SAMPLING_RATE) {
  await metricsService.track(event);
}
```

### 3. 메트릭 집계

개별 이벤트 대신 집계된 메트릭 저장:

```typescript
// 1분 단위 집계
const aggregated = {
  window: '1m',
  totalGenerated: 100,
  avgLatency: 1500,
  p95Latency: 2500,
  successRate: 0.85,
};
```

---

## 운영 절차

### 1. 정기 모니터링 (매일)

- [ ] `/api/llm/metrics` 확인
- [ ] `/api/llm/health` 확인
- [ ] 대시보드 이상 징후 확인
- [ ] 알람 이력 리뷰

### 2. 알람 대응 절차

1. **알람 수신** → Slack 알림 확인
2. **상황 파악** → `/api/llm/metrics` 및 대시보드 확인
3. **긴급 조치** → Feature Flag 비활성화 (Critical인 경우)
4. **원인 분석** → 로그, 메트릭, 트레이스 분석
5. **복구 조치** → vLLM 재시작, 설정 조정 등
6. **모니터링** → 복구 후 30분간 메트릭 관찰
7. **사후 보고** → Incident 보고서 작성

### 3. Feature Flag 관리

```typescript
// Feature Flag 비활성화
await configService.set('LLM_EVENTS_ENABLED', 'false');

// Static Event로 자동 전환
if (!LLMConfig.features.enabled) {
  return staticEventService.getEvent(gameState);
}
```

---

## 성과 측정

### KPI 목표

| KPI | 목표값 | 현재값 (예시) | 상태 |
|-----|--------|---------------|------|
| 평균 생성 시간 | <1.5s | 1.2s | ✅ |
| p95 생성 시간 | <3s | 2.5s | ✅ |
| 캐시 히트율 | >60% | 70% | ✅ |
| 성공률 | >90% | 92% | ✅ |
| 가용성 | 99% | 99.5% | ✅ |

---

**작성자**: Producer AI (EPIC-06 Feature 4)
**작성일**: 2026-02-05
**버전**: 1.0
