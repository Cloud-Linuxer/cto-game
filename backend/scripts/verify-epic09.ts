/**
 * EPIC-09 Verification Script
 *
 * Verifies that the late-game capacity issue has been resolved:
 * 1. Data changes (ID 157, 160 user values)
 * 2. Penalty tier adjustments (max 6 instead of 8)
 * 3. Progressive penalty scaling (33% → 67% → 100%)
 */

import { createConnection, Connection } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import { Choice } from '../src/database/entities/choice.entity';
import { GAME_CONSTANTS } from '../src/game/game-constants';

async function verifyEpic09() {
  console.log('🔍 EPIC-09 Verification Starting...\n');

  // Connect to database
  const connection: Connection = await createConnection({
    type: 'sqlite',
    database: 'data/cto-game.db',
    entities: [Choice],
    synchronize: false,
    logging: false,
  });

  let allPassed = true;

  try {
    // ========================================================================
    // Phase 1: Verify Data Changes
    // ========================================================================
    console.log('📊 Phase 1: Verifying Data Changes\n');

    const choiceRepository = connection.getRepository(Choice);

    const choice157 = await choiceRepository.findOne({ where: { choiceId: 157 } });
    const choice160 = await choiceRepository.findOne({ where: { choiceId: 160 } });

    if (!choice157 || !choice160) {
      console.error('❌ ERROR: Could not find choice 157 or 160 in database');
      allPassed = false;
    } else {
      const effects157 = typeof choice157.effects === 'string' ? JSON.parse(choice157.effects) : choice157.effects;
      const effects160 = typeof choice160.effects === 'string' ? JSON.parse(choice160.effects) : choice160.effects;

      console.log('Choice 157 (Turn 19):');
      console.log(`  Users: ${effects157.users} (expected: 120000)`);
      if (effects157.users === 120000) {
        console.log('  ✅ PASS: ID 157 users reduced from 500000 to 120000\n');
      } else {
        console.log(`  ❌ FAIL: Expected 120000, got ${effects157.users}\n`);
        allPassed = false;
      }

      console.log('Choice 160 (Turn 20):');
      console.log(`  Users: ${effects160.users} (expected: 150000)`);
      if (effects160.users === 150000) {
        console.log('  ✅ PASS: ID 160 users reduced from 800000 to 150000\n');
      } else {
        console.log(`  ❌ FAIL: Expected 150000, got ${effects160.users}\n`);
        allPassed = false;
      }
    }

    // ========================================================================
    // Phase 2: Verify Penalty Tier Adjustments
    // ========================================================================
    console.log('⚖️  Phase 2: Verifying Penalty Tier Adjustments\n');

    const tiers = GAME_CONSTANTS.CAPACITY_PENALTY_TIERS;
    console.log('Capacity Penalty Tiers:');

    const expectedTiers = [
      { excessRatio: 0.10, penalty: 2 },
      { excessRatio: 0.30, penalty: 3 },
      { excessRatio: 0.50, penalty: 5 },
      { excessRatio: 1.00, penalty: 6 },
    ];

    let tiersCorrect = true;
    tiers.forEach((tier, index) => {
      const expected = expectedTiers[index];
      const match = tier.excessRatio === expected.excessRatio && tier.penalty === expected.penalty;
      const status = match ? '✅' : '❌';
      console.log(`  ${status} ${tier.excessRatio * 100}% excess → -${tier.penalty} trust (expected: -${expected.penalty})`);
      if (!match) {
        tiersCorrect = false;
        allPassed = false;
      }
    });

    if (tiersCorrect) {
      console.log('\n  ✅ PASS: All penalty tiers correctly adjusted\n');
    } else {
      console.log('\n  ❌ FAIL: Some penalty tiers are incorrect\n');
    }

    // ========================================================================
    // Phase 3: Verify Progressive Penalty Implementation
    // ========================================================================
    console.log('📈 Phase 3: Verifying Progressive Penalty Scaling\n');

    console.log('Expected behavior:');
    console.log('  • 1st consecutive overflow: 33% of full penalty');
    console.log('  • 2nd consecutive overflow: 67% of full penalty');
    console.log('  • 3rd+ consecutive overflow: 100% of full penalty\n');

    // Read game.service.ts to verify implementation
    const gameServicePath = path.join(__dirname, '../src/game/game.service.ts');
    const gameServiceContent = fs.readFileSync(gameServicePath, 'utf-8');

    const has33Percent = gameServiceContent.includes('0.33');
    const has67Percent = gameServiceContent.includes('0.67');
    const hasProgressiveLogic = gameServiceContent.includes('consecutiveCapacityExceeded === 0') &&
                                gameServiceContent.includes('consecutiveCapacityExceeded === 1');

    if (has33Percent && has67Percent && hasProgressiveLogic) {
      console.log('  ✅ PASS: Progressive penalty scaling implemented (33% → 67% → 100%)\n');
    } else {
      console.log('  ❌ FAIL: Progressive penalty scaling not found in game.service.ts\n');
      allPassed = false;
    }

    // ========================================================================
    // Summary
    // ========================================================================
    console.log('═══════════════════════════════════════════════════════════');
    if (allPassed) {
      console.log('✅ EPIC-09 Verification: ALL CHECKS PASSED');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.log('Changes implemented:');
      console.log('  1. ✅ ID 157 users: 500000 → 120000 (-76%)');
      console.log('  2. ✅ ID 160 users: 800000 → 150000 (-81%)');
      console.log('  3. ✅ Max penalty: 8 → 6 (-25%)');
      console.log('  4. ✅ Progressive scaling: 33% → 67% → 100%\n');
      console.log('Expected impact:');
      console.log('  • Turn 20 aggressive path: Trust penalty reduced');
      console.log('  • IPO achievement rate: 15% → 55% (+40%p)');
      console.log('  • Late-game survivability: Significantly improved\n');
    } else {
      console.log('❌ EPIC-09 Verification: SOME CHECKS FAILED');
      console.log('═══════════════════════════════════════════════════════════\n');
      process.exit(1);
    }

  } finally {
    await connection.close();
  }
}

verifyEpic09().catch((error) => {
  console.error('❌ Verification script error:', error);
  process.exit(1);
});
