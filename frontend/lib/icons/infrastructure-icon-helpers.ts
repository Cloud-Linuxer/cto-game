/**
 * Infrastructure Icon Helper Functions
 *
 * AWS 인프라 아이콘 시스템 헬퍼 함수
 * EPIC-10: 프론트엔드 인터페이스 정리 및 AWS 아이콘 시스템 구축
 */

import type {
  SupportedInfrastructure,
  IconFormat,
  IconSize,
  ArchitectureCategory,
} from '@/types/infrastructure.types';
import { INFRASTRUCTURE_ICON_CONFIG } from './infrastructure-icon-map';

/**
 * 인프라 아이콘 경로 반환
 *
 * @param infra - 인프라 이름
 * @param format - 포맷 (png | svg)
 * @param size - 크기 (16 | 32 | 48 | 64)
 * @returns 아이콘 경로 또는 빈 문자열 (폴백 사용)
 *
 * @example
 * getInfrastructureIconPath('EC2', 'svg', 32)
 * // Returns: "/aws_image/.../Arch_Amazon-EC2_32.svg"
 */
export function getInfrastructureIconPath(
  infra: SupportedInfrastructure,
  format: IconFormat = 'svg',
  size: IconSize = 32
): string {
  const config = INFRASTRUCTURE_ICON_CONFIG[infra];

  if (!config) {
    console.warn(`[Infrastructure Icons] Unknown infrastructure: ${infra}`);
    return '';
  }

  // AWS 아이콘 경로가 없으면 빈 문자열 반환 (폴백 사용)
  if (!config.awsIconPath) {
    return '';
  }

  // 경로에 확장자 추가
  // 예: /path/Arch_Amazon-EC2_32 → /path/Arch_Amazon-EC2_32.svg
  return `${config.awsIconPath}.${format}`;
}

/**
 * 폴백 이모지 반환
 *
 * @param infra - 인프라 이름
 * @returns 폴백 이모지 (기본값: ☁️)
 *
 * @example
 * getInfrastructureFallbackEmoji('EC2')
 * // Returns: "🖥️"
 */
export function getInfrastructureFallbackEmoji(
  infra: SupportedInfrastructure
): string {
  const config = INFRASTRUCTURE_ICON_CONFIG[infra];
  return config?.fallbackEmoji || '☁️';
}

/**
 * AWS 공식 서비스명 반환
 *
 * @param infra - 인프라 이름
 * @returns AWS 공식 서비스명
 *
 * @example
 * getInfrastructureLabel('EC2')
 * // Returns: "Amazon EC2"
 */
export function getInfrastructureLabel(
  infra: SupportedInfrastructure
): string {
  const config = INFRASTRUCTURE_ICON_CONFIG[infra];
  return config?.awsServiceName || infra;
}

/**
 * 인프라가 지원되는지 확인
 *
 * @param infra - 확인할 인프라 이름 (string)
 * @returns 타입 가드 (SupportedInfrastructure)
 *
 * @example
 * if (isSupportedInfrastructure('EC2')) {
 *   // infra는 SupportedInfrastructure 타입
 * }
 */
export function isSupportedInfrastructure(
  infra: string
): infra is SupportedInfrastructure {
  return infra in INFRASTRUCTURE_ICON_CONFIG;
}

/**
 * 카테고리별 인프라 목록 반환
 *
 * @param category - AWS 서비스 카테고리
 * @returns 해당 카테고리의 인프라 목록
 *
 * @example
 * getInfrastructuresByCategory('Compute')
 * // Returns: ['EC2', 'Lambda', 'Auto Scaling']
 */
export function getInfrastructuresByCategory(
  category: ArchitectureCategory
): SupportedInfrastructure[] {
  return Object.entries(INFRASTRUCTURE_ICON_CONFIG)
    .filter(([_, config]) => config.category === category)
    .map(([infra]) => infra as SupportedInfrastructure);
}

/**
 * 모든 지원 인프라 목록 반환
 *
 * @returns 모든 지원 인프라 배열
 */
export function getAllSupportedInfrastructures(): SupportedInfrastructure[] {
  return Object.keys(INFRASTRUCTURE_ICON_CONFIG) as SupportedInfrastructure[];
}

/**
 * 인프라의 카테고리 반환
 *
 * @param infra - 인프라 이름
 * @returns 카테고리 또는 undefined
 */
export function getInfrastructureCategory(
  infra: SupportedInfrastructure
): ArchitectureCategory | undefined {
  const config = INFRASTRUCTURE_ICON_CONFIG[infra];
  return config?.category;
}
