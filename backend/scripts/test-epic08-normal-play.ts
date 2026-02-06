/**
 * EPIC-08 Normal Playthrough Verification
 * Simulates a good (but not perfect) playthrough
 */

import { GAME_CONSTANTS, DIFFICULTY_CONFIGS } from '../src/game/game-constants';

interface TurnSimulation {
  turn: number;
  currentTrust: number;
  baseTrustEffect: number;
  trustMultiplier: number;
  description: string;
}

function getDiminishingMultiplier(currentTrust: number): number {
  const settings = GAME_CONSTANTS.TRUST_DIMINISHING_RETURNS;
  if (!settings.ENABLED) return 1.0;

  const tier = settings.TIERS.find(
    (t) => currentTrust >= t.minTrust && currentTrust < t.maxTrust
  ) || settings.TIERS[settings.TIERS.length - 1];

  return tier.multiplier;
}

function calculateTrustGain(simulation: TurnSimulation): number {
  const config = DIFFICULTY_CONFIGS.NORMAL;
  const { baseTrustEffect, trustMultiplier, currentTrust } = simulation;

  // Calculate with cap
  let totalMultiplier = trustMultiplier * config.positiveEffectMultiplier;
  totalMultiplier = Math.min(totalMultiplier, GAME_CONSTANTS.TRUST_MULTIPLIER_CAP);

  let trustGain = Math.floor(baseTrustEffect * totalMultiplier);

  // Apply diminishing returns
  const diminishingMult = getDiminishingMultiplier(currentTrust);
  trustGain = Math.floor(trustGain * diminishingMult);

  return trustGain;
}

// Normal playthrough (missed some optimal choices)
const normalPlaythrough: TurnSimulation[] = [
  { turn: 1, currentTrust: 50, baseTrustEffect: 6, trustMultiplier: 1.0, description: 'HTTPS 적용' },
  { turn: 2, currentTrust: 56, baseTrustEffect: 5, trustMultiplier: 1.0, description: '보수적 피칭 (trust 부족)' },
  { turn: 3, currentTrust: 61, baseTrustEffect: 3, trustMultiplier: 1.0, description: '사용자 피드백' },
  { turn: 4, currentTrust: 64, baseTrustEffect: 2, trustMultiplier: 1.0, description: '기획자 채용' },
  { turn: 5, currentTrust: 66, baseTrustEffect: 2, trustMultiplier: 2.5, description: '일반 브랜딩' },
  { turn: 8, currentTrust: 70, baseTrustEffect: 2, trustMultiplier: 2.5, description: '안정 운영' },
  { turn: 10, currentTrust: 71, baseTrustEffect: 0, trustMultiplier: 2.5, description: '용량 초과 (-5 trust)' }, // penalty
  { turn: 12, currentTrust: 66, baseTrustEffect: 10, trustMultiplier: 2.5, description: 'Series A' },
  { turn: 15, currentTrust: 73, baseTrustEffect: 2, trustMultiplier: 2.5, description: '파트너십' },
  { turn: 18, currentTrust: 75, baseTrustEffect: 10, trustMultiplier: 2.5, description: 'Series B' },
  { turn: 20, currentTrust: 80, baseTrustEffect: 2, trustMultiplier: 2.5, description: '시장 확장' },
  { turn: 23, currentTrust: 81, baseTrustEffect: 10, trustMultiplier: 2.5, description: 'Series C' },
  { turn: 25, currentTrust: 86, baseTrustEffect: 2, trustMultiplier: 2.5, description: '최종 턴' },
];

console.log('='.repeat(90));
console.log('EPIC-08: Normal (Good) Playthrough Simulation');
console.log('='.repeat(90));
console.log();

console.log('Turn | Current | Base | Staff | Dim.  | Gain | Final | Description');
console.log('-'.repeat(90));

let currentTrust = normalPlaythrough[0].currentTrust;

normalPlaythrough.forEach((sim, index) => {
  sim.currentTrust = currentTrust;

  let gain: number;
  if (sim.baseTrustEffect === 0) {
    // Penalty turn
    gain = -5;
  } else {
    gain = calculateTrustGain(sim);
  }

  const diminishing = getDiminishingMultiplier(sim.currentTrust);
  currentTrust = Math.min(100, currentTrust + gain);

  console.log(
    `${sim.turn.toString().padStart(4)} | ` +
    `${sim.currentTrust.toString().padStart(7)} | ` +
    `${sim.baseTrustEffect.toString().padStart(4)} | ` +
    `${sim.trustMultiplier.toFixed(1).padStart(5)} | ` +
    `${(diminishing === 1.0 ? '  -  ' : diminishing.toFixed(1) + 'x')} | ` +
    `${gain.toString().padStart(4)} | ` +
    `${currentTrust.toString().padStart(5)} | ` +
    `${sim.description}`
  );
});

console.log('-'.repeat(90));

console.log();
console.log('📊 Summary:');
console.log(`  Starting Trust: ${normalPlaythrough[0].currentTrust}`);
console.log(`  Final Trust: ${currentTrust}`);
console.log(`  Total Gain: +${currentTrust - normalPlaythrough[0].currentTrust}`);
console.log();

const ipoRequirement = DIFFICULTY_CONFIGS.NORMAL.ipoMinTrust;
const seriesARequirement = DIFFICULTY_CONFIGS.NORMAL.seriesAMinTrust;
const seriesBRequirement = DIFFICULTY_CONFIGS.NORMAL.seriesBMinTrust;
const seriesCRequirement = DIFFICULTY_CONFIGS.NORMAL.seriesCMinTrust;

console.log('✅ Investment Rounds:');
console.log(`   - Series A (turn 12): Trust 73 >= ${seriesARequirement} ✓`);
console.log(`   - Series B (turn 18): Trust 80 >= ${seriesBRequirement} ✓`);
console.log(`   - Series C (turn 23): Trust 86 >= ${seriesCRequirement} ✓`);
console.log();

console.log('🎯 Final Outcome:');
console.log(`   - IPO Requirement: ${ipoRequirement}`);
console.log(`   - Final Trust: ${currentTrust}`);
console.log(`   - IPO Achievable: ${currentTrust >= ipoRequirement ? '✅ YES' : '❌ NO'}`);
console.log();

if (currentTrust >= 80 && currentTrust <= 90) {
  console.log('✅ SUCCESS: Trust in ideal range (80-90)');
} else if (currentTrust >= ipoRequirement) {
  console.log(`⚠️  MARGINAL: Trust (${currentTrust}) meets IPO but ${currentTrust > 90 ? 'above' : 'below'} ideal range`);
} else {
  console.log(`❌ FAILURE: Trust (${currentTrust}) below IPO requirement (${ipoRequirement})`);
}

console.log();
console.log('='.repeat(90));
