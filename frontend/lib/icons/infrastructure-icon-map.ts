/**
 * Infrastructure Icon Mapping Configuration
 *
 * AWS 인프라 아이콘 매핑 테이블
 * EPIC-10: 프론트엔드 인터페이스 정리 및 AWS 아이콘 시스템 구축
 */

import type {
  SupportedInfrastructure,
  InfrastructureIconConfig,
} from '@/types/infrastructure.types';

// AWS 아이콘 기본 경로
const AWS_ICON_BASE_PATH = '/aws_image/Architecture-Service-Icons_02072025';

/**
 * 인프라 아이콘 매핑 테이블
 *
 * 각 AWS 서비스에 대한 아이콘 경로와 메타데이터를 정의합니다.
 * - awsIconPath: 확장자 제외 경로 (예: .../Arch_Amazon-EC2_32)
 * - 실제 사용 시 `.svg` 또는 `.png` 확장자를 추가
 */
export const INFRASTRUCTURE_ICON_CONFIG: Record<
  SupportedInfrastructure,
  InfrastructureIconConfig
> = {
  // ========================================
  // Compute
  // ========================================
  EC2: {
    awsServiceName: 'Amazon EC2',
    category: 'Compute',
    awsIconPath: `${AWS_ICON_BASE_PATH}/Arch_Compute/32/Arch_Amazon-EC2_32`,
    fallbackEmoji: '🖥️',
    alternateNames: ['ec2-instance', 'elastic-compute-cloud'],
  },
  Lambda: {
    awsServiceName: 'AWS Lambda',
    category: 'Compute',
    awsIconPath: `${AWS_ICON_BASE_PATH}/Arch_Compute/32/Arch_AWS-Lambda_32`,
    fallbackEmoji: '⚡',
  },
  'Auto Scaling': {
    awsServiceName: 'AWS Auto Scaling',
    category: 'Management',
    awsIconPath: `${AWS_ICON_BASE_PATH}/Arch_Management-Governance/32/Arch_AWS-Auto-Scaling_32`,
    fallbackEmoji: '📈',
  },

  // ========================================
  // Database
  // ========================================
  Aurora: {
    awsServiceName: 'Amazon Aurora',
    category: 'Database',
    awsIconPath: `${AWS_ICON_BASE_PATH}/Arch_Database/32/Arch_Amazon-Aurora_32`,
    fallbackEmoji: '🗄️',
    alternateNames: ['aurora-mysql', 'aurora-postgresql'],
  },
  'Aurora Global DB': {
    awsServiceName: 'Amazon Aurora Global Database',
    category: 'Database',
    // Aurora 아이콘 재사용 (공식 Global DB 아이콘 없음)
    awsIconPath: `${AWS_ICON_BASE_PATH}/Arch_Database/32/Arch_Amazon-Aurora_32`,
    fallbackEmoji: '🌍',
  },
  Redis: {
    awsServiceName: 'Amazon ElastiCache',
    category: 'Database',
    awsIconPath: `${AWS_ICON_BASE_PATH}/Arch_Database/32/Arch_Amazon-ElastiCache_32`,
    fallbackEmoji: '⚡',
  },
  RDS: {
    awsServiceName: 'Amazon RDS',
    category: 'Database',
    awsIconPath: `${AWS_ICON_BASE_PATH}/Arch_Database/32/Arch_Amazon-RDS_32`,
    fallbackEmoji: '🗄️',
  },

  // ========================================
  // Containers
  // ========================================
  EKS: {
    awsServiceName: 'Amazon Elastic Kubernetes Service',
    category: 'Containers',
    awsIconPath: `${AWS_ICON_BASE_PATH}/Arch_Containers/32/Arch_Amazon-Elastic-Kubernetes-Service_32`,
    fallbackEmoji: '⚙️',
    alternateNames: ['kubernetes'],
  },
  Karpenter: {
    awsServiceName: 'Karpenter',
    category: 'Containers',
    // Karpenter는 공식 AWS 아이콘 없음 - 폴백 사용
    awsIconPath: '',
    fallbackEmoji: '🔧',
  },

  // ========================================
  // Networking & Content Delivery
  // ========================================
  CloudFront: {
    awsServiceName: 'Amazon CloudFront',
    category: 'Networking',
    awsIconPath: `${AWS_ICON_BASE_PATH}/Arch_Networking-Content-Delivery/32/Arch_Amazon-CloudFront_32`,
    fallbackEmoji: '🌐',
  },
  ALB: {
    awsServiceName: 'Elastic Load Balancing',
    category: 'Networking',
    awsIconPath: `${AWS_ICON_BASE_PATH}/Arch_Networking-Content-Delivery/32/Arch_Elastic-Load-Balancing_32`,
    fallbackEmoji: '⚖️',
  },
  Route53: {
    awsServiceName: 'Amazon Route 53',
    category: 'Networking',
    awsIconPath: `${AWS_ICON_BASE_PATH}/Arch_Networking-Content-Delivery/32/Arch_Amazon-Route-53_32`,
    fallbackEmoji: '🌐',
  },

  // ========================================
  // Storage
  // ========================================
  S3: {
    awsServiceName: 'Amazon S3',
    category: 'Storage',
    awsIconPath: `${AWS_ICON_BASE_PATH}/Arch_Storage/32/Arch_Amazon-Simple-Storage-Service_32`,
    fallbackEmoji: '📦',
  },

  // ========================================
  // AI/ML
  // ========================================
  Bedrock: {
    awsServiceName: 'Amazon Bedrock',
    category: 'AI-ML',
    awsIconPath: `${AWS_ICON_BASE_PATH}/Arch_Artificial-Intelligence/32/Arch_Amazon-Bedrock_32`,
    fallbackEmoji: '🤖',
  },

  // ========================================
  // Management & Governance
  // ========================================
  CloudWatch: {
    awsServiceName: 'Amazon CloudWatch',
    category: 'Management',
    awsIconPath: `${AWS_ICON_BASE_PATH}/Arch_Management-Governance/32/Arch_Amazon-CloudWatch_32`,
    fallbackEmoji: '📊',
  },
};
