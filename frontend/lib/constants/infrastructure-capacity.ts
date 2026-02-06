/**
 * 인프라 수용량 정보
 * EPIC-11: 프론트엔드 UI/UX 개선 - Feature 3
 *
 * ⚠️ IMPORTANT: 이 맵은 백엔드 game-constants.ts의 INFRASTRUCTURE_CAPACITY와 동기화되어야 합니다
 * 백엔드 파일: backend/src/game/constants/game-constants.ts
 */

/**
 * 인프라별 수용량 증가 (백엔드 game-constants.ts와 동기화)
 */
export const INFRASTRUCTURE_CAPACITY_MAP: Record<string, number> = {
  'EC2': 10_000,
  'Route53': 5_000,
  'CloudWatch': 5_000,
  'RDS': 15_000,
  'S3': 15_000,
  'Auto Scaling': 40_000,
  'ECS': 30_000,
  'Aurora': 50_000,
  'Redis': 30_000,
  'EKS': 60_000,
  'Karpenter': 40_000,
  'Lambda': 40_000,
  'Bedrock': 30_000,
  'Aurora Global DB': 80_000,
  'CloudFront': 50_000,
  'ALB': 0, // 수용량 증가 없음 (가용성만 향상)
  'dr-configured': 30_000,
  'multi-region': 100_000,
} as const;

/**
 * 인프라 목록의 총 수용량 증가 계산
 */
export function calculateCapacityIncrease(infrastructure: string[]): number {
  return infrastructure.reduce((total, infra) => {
    return total + (INFRASTRUCTURE_CAPACITY_MAP[infra] || 0);
  }, 0);
}

/**
 * 수용량을 사람이 읽기 쉬운 포맷으로 변환
 * 50000 → "50K"
 * 1000 → "1K"
 */
export function formatCapacity(capacity: number): string {
  if (capacity >= 1000) {
    return `${(capacity / 1000).toFixed(0)}K`;
  }
  return capacity.toString();
}
