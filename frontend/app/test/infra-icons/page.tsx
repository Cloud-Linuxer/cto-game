'use client';

/**
 * InfraList AWS Icons Test Page
 * EPIC-10 검증용 테스트 페이지
 */

import InfraList from '@/components/InfraList';

export default function InfraIconsTestPage() {
  // 테스트할 인프라 목록 (15개 서비스)
  const testInfrastructure = [
    'EC2',
    'Lambda',
    'Auto Scaling',
    'Aurora',
    'Aurora Global DB',
    'Redis',
    'RDS',
    'EKS',
    'Karpenter',
    'CloudFront',
    'ALB',
    'Route53',
    'S3',
    'Bedrock',
    'CloudWatch',
  ];

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            🎨 AWS 아이콘 시스템 테스트
          </h1>
          <p className="text-slate-400">
            EPIC-10: 프론트엔드 인터페이스 정리 및 AWS 아이콘 시스템 구축
          </p>
        </div>

        {/* 테스트 섹션들 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 1. AWS 아이콘 모드 (기본) */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-4">
              ✅ AWS 공식 아이콘 (useAwsIcons=true)
            </h2>
            <p className="text-slate-400 mb-4 text-sm">
              AWS 공식 아이콘 표시. 로드 실패 시 이모지로 자동 폴백.
            </p>
            <div className="h-[600px] overflow-auto">
              <InfraList
                infrastructure={testInfrastructure}
                useAwsIcons={true}
                iconSize={32}
              />
            </div>
          </div>

          {/* 2. 이모지 모드 */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-4">
              🎭 이모지 모드 (useAwsIcons=false)
            </h2>
            <p className="text-slate-400 mb-4 text-sm">
              이모지만 표시 (비교용)
            </p>
            <div className="h-[600px] overflow-auto">
              <InfraList
                infrastructure={testInfrastructure}
                useAwsIcons={false}
                iconSize={32}
              />
            </div>
          </div>
        </div>

        {/* 아이콘 크기 테스트 */}
        <div className="mt-8 bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-4">
            📏 아이콘 크기 테스트
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[16, 32, 48, 64].map((size) => (
              <div key={size} className="bg-slate-900 rounded-xl p-4">
                <h3 className="text-white font-bold mb-2">{size}px</h3>
                <InfraList
                  infrastructure={['EC2', 'Aurora', 'EKS', 'S3']}
                  useAwsIcons={true}
                  iconSize={size as 16 | 32 | 48 | 64}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 통계 */}
        <div className="mt-8 bg-gradient-to-r from-blue-900 to-purple-900 rounded-2xl p-6 border border-blue-700">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              📊 아이콘 시스템 통계
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-3xl font-bold text-white">15</div>
                <div className="text-slate-300 text-sm">지원 서비스</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-3xl font-bold text-green-400">14</div>
                <div className="text-slate-300 text-sm">AWS 아이콘</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-3xl font-bold text-yellow-400">1</div>
                <div className="text-slate-300 text-sm">이모지 폴백</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-3xl font-bold text-blue-400">93.3%</div>
                <div className="text-slate-300 text-sm">커버리지</div>
              </div>
            </div>
          </div>
        </div>

        {/* 주요 수정사항 */}
        <div className="mt-8 bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-4">
            🔧 주요 수정사항
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-slate-300">
                <strong>S3 경로 수정:</strong> Arch_Amazon-S3_32 → Arch_Amazon-Simple-Storage-Service_32
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-slate-300">
                <strong>Bedrock 경로 수정:</strong> Arch_Machine-Learning → Arch_Artificial-Intelligence
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-slate-300">
                <strong>Auto Scaling 카테고리:</strong> Compute → Management
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-yellow-400">⚠</span>
              <span className="text-slate-300">
                <strong>Karpenter:</strong> 공식 AWS 아이콘 없음 (이모지 폴백 사용)
              </span>
            </div>
          </div>
        </div>

        {/* 개발자 정보 */}
        <div className="mt-8 text-center text-slate-500 text-sm">
          <p>테스트 페이지: /test/infra-icons</p>
          <p>개발 서버: http://localhost:3001</p>
        </div>
      </div>
    </div>
  );
}
