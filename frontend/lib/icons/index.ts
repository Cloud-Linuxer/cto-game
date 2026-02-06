/**
 * Infrastructure Icons Barrel Export
 *
 * AWS 인프라 아이콘 시스템 통합 export
 * EPIC-10: 프론트엔드 인터페이스 정리 및 AWS 아이콘 시스템 구축
 */

export { INFRASTRUCTURE_ICON_CONFIG } from './infrastructure-icon-map';

export {
  getInfrastructureIconPath,
  getInfrastructureFallbackEmoji,
  getInfrastructureLabel,
  isSupportedInfrastructure,
  getInfrastructuresByCategory,
  getAllSupportedInfrastructures,
  getInfrastructureCategory,
} from './infrastructure-icon-helpers';
