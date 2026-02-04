'use client';

import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export interface TrustChangeFactor {
  type: 'choice' | 'recovery' | 'penalty' | 'bonus';
  amount: number;
  message: string;
}

export interface TrustChangeExplanationProps {
  trustBefore: number;
  trustAfter: number;
  change: number;
  factors: TrustChangeFactor[];
  onClose?: () => void;
}

/**
 * TrustChangeExplanation
 *
 * 턴 종료 시 신뢰도 변화를 상세하게 설명하는 패널 컴포넌트
 *
 * 기능:
 * - 신뢰도 변화 전/후 비교
 * - 변화 요인별 상세 설명
 * - 교육적 메시지 (학습 효과)
 * - 타입별 아이콘 및 색상 구분
 */
export const TrustChangeExplanation: React.FC<TrustChangeExplanationProps> = ({
  trustBefore,
  trustAfter,
  change,
  factors,
  onClose,
}) => {
  /**
   * 요인 타입별 아이콘 반환
   */
  const getFactorIcon = (type: TrustChangeFactor['type']) => {
    switch (type) {
      case 'choice':
        return <Info className="w-5 h-5" />;
      case 'recovery':
        return <CheckCircle className="w-5 h-5" />;
      case 'penalty':
        return <AlertTriangle className="w-5 h-5" />;
      case 'bonus':
        return <TrendingUp className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  /**
   * 요인 타입별 색상 클래스 반환
   */
  const getFactorColorClass = (type: TrustChangeFactor['type']) => {
    switch (type) {
      case 'choice':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'recovery':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'penalty':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'bonus':
        return 'bg-purple-50 border-purple-200 text-purple-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  /**
   * 교육적 메시지 생성
   *
   * 신뢰도 변화 요인에 따라 자동으로 학습 메시지를 생성합니다.
   */
  const generateLesson = (): string => {
    if (factors.length === 0) {
      return '신뢰도 변화가 없습니다.';
    }

    // 가장 큰 영향을 준 요인 찾기
    const sortedFactors = [...factors].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    const primaryFactor = sortedFactors[0];

    const lessons: Record<string, string[]> = {
      choice: [
        '전략적 선택이 투자자 신뢰에 직접적인 영향을 미칩니다.',
        '비즈니스 의사결정은 단기 성과뿐 아니라 장기 신뢰도를 고려해야 합니다.',
        '투자자는 CTO의 기술적 판단과 리스크 관리 능력을 주시하고 있습니다.',
      ],
      recovery: [
        '회복 메커니즘을 통해 신뢰도를 회복할 수 있습니다.',
        '적극적인 대응이 투자자의 신뢰를 회복시킵니다.',
        '위기 상황에서의 빠른 복구 능력이 장기적 신뢰를 구축합니다.',
      ],
      penalty: [
        '서비스 장애는 신뢰도를 빠르게 떨어뜨립니다. 사전 대비가 중요합니다.',
        '용량 초과는 기술적 부채의 신호입니다. 인프라 투자를 고려하세요.',
        '시스템 불안정은 투자자의 우려를 증가시킵니다.',
        '반복적인 문제는 CTO의 역량에 대한 의문을 불러일으킵니다.',
        '기술적 실패는 비즈니스 신뢰도에 직접적인 타격을 줍니다.',
      ],
      bonus: [
        '지속적인 안정 운영이 장기적 신뢰를 구축합니다.',
        '인프라 투자는 기술적 안정성뿐 아니라 투자자 신뢰도를 높입니다.',
        '예방적 조치가 장기적으로 더 큰 신뢰를 만들어냅니다.',
        '탁월한 시스템 안정성은 투자자에게 강력한 신호입니다.',
      ],
    };

    const typeMessages = lessons[primaryFactor.type] || [];
    if (typeMessages.length === 0) {
      return '신뢰도가 변화했습니다.';
    }

    // 랜덤하게 하나 선택 (amount 기반으로 일관성 유지)
    const messageIndex = Math.abs(primaryFactor.amount) % typeMessages.length;
    return typeMessages[messageIndex];
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">신뢰도 변화 상세</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            aria-label="닫기"
          >
            ✕
          </button>
        )}
      </div>

      {/* Trust change summary */}
      <div className="flex items-center justify-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-sm text-gray-500 mb-1">이전</div>
          <div className="text-2xl font-bold text-gray-700">{trustBefore}</div>
        </div>

        <div className="flex items-center">
          {change > 0 ? (
            <TrendingUp className="w-8 h-8 text-green-500" />
          ) : change < 0 ? (
            <TrendingDown className="w-8 h-8 text-red-500" />
          ) : (
            <div className="w-8 h-1 bg-gray-300" />
          )}
        </div>

        <div className="text-center">
          <div className="text-sm text-gray-500 mb-1">현재</div>
          <div className="text-2xl font-bold text-gray-900">{trustAfter}</div>
        </div>

        <div
          className={`text-xl font-bold ${
            change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'
          }`}
        >
          ({change > 0 ? '+' : ''}
          {change})
        </div>
      </div>

      {/* Factors breakdown */}
      {factors.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">변화 요인</h4>
          <div className="space-y-2">
            {factors.map((factor, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 border rounded-lg ${getFactorColorClass(
                  factor.type
                )}`}
              >
                <div className="flex items-center gap-3">
                  {getFactorIcon(factor.type)}
                  <span className="text-sm font-medium">{factor.message}</span>
                </div>
                <span className="text-sm font-bold">
                  {factor.amount > 0 ? '+' : ''}
                  {factor.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Educational lesson */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <div className="flex items-start gap-2">
          <span className="text-lg">💡</span>
          <div>
            <div className="text-xs font-semibold text-blue-700 mb-1">교훈</div>
            <div className="text-sm text-blue-900">{generateLesson()}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrustChangeExplanation;
