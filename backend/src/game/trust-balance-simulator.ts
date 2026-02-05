/**
 * EPIC-04 Feature 3: Trust Balance Simulator
 *
 * Simulates 3 playstyles (optimal, moderate, crisis) through 25 turns
 * to verify all paths can reach victory with the new trust recovery mechanisms:
 *
 * 1. Crisis Recovery Bonus: increased from 3 to 5
 * 2. Stable Operations Bonus: +3 trust for 3 consecutive turns at ≤80% capacity
 * 3. Transparency Bonus: 1.5x trust recovery for transparency-tagged choices
 * 4. Natural Recovery: +1-2 per turn when trust < 30
 */

import { GAME_CONSTANTS, DIFFICULTY_CONFIGS } from './game-constants';

interface SimulationState {
  turn: number;
  trust: number;
  users: number;
  maxCapacity: number;
  consecutiveStableTurns: number;
  consecutiveCapacityExceeded: number;
  capacityExceededCount: number;
  resilienceStacks: number;
  capacityWarningActive: boolean;
}

interface TurnAction {
  userGain: number;
  trustEffect: number;
  infraUpgrade?: boolean; // does this turn add capacity?
  capacityIncrease?: number;
  transparencyChoice?: boolean; // is this a transparency-tagged choice?
}

type Playstyle = 'optimal' | 'moderate' | 'crisis';

/**
 * Simulate a single turn of gameplay
 */
function simulateTurn(
  state: SimulationState,
  action: TurnAction,
  playstyle: Playstyle,
): void {
  const config = DIFFICULTY_CONFIGS.NORMAL;

  // --- Turn start: Natural recovery ---
  if (state.trust < GAME_CONSTANTS.TRUST_RECOVERY.THRESHOLD) {
    let recovery = 0;
    if (state.trust < GAME_CONSTANTS.TRUST_RECOVERY.DANGER_THRESHOLD) {
      recovery = GAME_CONSTANTS.TRUST_RECOVERY.DANGER_RECOVERY_AMOUNT;
    } else {
      recovery = GAME_CONSTANTS.TRUST_RECOVERY.RECOVERY_AMOUNT;
    }
    // Add resilience stack bonus
    recovery += state.resilienceStacks * GAME_CONSTANTS.RESILIENCE.TRUST_RECOVERY_PER_STACK;
    state.trust = Math.min(GAME_CONSTANTS.TRUST_RECOVERY.MAX_NATURAL, state.trust + recovery);
  }

  // --- Apply action effects ---
  state.users += action.userGain;
  let trustChange = action.trustEffect;

  // Transparency bonus (1.5x trust recovery if capacity warning is active)
  if (action.transparencyChoice && state.capacityWarningActive && trustChange > 0) {
    trustChange = Math.floor(trustChange * GAME_CONSTANTS.TRANSPARENCY.EFFECT_MULTIPLIER);
  }

  state.trust += trustChange;

  // Infrastructure upgrade
  if (action.infraUpgrade && action.capacityIncrease) {
    state.maxCapacity += action.capacityIncrease;
  }

  // --- Capacity check ---
  if (state.users > state.maxCapacity) {
    // Capacity exceeded
    const excessRatio = (state.users - state.maxCapacity) / state.maxCapacity;
    let penalty = 8; // default max penalty

    // Find applicable penalty tier
    for (const tier of GAME_CONSTANTS.CAPACITY_PENALTY_TIERS) {
      if (excessRatio >= tier.excessRatio) {
        penalty = tier.penalty;
      }
    }

    // First capacity exceeded: 50% penalty
    if (state.consecutiveCapacityExceeded === 0) {
      penalty = Math.floor(penalty * 0.5);
    }

    state.trust = Math.max(0, state.trust - penalty);
    state.capacityExceededCount++;

    // Award resilience stack (max 3)
    if (state.resilienceStacks < GAME_CONSTANTS.RESILIENCE.MAX_STACKS) {
      state.resilienceStacks++;
    }

    // Crisis recovery bonus (+5 trust)
    if (state.resilienceStacks > 0) {
      const crisisBonus = GAME_CONSTANTS.TRUST_RECOVERY.CRISIS_RECOVERY_BONUS;
      state.trust = Math.min(100, state.trust + crisisBonus);
    }

    state.consecutiveCapacityExceeded++;
    state.capacityWarningActive = true;
    state.consecutiveStableTurns = 0;
  } else {
    // Capacity OK
    state.consecutiveCapacityExceeded = 0;
    state.capacityWarningActive = false;

    // Stable operations bonus check
    const capacityRatio = state.users / state.maxCapacity;
    if (capacityRatio <= GAME_CONSTANTS.STABLE_OPERATIONS.CAPACITY_THRESHOLD) {
      state.consecutiveStableTurns++;
      if (state.consecutiveStableTurns >= GAME_CONSTANTS.STABLE_OPERATIONS.REQUIRED_TURNS) {
        const stableBonus = GAME_CONSTANTS.STABLE_OPERATIONS.TRUST_BONUS;
        state.trust = Math.min(100, state.trust + stableBonus);
        state.consecutiveStableTurns = 0; // Reset after bonus
      }
    } else {
      state.consecutiveStableTurns = 0;
    }
  }

  // Clamp trust to 0-100 range
  state.trust = Math.max(0, Math.min(100, state.trust));

  state.turn++;
}

/**
 * Define turn-by-turn actions for each playstyle
 */
function getPlaystyleActions(playstyle: Playstyle): TurnAction[] {
  const actions: TurnAction[] = [];

  if (playstyle === 'optimal') {
    // Optimal: Always upgrade before capacity exceeded
    for (let i = 1; i <= 25; i++) {
      if (i === 3 || i === 6 || i === 9 || i === 12 || i === 15 || i === 18 || i === 21) {
        // Infrastructure upgrade turns
        actions.push({
          userGain: 3000,
          trustEffect: 2,
          infraUpgrade: true,
          capacityIncrease: 15000,
        });
      } else {
        // Growth turns
        actions.push({
          userGain: 5000,
          trustEffect: 1,
        });
      }
    }
  } else if (playstyle === 'moderate') {
    // Moderate: Occasionally hits capacity but recovers quickly
    for (let i = 1; i <= 25; i++) {
      if (i === 5 || i === 10 || i === 15 || i === 20) {
        // Infrastructure upgrade turns (slightly delayed)
        actions.push({
          userGain: 2000,
          trustEffect: 1,
          infraUpgrade: true,
          capacityIncrease: 20000,
        });
      } else if (i === 6 || i === 16) {
        // Transparency choices after capacity issues
        actions.push({
          userGain: 3000,
          trustEffect: 3,
          transparencyChoice: true,
        });
      } else {
        // Regular growth
        actions.push({
          userGain: 4000,
          trustEffect: 1,
        });
      }
    }
  } else if (playstyle === 'crisis') {
    // Crisis: Frequently hits capacity, relies heavily on recovery mechanisms
    for (let i = 1; i <= 25; i++) {
      if (i === 8 || i === 16 || i === 22) {
        // Late infrastructure upgrades
        actions.push({
          userGain: 1000,
          trustEffect: 0,
          infraUpgrade: true,
          capacityIncrease: 25000,
        });
      } else if (i === 9 || i === 17 || i === 23) {
        // Transparency choices right after crises
        actions.push({
          userGain: 2000,
          trustEffect: 5,
          transparencyChoice: true,
        });
      } else {
        // Aggressive growth
        actions.push({
          userGain: 6000,
          trustEffect: 0,
        });
      }
    }
  }

  return actions;
}

/**
 * Run simulation for a specific playstyle
 */
function runSimulation(playstyle: Playstyle): SimulationState {
  const config = DIFFICULTY_CONFIGS.NORMAL;
  const state: SimulationState = {
    turn: 1,
    trust: config.initialTrust,
    users: 0,
    maxCapacity: config.initialMaxCapacity,
    consecutiveStableTurns: 0,
    consecutiveCapacityExceeded: 0,
    capacityExceededCount: 0,
    resilienceStacks: 0,
    capacityWarningActive: false,
  };

  const actions = getPlaystyleActions(playstyle);

  console.log(`\n========== ${playstyle.toUpperCase()} PLAYSTYLE ==========`);
  console.log(`Turn | Trust | Users  | Capacity | Stable | Exceeded | Resilience`);
  console.log(`-----|-------|--------|----------|--------|----------|------------`);

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    simulateTurn(state, action, playstyle);

    console.log(
      `  ${state.turn.toString().padStart(2)} | ` +
        `${state.trust.toString().padStart(5)} | ` +
        `${state.users.toString().padStart(6)} | ` +
        `${state.maxCapacity.toString().padStart(8)} | ` +
        `${state.consecutiveStableTurns.toString().padStart(6)} | ` +
        `${state.consecutiveCapacityExceeded.toString().padStart(8)} | ` +
        `${state.resilienceStacks.toString().padStart(10)}`,
    );
  }

  return state;
}

/**
 * Check if final state meets victory conditions
 */
function checkVictory(state: SimulationState, playstyle: Playstyle): boolean {
  const config = DIFFICULTY_CONFIGS.NORMAL;

  // Check minimum trust threshold for any victory path
  const minTrustForVictory = Math.min(
    config.ipoMinTrust,
    50, // PROFITABILITY path
  );

  const meetsMinimum = state.trust >= minTrustForVictory;

  console.log(`\n--- Final State ---`);
  console.log(`Trust: ${state.trust} (min: ${minTrustForVictory})`);
  console.log(`Users: ${state.users}`);
  console.log(`Capacity Exceeded Count: ${state.capacityExceededCount}`);
  console.log(`Resilience Stacks: ${state.resilienceStacks}`);
  console.log(`\nVictory Possible: ${meetsMinimum ? '✅ YES' : '❌ NO'}`);

  return meetsMinimum;
}

/**
 * Main simulator entry point
 */
export function runTrustBalanceSimulation(): void {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║     EPIC-04 Feature 3: Trust Balance Simulation (NORMAL)      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  const playstyles: Playstyle[] = ['optimal', 'moderate', 'crisis'];
  const results: Record<Playstyle, boolean> = {} as any;

  for (const style of playstyles) {
    const finalState = runSimulation(style);
    results[style] = checkVictory(finalState, style);
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                        SUMMARY                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`Optimal Playstyle:   ${results.optimal ? '✅ Victory Possible' : '❌ Victory Not Possible'}`);
  console.log(`Moderate Playstyle:  ${results.moderate ? '✅ Victory Possible' : '❌ Victory Not Possible'}`);
  console.log(`Crisis Playstyle:    ${results.crisis ? '✅ Victory Possible' : '❌ Victory Not Possible'}`);

  const allPass = results.optimal && results.moderate && results.crisis;
  console.log(`\nOverall Balance:     ${allPass ? '✅ BALANCED' : '⚠️ NEEDS ADJUSTMENT'}`);

  if (!allPass) {
    console.log('\n⚠️  Trust recovery mechanisms may need further tuning.');
  }
}

// Run simulation if executed directly
if (require.main === module) {
  runTrustBalanceSimulation();
}
