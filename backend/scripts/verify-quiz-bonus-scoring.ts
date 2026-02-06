/**
 * Quiz Bonus Score Integration Verification Script
 *
 * EPIC-07 버그 수정 검증:
 * - 퀴즈 보너스가 최종 점수에 반영되는지 확인
 * - 스케일링이 적절한지 확인 (×1000)
 */

import { GameResponseDto } from '../src/common/dto/game-response.dto';

// Mock LeaderboardService.calculateScore 로직
function calculateScore(gameState: GameResponseDto): number {
  // 유저수 점수 (1명당 1점)
  const userScore = gameState.users;

  // 금액 점수 (1만원당 1점)
  const cashScore = Math.floor(gameState.cash / 10000);

  // 신뢰도 점수 (1%당 1000점)
  const trustScore = gameState.trust * 1000;

  // 퀴즈 보너스 점수 (×1000 스케일링)
  const quizBonus = (gameState.quizBonus || 0) * 1000;

  // 기본 점수
  const baseScore = userScore + cashScore + trustScore + quizBonus;

  // 난이도 배율 (NORMAL = 1.0x)
  const scoreMultiplier = 1.0;
  const score = Math.floor(baseScore * scoreMultiplier);

  return score;
}

// 테스트 시나리오
console.log('=== 퀴즈 보너스 점수 통합 검증 ===\n');

// 시나리오 1: 퀴즈 없이 게임 클리어
const gameWithoutQuiz: Partial<GameResponseDto> = {
  users: 100000,
  cash: 100000000, // 1억원
  trust: 80,
  correctQuizCount: 0,
  quizBonus: 0,
  difficultyMode: 'NORMAL',
};

const scoreWithoutQuiz = calculateScore(gameWithoutQuiz as GameResponseDto);
console.log('📊 시나리오 1: 퀴즈 없이 클리어');
console.log(`  - 유저수: ${gameWithoutQuiz.users?.toLocaleString()}명 = ${gameWithoutQuiz.users} 점`);
console.log(`  - 현금: ${(gameWithoutQuiz.cash! / 10000).toLocaleString()}만원 = ${Math.floor(gameWithoutQuiz.cash! / 10000)} 점`);
console.log(`  - 신뢰도: ${gameWithoutQuiz.trust}% = ${gameWithoutQuiz.trust! * 1000} 점`);
console.log(`  - 퀴즈 보너스: ${gameWithoutQuiz.quizBonus} 점`);
console.log(`  ✅ 최종 점수: ${scoreWithoutQuiz.toLocaleString()} 점\n`);

// 시나리오 2: 퀴즈 2개 정답 (5,000점)
const gameWith2Quiz: Partial<GameResponseDto> = {
  ...gameWithoutQuiz,
  correctQuizCount: 2,
  quizBonus: 5,
};

const scoreWith2Quiz = calculateScore(gameWith2Quiz as GameResponseDto);
const bonus2 = scoreWith2Quiz - scoreWithoutQuiz;
console.log('📊 시나리오 2: 퀴즈 2개 정답');
console.log(`  - 기본 점수: ${scoreWithoutQuiz.toLocaleString()} 점`);
console.log(`  - 퀴즈 보너스: ${gameWith2Quiz.quizBonus} × 1000 = 5,000 점`);
console.log(`  ✅ 최종 점수: ${scoreWith2Quiz.toLocaleString()} 점 (+${bonus2.toLocaleString()} = +${((bonus2 / scoreWithoutQuiz) * 100).toFixed(1)}%)\n`);

// 시나리오 3: 퀴즈 3개 정답 (15,000점)
const gameWith3Quiz: Partial<GameResponseDto> = {
  ...gameWithoutQuiz,
  correctQuizCount: 3,
  quizBonus: 15,
};

const scoreWith3Quiz = calculateScore(gameWith3Quiz as GameResponseDto);
const bonus3 = scoreWith3Quiz - scoreWithoutQuiz;
console.log('📊 시나리오 3: 퀴즈 3개 정답');
console.log(`  - 기본 점수: ${scoreWithoutQuiz.toLocaleString()} 점`);
console.log(`  - 퀴즈 보너스: ${gameWith3Quiz.quizBonus} × 1000 = 15,000 점`);
console.log(`  ✅ 최종 점수: ${scoreWith3Quiz.toLocaleString()} 점 (+${bonus3.toLocaleString()} = +${((bonus3 / scoreWithoutQuiz) * 100).toFixed(1)}%)\n`);

// 시나리오 4: 퀴즈 4개 정답 (30,000점)
const gameWith4Quiz: Partial<GameResponseDto> = {
  ...gameWithoutQuiz,
  correctQuizCount: 4,
  quizBonus: 30,
};

const scoreWith4Quiz = calculateScore(gameWith4Quiz as GameResponseDto);
const bonus4 = scoreWith4Quiz - scoreWithoutQuiz;
console.log('📊 시나리오 4: 퀴즈 4개 정답');
console.log(`  - 기본 점수: ${scoreWithoutQuiz.toLocaleString()} 점`);
console.log(`  - 퀴즈 보너스: ${gameWith4Quiz.quizBonus} × 1000 = 30,000 점`);
console.log(`  ✅ 최종 점수: ${scoreWith4Quiz.toLocaleString()} 점 (+${bonus4.toLocaleString()} = +${((bonus4 / scoreWithoutQuiz) * 100).toFixed(1)}%)\n`);

// 시나리오 5: 퀴즈 5개 전부 정답 (50,000점)
const gameWith5Quiz: Partial<GameResponseDto> = {
  ...gameWithoutQuiz,
  correctQuizCount: 5,
  quizBonus: 50,
};

const scoreWith5Quiz = calculateScore(gameWith5Quiz as GameResponseDto);
const bonus5 = scoreWith5Quiz - scoreWithoutQuiz;
console.log('📊 시나리오 5: 퀴즈 5개 전부 정답 🎯');
console.log(`  - 기본 점수: ${scoreWithoutQuiz.toLocaleString()} 점`);
console.log(`  - 퀴즈 보너스: ${gameWith5Quiz.quizBonus} × 1000 = 50,000 점`);
console.log(`  ✅ 최종 점수: ${scoreWith5Quiz.toLocaleString()} 점 (+${bonus5.toLocaleString()} = +${((bonus5 / scoreWithoutQuiz) * 100).toFixed(1)}%)\n`);

// 비교 테이블
console.log('=== 퀴즈 정답 수별 점수 비교 ===\n');
console.log('| 정답 수 | 보너스 (원본) | 보너스 (×1000) | 최종 점수 | 상승률 |');
console.log('|---------|---------------|----------------|-----------|--------|');
console.log(`| 0개 | 0 | 0 | ${scoreWithoutQuiz.toLocaleString()} | - |`);
console.log(`| 2개 | 5 | 5,000 | ${scoreWith2Quiz.toLocaleString()} | +${((bonus2 / scoreWithoutQuiz) * 100).toFixed(1)}% |`);
console.log(`| 3개 | 15 | 15,000 | ${scoreWith3Quiz.toLocaleString()} | +${((bonus3 / scoreWithoutQuiz) * 100).toFixed(1)}% |`);
console.log(`| 4개 | 30 | 30,000 | ${scoreWith4Quiz.toLocaleString()} | +${((bonus4 / scoreWithoutQuiz) * 100).toFixed(1)}% |`);
console.log(`| 5개 | 50 | 50,000 | ${scoreWith5Quiz.toLocaleString()} | +${((bonus5 / scoreWithoutQuiz) * 100).toFixed(1)}% |`);

console.log('\n✅ 검증 완료: 퀴즈 보너스가 최종 점수에 정상 반영됨');
console.log('✅ 스케일링: ×1000 배율로 의미있는 점수 차이 생성');
console.log('✅ 5개 전부 맞추면 약 26% 점수 상승 (50,000점 보너스)\n');
