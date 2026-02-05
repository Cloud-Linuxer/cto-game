'use client';

import { useState } from 'react';
import TrustGauge from '@/components/metrics/TrustGauge';
import type { DifficultyMode } from '@/lib/types';

export default function TrustGaugeTestPage() {
  const [trust, setTrust] = useState<number>(50);
  const [difficulty, setDifficulty] = useState<DifficultyMode>('NORMAL');
  const [vertical, setVertical] = useState<boolean>(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-2">
            신뢰도 게이지 컴포넌트 테스트
          </h1>
          <p className="text-slate-600">
            EPIC-04 Feature 4: 신뢰도 시각화 개선 컴포넌트 데모
          </p>
        </div>

        {/* 컨트롤 패널 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">컨트롤</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 신뢰도 슬라이더 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                신뢰도: {trust}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={trust}
                onChange={(e) => setTrust(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* 난이도 선택 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                난이도 모드
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyMode)}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="EASY">학습 모드</option>
                <option value="NORMAL">도전 모드</option>
                <option value="HARD">전문가 모드</option>
              </select>
            </div>

            {/* 레이아웃 선택 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                레이아웃
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setVertical(true)}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    vertical
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  세로
                </button>
                <button
                  onClick={() => setVertical(false)}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    !vertical
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  가로
                </button>
              </div>
            </div>
          </div>

          {/* 빠른 테스트 버튼 */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              빠른 테스트
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTrust(100)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                안정 (100%)
              </button>
              <button
                onClick={() => setTrust(70)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Series C (70%)
              </button>
              <button
                onClick={() => setTrust(45)}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
              >
                Series B (45%)
              </button>
              <button
                onClick={() => setTrust(25)}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Series A (25%)
              </button>
              <button
                onClick={() => setTrust(10)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                위험 (10%)
              </button>
              <button
                onClick={() => setTrust(5)}
                className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors"
              >
                게임오버 위기 (5%)
              </button>
            </div>
          </div>
        </div>

        {/* 게이지 미리보기 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 현재 설정 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
              현재 설정 미리보기
            </h2>
            <div className={vertical ? 'max-w-xs mx-auto' : ''}>
              <TrustGauge
                trust={trust}
                difficultyMode={difficulty}
                vertical={vertical}
              />
            </div>
          </div>

          {/* 모든 구간 비교 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
              모든 신뢰도 구간 비교
            </h2>
            <div className="space-y-4">
              {[
                { value: 85, label: '안정적 신뢰 (70+)' },
                { value: 60, label: '보통 (50-70)' },
                { value: 40, label: '주의 필요 (30-50)' },
                { value: 20, label: '위기 경고 (15-30)' },
                { value: 8, label: '즉시 대응 필요! (0-15)' },
              ].map((level) => (
                <div key={level.value}>
                  <div className="text-xs text-slate-600 mb-1">{level.label}</div>
                  <TrustGauge
                    trust={level.value}
                    difficultyMode={difficulty}
                    vertical={false}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 난이도별 임계값 비교 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            난이도별 투자 임계값
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th className="text-left py-2 px-4">난이도</th>
                  <th className="text-right py-2 px-4">Series C</th>
                  <th className="text-right py-2 px-4">Series B</th>
                  <th className="text-right py-2 px-4">Series A</th>
                  <th className="text-right py-2 px-4">게임오버</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="py-2 px-4 font-medium">학습 모드</td>
                  <td className="text-right py-2 px-4">55%</td>
                  <td className="text-right py-2 px-4">35%</td>
                  <td className="text-right py-2 px-4">20%</td>
                  <td className="text-right py-2 px-4 text-red-600 font-bold">5%</td>
                </tr>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <td className="py-2 px-4 font-medium">도전 모드</td>
                  <td className="text-right py-2 px-4">65%</td>
                  <td className="text-right py-2 px-4">45%</td>
                  <td className="text-right py-2 px-4">25%</td>
                  <td className="text-right py-2 px-4 text-red-600 font-bold">10%</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-2 px-4 font-medium">전문가 모드</td>
                  <td className="text-right py-2 px-4">75%</td>
                  <td className="text-right py-2 px-4">55%</td>
                  <td className="text-right py-2 px-4">35%</td>
                  <td className="text-right py-2 px-4 text-red-600 font-bold">15%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 설명 */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-lg p-6 mt-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-3">
            컴포넌트 특징
          </h2>
          <ul className="space-y-2 text-slate-700">
            <li className="flex items-start gap-2">
              <span className="text-purple-600 font-bold">✓</span>
              <span>5단계 색상 구간: 안정(녹색) → 보통(파랑) → 주의(노랑) → 위기(주황) → 즉시대응(빨강)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 font-bold">✓</span>
              <span>난이도별 투자 임계값 마커 표시 (Series A/B/C, 게임오버 라인)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 font-bold">✓</span>
              <span>위기 상황 시 Pulse 애니메이션 효과 (신뢰도 15% 미만)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 font-bold">✓</span>
              <span>반응형 레이아웃: 세로(Desktop) / 가로(Mobile)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 font-bold">✓</span>
              <span>부드러운 transition 애니메이션 (500ms)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 font-bold">✓</span>
              <span>현재 상태 메시지로 상황 즉시 파악 가능</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
