'use client';

import { useEffect } from 'react';
import type { Turn } from '@/lib/types';

interface EmergencyEventModalProps {
  turn: Turn;
  onClose: () => void;
}

export default function EmergencyEventModal({ turn, onClose }: EmergencyEventModalProps) {
  // ESC 키로 닫기 방지 (긴급 이벤트는 반드시 확인해야 함)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl animate-scaleIn overflow-hidden">
        {/* Alert Header with Animation */}
        <div className="relative bg-gradient-to-r from-red-600 via-red-500 to-orange-500 px-6 py-4 overflow-hidden">
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.1)_10px,rgba(255,255,255,0.1)_20px)] animate-pulse"></div>
          </div>

          {/* Alert Icon & Title */}
          <div className="relative flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-full animate-bounce">
              <span className="text-3xl sm:text-4xl">🚨</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-ping animation-delay-150"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-ping animation-delay-300"></div>
                </div>
                <span className="text-white/90 text-xs sm:text-sm font-bold tracking-wider uppercase">
                  긴급 상황 발생
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white drop-shadow-lg">
                ⚠️ 긴급 이벤트 알림!
              </h2>
            </div>
          </div>
        </div>

        {/* Event Content */}
        <div className="p-6 sm:p-8 max-h-[60vh] overflow-y-auto">
          {/* Turn Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border-2 border-red-200 rounded-full mb-6">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm font-bold text-red-700">긴급 턴 {turn.turnNumber}</span>
          </div>

          {/* Event Description */}
          <div className="bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-6 rounded-xl border-2 border-red-200 mb-6">
            <div className="prose prose-lg max-w-none">
              <p className="text-base sm:text-lg font-semibold text-gray-900 leading-relaxed whitespace-pre-line">
                {turn.eventText}
              </p>
            </div>
          </div>

          {/* Warning Box */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg mb-6">
            <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900 mb-1">
                즉시 대응이 필요합니다
              </p>
              <p className="text-sm text-amber-800">
                이 상황은 비즈니스에 중대한 영향을 미칠 수 있습니다. 신중하게 선택지를 검토하고 결정하세요.
              </p>
            </div>
          </div>

          {/* Choice Count Info */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-sm font-medium text-blue-900">
                {turn.choices.length}개의 대응 방안 준비됨
              </span>
            </div>
            <span className="text-xs text-blue-700 font-semibold uppercase tracking-wide">
              신중히 선택하세요
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-6 sm:p-8 pt-0">
          <button
            onClick={onClose}
            className="w-full px-6 py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white text-base sm:text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>대응 방안 확인하기</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .animation-delay-150 {
          animation-delay: 150ms;
        }

        .animation-delay-300 {
          animation-delay: 300ms;
        }
      `}</style>
    </div>
  );
}
