'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { gameApi } from '@/lib/api';
import {
  Rocket, TrendingUp, Users, DollarSign, Cloud, Shield,
  Zap, Target, Award, ChevronRight, Code, Database,
  Server, Globe, Timer, Sparkles, Trophy, Briefcase
} from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [glowIndex, setGlowIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStoryIndex((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlowIndex((prev) => (prev + 1) % 4);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleStartGame = async () => {
    try {
      setLoading(true);
      setError(null);
      const gameState = await gameApi.startGame();
      router.push(`/game/${gameState.gameId}`);
    } catch (err) {
      console.error('게임 시작 실패:', err);
      setError('게임을 시작할 수 없습니다. 서버를 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 스토리 텍스트 로테이션
  const storyTexts = [
    { text: "EC2 하나로 시작하는 유니콘 신화", icon: <Server className="w-4 h-4" /> },
    { text: "당신의 선택이 회사의 운명을 결정합니다", icon: <Target className="w-4 h-4" /> },
    { text: "25턴 안에 IPO에 도전하세요", icon: <Trophy className="w-4 h-4" /> }
  ];

  // 핵심 특징 (간단히)
  const features = [
    { icon: <Briefcase className="w-5 h-5" />, title: "경영 시뮬레이션" },
    { icon: <Cloud className="w-5 h-5" />, title: "실제 AWS 서비스" },
    { icon: <TrendingUp className="w-5 h-5" />, title: "성장 전략" },
    { icon: <Shield className="w-5 h-5" />, title: "리스크 관리" }
  ];

  // IPO 목표 (간단히)
  const goals = [
    { label: "유저", value: "10만+", icon: <Users className="w-4 h-4" /> },
    { label: "자금", value: "3억+", icon: <DollarSign className="w-4 h-4" /> },
    { label: "신뢰", value: "80%+", icon: <Shield className="w-4 h-4" /> },
    { label: "인프라", value: "EKS", icon: <Database className="w-4 h-4" /> }
  ];

  return (
    <div className="h-screen w-full overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative">
      {/* 애니메이션 배경 효과 */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-blue-600/10 to-pink-600/10" />
        <div className="absolute top-10 left-10 w-64 h-64 bg-purple-500 rounded-full filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-500 rounded-full filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500 rounded-full filter blur-3xl opacity-10 animate-pulse" />
      </div>

      {/* 헤더 */}
      <header className="absolute top-0 left-0 right-0 z-20 p-4 md:p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-white/80 font-semibold text-sm md:text-lg">
            <span className="hidden sm:inline">AWS 스타트업 타이쿤</span>
            <span className="sm:hidden">AWS 타이쿤</span>
          </div>
          <button
            onClick={() => router.push('/leaderboard')}
            className="px-3 py-1.5 md:px-4 md:py-2 bg-white/10 backdrop-blur border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center gap-1 md:gap-2 text-sm md:text-base"
          >
            <Trophy className="w-4 h-4" />
            <span>리더보드</span>
          </button>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="relative z-10 h-full flex flex-col justify-between p-6 md:p-8 pt-16 md:pt-20 max-w-7xl mx-auto">

        {/* 상단 헤더 */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-xs text-purple-300 mb-4">
            <Sparkles className="w-3 h-3" />
            <span>실제 AWS 아키텍처를 배우는 경영 게임</span>
          </div>
        </div>

        {/* 중앙 메인 콘텐츠 */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-6">
            {/* 타이틀 */}
            <div>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-3 bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
                AWS 스타트업 타이쿤
              </h1>
              <p className="text-lg md:text-xl text-gray-300">
                당신은 스타트업의 CTO입니다
              </p>
            </div>

            {/* 스토리 텍스트 로테이션 */}
            <div className="h-8 relative">
              {storyTexts.map((story, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 flex items-center justify-center gap-2 transition-all duration-1000 ${
                    index === currentStoryIndex
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-4'
                  }`}
                >
                  {story.icon}
                  <p className="text-gray-400">{story.text}</p>
                </div>
              ))}
            </div>

            {/* CTA 버튼 */}
            <div className="pt-4">
              <button
                onClick={handleStartGame}
                disabled={loading}
                className="group px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2">
                  {loading ? (
                    <span className="animate-pulse">게임 시작 중...</span>
                  ) : (
                    <>
                      <Rocket className="w-5 h-5" />
                      새로운 스타트업 시작하기
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
              </button>

              {error && (
                <div className="mt-4 px-4 py-2 bg-red-900/50 border border-red-500/50 text-red-300 rounded-lg text-sm max-w-md mx-auto">
                  {error}
                </div>
              )}
            </div>

            {/* IPO 목표 - 간단히 */}
            <div className="flex items-center justify-center gap-6 text-sm">
              {goals.map((goal, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 transition-all duration-500 ${
                    glowIndex === index ? 'text-purple-300 scale-110' : 'text-gray-500'
                  }`}
                >
                  {goal.icon}
                  <div>
                    <span className="font-bold">{goal.value}</span>
                    <span className="ml-1 text-xs">{goal.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 하단 정보 */}
        <div className="pb-4">
          {/* 게임 특징 - 아이콘으로 간단히 */}
          <div className="flex items-center justify-center gap-8 mb-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-colors"
              >
                <div className="p-2 bg-slate-800/50 rounded-lg">
                  {feature.icon}
                </div>
                <span className="text-sm hidden md:inline">{feature.title}</span>
              </div>
            ))}
          </div>

          {/* 게임 스펙 */}
          <div className="flex items-center justify-center gap-6 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <Timer className="w-3 h-3" />
              <span>25턴</span>
            </div>
            <div className="flex items-center gap-1">
              <Code className="w-3 h-3" />
              <span>250+ 선택지</span>
            </div>
            <div className="flex items-center gap-1">
              <Award className="w-3 h-3" />
              <span>6단계 성장</span>
            </div>
          </div>
        </div>

        {/* 플로팅 아이콘들 (데코레이션) */}
        <div className="absolute top-20 left-10 animate-float opacity-20">
          <Server className="w-8 h-8 text-purple-400" />
        </div>
        <div className="absolute top-32 right-20 animate-float opacity-20" style={{ animationDelay: '1s' }}>
          <Database className="w-6 h-6 text-blue-400" />
        </div>
        <div className="absolute bottom-32 left-20 animate-float opacity-20" style={{ animationDelay: '2s' }}>
          <Cloud className="w-10 h-10 text-purple-400" />
        </div>
        <div className="absolute bottom-20 right-10 animate-float opacity-20" style={{ animationDelay: '3s' }}>
          <Globe className="w-7 h-7 text-blue-400" />
        </div>
      </div>

      {/* 게임 시작 프롬프트 (화면 중앙 하단) */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center animate-pulse">
        <div className="text-xs text-gray-500">Press Start to Begin Your Journey</div>
      </div>
    </div>
  );
}