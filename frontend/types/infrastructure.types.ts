/**
 * Infrastructure Type Definitions
 *
 * AWS 인프라 아이콘 시스템의 타입 정의
 * EPIC-10: 프론트엔드 인터페이스 정리 및 AWS 아이콘 시스템 구축
 */

/**
 * 지원하는 인프라 목록 (Union Type)
 */
export type SupportedInfrastructure =
  | 'EC2'
  | 'Aurora'
  | 'Aurora Global DB'
  | 'EKS'
  | 'Redis'
  | 'S3'
  | 'CloudFront'
  | 'Lambda'
  | 'Bedrock'
  | 'ALB'
  | 'Karpenter'
  | 'RDS'
  | 'Route53'
  | 'CloudWatch'
  | 'Auto Scaling';

/**
 * AWS 서비스 카테고리
 */
export type ArchitectureCategory =
  | 'Compute'
  | 'Database'
  | 'Containers'
  | 'Networking'
  | 'Storage'
  | 'AI-ML'
  | 'Developer-Tools'
  | 'Management';

/**
 * 아이콘 설정 인터페이스
 */
export interface InfrastructureIconConfig {
  awsServiceName: string;          // AWS 공식 명칭
  category: ArchitectureCategory;  // 카테고리
  awsIconPath: string;              // AWS 아이콘 경로 (확장자 제외)
  fallbackEmoji: string;            // 폴백 이모지
  customIconPath?: string;          // 커스텀 아이콘 경로 (선택사항)
  alternateNames?: string[];        // 별칭 (선택사항)
}

/**
 * 아이콘 포맷
 */
export type IconFormat = 'png' | 'svg';

/**
 * 아이콘 크기
 */
export type IconSize = 16 | 32 | 48 | 64;
