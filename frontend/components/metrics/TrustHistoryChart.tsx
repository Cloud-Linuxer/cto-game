'use client';

import React from 'react';

export interface TrustHistoryData {
  turnNumber: number;
  trustBefore: number;
  trustAfter: number;
  change: number;
}

export interface TrustHistoryChartProps {
  history: TrustHistoryData[];
  currentTurn: number;
  width?: number;
  height?: number;
}

/**
 * TrustHistoryChart
 *
 * 신뢰도 변화 히스토리를 시각화하는 라인 차트 컴포넌트
 *
 * 기능:
 * - 25턴 동안의 신뢰도 변화 추이를 라인 차트로 표시
 * - 투자 임계값 수평선 표시 (Series A/B/C)
 * - 현재 턴 강조 표시
 * - 호버 시 상세 정보 툴팁
 */
export const TrustHistoryChart: React.FC<TrustHistoryChartProps> = ({
  history,
  currentTurn,
  width = 600,
  height = 300,
}) => {
  const [hoveredPoint, setHoveredPoint] = React.useState<number | null>(null);

  // Chart dimensions
  const padding = { top: 20, right: 60, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Trust thresholds for investment rounds
  const thresholds = [
    { label: 'Series A', value: 30, color: '#94a3b8' },
    { label: 'Series B', value: 50, color: '#64748b' },
    { label: 'Series C', value: 70, color: '#475569' },
  ];

  // Calculate scales
  const maxTurn = 25;
  const xScale = (turn: number) => (turn / maxTurn) * chartWidth;
  const yScale = (trust: number) => chartHeight - (trust / 100) * chartHeight;

  // Generate line path
  const generatePath = () => {
    if (history.length === 0) return '';

    const points = history.map((h) => ({
      x: xScale(h.turnNumber),
      y: yScale(h.trustAfter),
    }));

    const path = points.reduce((acc, point, index) => {
      if (index === 0) {
        return `M ${point.x} ${point.y}`;
      }
      return `${acc} L ${point.x} ${point.y}`;
    }, '');

    return path;
  };

  return (
    <div className="relative">
      <svg
        width={width}
        height={height}
        className="overflow-visible"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((value) => (
            <g key={`grid-${value}`}>
              <line
                x1={0}
                y1={yScale(value)}
                x2={chartWidth}
                y2={yScale(value)}
                stroke="#e2e8f0"
                strokeWidth={1}
                strokeDasharray="2,2"
              />
              <text
                x={-10}
                y={yScale(value)}
                textAnchor="end"
                alignmentBaseline="middle"
                fontSize={12}
                fill="#64748b"
              >
                {value}
              </text>
            </g>
          ))}

          {/* Threshold lines */}
          {thresholds.map((threshold) => (
            <g key={`threshold-${threshold.label}`}>
              <line
                x1={0}
                y1={yScale(threshold.value)}
                x2={chartWidth}
                y2={yScale(threshold.value)}
                stroke={threshold.color}
                strokeWidth={2}
                strokeDasharray="4,4"
              />
              <text
                x={chartWidth + 5}
                y={yScale(threshold.value)}
                textAnchor="start"
                alignmentBaseline="middle"
                fontSize={11}
                fill={threshold.color}
                fontWeight="600"
              >
                {threshold.label}
              </text>
            </g>
          ))}

          {/* Line path */}
          {history.length > 0 && (
            <path
              d={generatePath()}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data points */}
          {history.map((point, index) => {
            const isHovered = hoveredPoint === index;
            const isCurrent = point.turnNumber === currentTurn;

            return (
              <g key={`point-${point.turnNumber}`}>
                <circle
                  cx={xScale(point.turnNumber)}
                  cy={yScale(point.trustAfter)}
                  r={isCurrent ? 6 : isHovered ? 5 : 3}
                  fill={isCurrent ? '#ef4444' : '#3b82f6'}
                  stroke="white"
                  strokeWidth={2}
                  onMouseEnter={() => setHoveredPoint(index)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  style={{ cursor: 'pointer' }}
                />
                {isCurrent && (
                  <text
                    x={xScale(point.turnNumber)}
                    y={yScale(point.trustAfter) - 15}
                    textAnchor="middle"
                    fontSize={11}
                    fill="#ef4444"
                    fontWeight="700"
                  >
                    현재
                  </text>
                )}
              </g>
            );
          })}

          {/* X-axis labels */}
          {[0, 5, 10, 15, 20, 25].map((turn) => (
            <text
              key={`x-label-${turn}`}
              x={xScale(turn)}
              y={chartHeight + 25}
              textAnchor="middle"
              fontSize={12}
              fill="#64748b"
            >
              {turn}
            </text>
          ))}

          {/* X-axis title */}
          <text
            x={chartWidth / 2}
            y={chartHeight + 40}
            textAnchor="middle"
            fontSize={13}
            fill="#475569"
            fontWeight="600"
          >
            턴
          </text>

          {/* Y-axis title */}
          <text
            x={-chartHeight / 2}
            y={-35}
            textAnchor="middle"
            fontSize={13}
            fill="#475569"
            fontWeight="600"
            transform={`rotate(-90, -${chartHeight / 2}, -35)`}
          >
            신뢰도
          </text>
        </g>
      </svg>

      {/* Tooltip */}
      {hoveredPoint !== null && history[hoveredPoint] && (
        <div
          className="absolute bg-gray-900 text-white text-xs rounded px-3 py-2 pointer-events-none shadow-lg"
          style={{
            left: padding.left + xScale(history[hoveredPoint].turnNumber) + 10,
            top: padding.top + yScale(history[hoveredPoint].trustAfter) - 30,
            zIndex: 10,
          }}
        >
          <div className="font-semibold">턴 {history[hoveredPoint].turnNumber}</div>
          <div>신뢰도: {history[hoveredPoint].trustAfter}</div>
          <div
            className={
              history[hoveredPoint].change > 0
                ? 'text-green-400'
                : history[hoveredPoint].change < 0
                ? 'text-red-400'
                : ''
            }
          >
            변화: {history[hoveredPoint].change > 0 ? '+' : ''}
            {history[hoveredPoint].change}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrustHistoryChart;
