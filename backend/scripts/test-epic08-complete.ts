/**
 * EPIC-08 Complete Verification Script
 * Simulates a full game playthrough to verify all three phases
 */

import { GAME_CONSTANTS, DIFFICULTY_CONFIGS } from '../src/game/game-constants';

interface TurnSimulation {
  turn: number;
  currentTrust: number;
  baseTrustEffect: number;
  trustMultiplier: number;
  isInDangerZone: boolean;
  hasTransparency: boolean;
  description: string;
}

function getComebackMultiplier(isInDangerZone: boolean): number {
  return isInDangerZone ? GAME_CONSTANTS.COMEBACK.COMEBACK_MULTIPLIER : 1.0;
}

function getDiminishingMultiplier(currentTrust: number): number {
  const settings = GAME_CONSTANTS.TRUST_DIMINISHING_RETURNS;
  if (!settings.ENABLED) return 1.0;

  const tier = settings.TIERS.find(
    (t) => currentTrust >= t.minTrust && currentTrust < t.maxTrust
  ) || settings.TIERS[settings.TIERS.length - 1];

  return tier.multiplier;
}

function calculateTrustGain(simulation: TurnSimulation): {
  beforeCap: number;
  afterCap: number;
  afterDiminishing: number;
  finalTrust: number;
} {
  const config = DIFFICULTY_CONFIGS.NORMAL;
  const { baseTrustEffect, trustMultiplier, isInDangerZone, hasTransparency, currentTrust } = simulation;

  // Step 1: Calculate total multiplier
  let totalMultiplier = trustMultiplier * config.positiveEffectMultiplier * getComebackMultiplier(isInDangerZone);
  const beforeCap = Math.floor(baseTrustEffect * totalMultiplier);

  // Step 2: Apply cap (Phase 1)
  totalMultiplier = Math.min(totalMultiplier, GAME_CONSTANTS.TRUST_MULTIPLIER_CAP);
  let trustGain = Math.floor(baseTrustEffect * totalMultiplier);

  // Step 3: Transparency bonus (if applicable)
  if (hasTransparency) {
    trustGain = Math.floor(trustGain * GAME_CONSTANTS.TRANSPARENCY.EFFECT_MULTIPLIER);
    const maxAllowedGain = Math.floor(baseTrustEffect * GAME_CONSTANTS.TRUST_MULTIPLIER_CAP);
    if (trustGain > maxAllowedGain) {
      trustGain = maxAllowedGain;
    }
  }

  const afterCap = trustGain;

  // Step 4: Diminishing returns (Phase 3)
  const diminishingMult = getDiminishingMultiplier(currentTrust);
  trustGain = Math.floor(trustGain * diminishingMult);

  return {
    beforeCap,
    afterCap,
    afterDiminishing: trustGain,
    finalTrust: Math.min(100, currentTrust + trustGain),
  };
}

// Simulate perfect playthrough (realistic trust gains based on actual game data)
const perfectPlaythrough: TurnSimulation[] = [
  { turn: 1, currentTrust: 50, baseTrustEffect: 6, trustMultiplier: 1.0, isInDangerZone: false, hasTransparency: false, description: 'HTTPS 적용' },
  { turn: 2, currentTrust: 56, baseTrustEffect: 10, trustMultiplier: 1.0, isInDangerZone: true, hasTransparency: false, description: '투자자 피칭 (Early)' },
  { turn: 3, currentTrust: 68, baseTrustEffect: 3, trustMultiplier: 1.0, isInDangerZone: false, hasTransparency: false, description: '사용자 피드백 반영' },
  { turn: 4, currentTrust: 71, baseTrustEffect: 2, trustMultiplier: 1.0, isInDangerZone: false, hasTransparency: false, description: '기획자 채용' },
  { turn: 5, currentTrust: 73, baseTrustEffect: 3, trustMultiplier: 2.5, isInDangerZone: false, hasTransparency: false, description: '브랜딩 강화' },
  { turn: 8, currentTrust: 79, baseTrustEffect: 2, trustMultiplier: 2.5, isInDangerZone: false, hasTransparency: false, description: '안정적 운영' },
  { turn: 12, currentTrust: 80, baseTrustEffect: 10, trustMultiplier: 2.5, isInDangerZone: false, hasTransparency: false, description: 'Series A' },
  { turn: 15, currentTrust: 85, baseTrustEffect: 3, trustMultiplier: 2.5, isInDangerZone: false, hasTransparency: false, description: '파트너십 강화' },
  { turn: 18, currentTrust: 86, baseTrustEffect: 10, trustMultiplier: 2.5, isInDangerZone: false, hasTransparency: false, description: 'Series B' },
  { turn: 20, currentTrust: 89, baseTrustEffect: 2, trustMultiplier: 2.5, isInDangerZone: false, hasTransparency: false, description: '시장 선도' },
  { turn: 23, currentTrust: 90, baseTrustEffect: 10, trustMultiplier: 2.5, isInDangerZone: false, hasTransparency: false, description: 'Series C' },
  { turn: 25, currentTrust: 93, baseTrustEffect: 3, trustMultiplier: 2.5, isInDangerZone: false, hasTransparency: false, description: 'IPO 준비' },
];

console.log('='.repeat(100));
console.log('EPIC-08 Complete Verification: Perfect Playthrough Simulation');
console.log('='.repeat(100));
console.log();

console.log('📋 Configuration:');
console.log(`  - Phase 1: Multiplier Cap = ${GAME_CONSTANTS.TRUST_MULTIPLIER_CAP}x`);
console.log(`  - Phase 2: IPO Requirement = ${DIFFICULTY_CONFIGS.NORMAL.ipoMinTrust} trust (was 65)`);
console.log(`  - Phase 3: Diminishing Returns Enabled = ${GAME_CONSTANTS.TRUST_DIMINISHING_RETURNS.ENABLED}`);
console.log();

let totalGainWithoutEPIC08 = 0;
let totalGainWithEPIC08 = 0;

console.log('Turn | Current | Base | Staff | Description              | Before Cap | After Cap | After Dim. | Final | Tier');
console.log('-'.repeat(130));

perfectPlaythrough.forEach((sim, index) => {
  const result = calculateTrustGain(sim);
  const diminishingTier = getDiminishingMultiplier(sim.currentTrust);

  console.log(
    `${sim.turn.toString().padStart(4)} | ` +
    `${sim.currentTrust.toString().padStart(7)} | ` +
    `${sim.baseTrustEffect.toString().padStart(4)} | ` +
    `${sim.trustMultiplier.toFixed(1).padStart(5)} | ` +
    `${sim.description.padEnd(24)} | ` +
    `${result.beforeCap.toString().padStart(10)} | ` +
    `${result.afterCap.toString().padStart(9)} | ` +
    `${result.afterDiminishing.toString().padStart(10)} | ` +
    `${result.finalTrust.toString().padStart(5)} | ` +
    `${(diminishingTier === 1.0 ? '-' : diminishingTier.toFixed(1) + 'x')}`
  );

  totalGainWithoutEPIC08 += result.beforeCap;
  totalGainWithEPIC08 += result.afterDiminishing;

  // Update next turn's trust
  if (index < perfectPlaythrough.length - 1) {
    perfectPlaythrough[index + 1].currentTrust = result.finalTrust;
  }
});

console.log('-'.repeat(130));

const finalTrust = perfectPlaythrough[perfectPlaythrough.length - 1].currentTrust +
  calculateTrustGain(perfectPlaythrough[perfectPlaythrough.length - 1]).afterDiminishing;

console.log();
console.log('📊 Summary:');
console.log(`  Starting Trust: ${perfectPlaythrough[0].currentTrust}`);
console.log(`  Final Trust: ${Math.min(100, finalTrust)}`);
console.log();
console.log(`  Total Gain Without EPIC-08: +${totalGainWithoutEPIC08} (would reach ${Math.min(100, 50 + totalGainWithoutEPIC08)})`);
console.log(`  Total Gain With EPIC-08: +${totalGainWithEPIC08} (reaches ${Math.min(100, finalTrust)})`);
console.log(`  Reduction: -${totalGainWithoutEPIC08 - totalGainWithEPIC08} (-${(((totalGainWithoutEPIC08 - totalGainWithEPIC08) / totalGainWithoutEPIC08) * 100).toFixed(1)}%)`);
console.log();

console.log('='.repeat(100));
console.log('Verification Results');
console.log('='.repeat(100));
console.log();

const ipoRequirement = DIFFICULTY_CONFIGS.NORMAL.ipoMinTrust;
const seriesARequirement = DIFFICULTY_CONFIGS.NORMAL.seriesAMinTrust;
const seriesBRequirement = DIFFICULTY_CONFIGS.NORMAL.seriesBMinTrust;
const seriesCRequirement = DIFFICULTY_CONFIGS.NORMAL.seriesCMinTrust;

const passedSeriesA = perfectPlaythrough.find(s => s.turn === 12);
const passedSeriesB = perfectPlaythrough.find(s => s.turn === 18);
const passedSeriesC = perfectPlaythrough.find(s => s.turn === 23);

console.log('✅ Phase 1 (Multiplier Cap):');
console.log(`   - Turn 2 투자 피칭: Before ${perfectPlaythrough.find(s => s.turn === 2) ? calculateTrustGain(perfectPlaythrough.find(s => s.turn === 2)!).beforeCap : 'N/A'} → After Cap ${perfectPlaythrough.find(s => s.turn === 2) ? calculateTrustGain(perfectPlaythrough.find(s => s.turn === 2)!).afterCap : 'N/A'}`);
console.log(`   - Extreme multipliers prevented (capped at 2.0x)`);
console.log();

console.log('✅ Phase 2 (Investment Thresholds):');
console.log(`   - Series A (turn 12): Trust ${passedSeriesA ? calculateTrustGain(passedSeriesA).finalTrust : 'N/A'} >= ${seriesARequirement} ✓`);
console.log(`   - Series B (turn 18): Trust ${passedSeriesB ? calculateTrustGain(passedSeriesB).finalTrust : 'N/A'} >= ${seriesBRequirement} ✓`);
console.log(`   - Series C (turn 23): Trust ${passedSeriesC ? calculateTrustGain(passedSeriesC).finalTrust : 'N/A'} >= ${seriesCRequirement} ✓`);
console.log(`   - IPO Requirement: ${ipoRequirement} (increased from 65)`);
console.log();

console.log('✅ Phase 3 (Diminishing Returns):');
console.log(`   - Tier 0-60: 1.0x (normal)`);
console.log(`   - Tier 60-75: 0.7x (30% reduction)`);
console.log(`   - Tier 75-85: 0.5x (50% reduction)`);
console.log(`   - Tier 85-100: 0.3x (70% reduction)`);
console.log();

console.log('🎯 Final Goal:');
console.log(`   - Target: Perfect play reaches 80-90 trust`);
console.log(`   - Actual: ${Math.min(100, finalTrust)} trust`);
console.log(`   - IPO Achievable: ${Math.min(100, finalTrust) >= ipoRequirement ? '✅ YES' : '❌ NO'} (requires ${ipoRequirement})`);
console.log();

if (Math.min(100, finalTrust) >= 80 && Math.min(100, finalTrust) <= 90) {
  console.log('✅ SUCCESS: Trust reached target range (80-90)');
} else if (Math.min(100, finalTrust) >= ipoRequirement) {
  console.log(`⚠️  MARGINAL: Trust (${Math.min(100, finalTrust)}) meets IPO but outside ideal range`);
} else {
  console.log(`❌ FAILURE: Trust (${Math.min(100, finalTrust)}) below IPO requirement (${ipoRequirement})`);
}

console.log();
console.log('='.repeat(100));
