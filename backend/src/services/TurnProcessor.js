import seedrandom from 'seedrandom';
import FormulaEngine from './FormulaEngine.js';
import gameConfig from '../config/config.js';

/**
 * TurnProcessor: Orchestrates complete turn cycle
 * Implements the turn processing algorithm from BACKEND_POLICY.md
 */
class TurnProcessor {
  constructor(config = gameConfig) {
    this.config = config;
    this.formulaEngine = new FormulaEngine(config);
  }

  /**
   * Process end of turn - complete turn cycle
   * Algorithm from BACKEND_POLICY.md Section 8
   */
  processTurn(state) {
    const results = {
      turn: state.turn,
      events: [],
      warnings: [],
      gameOver: false,
      gameStatus: null
    };

    // 1. Check if game should end
    if (state.turn >= this.config.game.max_turns) {
      results.gameOver = true;
      results.gameStatus = 'victory';
      results.finalScore = this.formulaEngine.calculateFinalScore(state);
      results.finalGrade = this.formulaEngine.calculateGrade(results.finalScore);
      return results;
    }

    // 2. Process delayed events from queue
    const delayedEvents = this.processDelayedEvents(state);
    results.events.push(...delayedEvents);

    // 3. Update MAU based on performance
    const oldMAU = state.mau;
    state.mau = this.formulaEngine.calculateMAUGrowth(state);
    results.mauChange = state.mau - oldMAU;

    // 4. Deduct monthly burn from cash
    state.cash -= state.burn_monthly;

    // 5. Natural security decay
    state.security = Math.max(0, state.security - this.config.growth.security_decay_per_turn);

    // 6. Check for system failures
    const failures = this.checkFailureConditions(state, results);
    if (failures.gameOver) {
      return failures;
    }

    // 7. Generate events for this turn
    const generatedEvents = this.generateEvents(state);
    results.events.push(...generatedEvents);

    // 8. Update timers
    this.updateTimers(state, results);

    // 9. Recalculate all metrics
    this.formulaEngine.updateMetrics(state);

    // 10. Advance turn
    state.turn += 1;

    // 11. Update action cap for new turn
    state.action_cap = this.formulaEngine.calculateActionCap(state);

    return results;
  }

  /**
   * Process delayed events from queue
   */
  processDelayedEvents(state) {
    const events = [];
    const remaining = [];

    for (const delayed of state.queue_delayed) {
      if (delayed.turn === state.turn) {
        // Event triggers this turn
        events.push({
          type: 'delayed',
          code: delayed.event_code,
          title: delayed.title,
          description: delayed.description,
          effect: delayed.effect
        });

        // Apply effect
        if (delayed.effect) {
          this.applyEventEffect(state, delayed.effect);
        }
      } else {
        remaining.push(delayed);
      }
    }

    state.queue_delayed = remaining;
    return events;
  }

  /**
   * Check for failure conditions
   */
  checkFailureConditions(state, results) {
    // Check bankruptcy
    if (state.cash < 0) {
      if (!state.timers.bankruptIn) {
        state.timers.bankruptIn = this.config.bankruptcy_grace_turns;
        results.warnings.push({
          type: 'bankruptcy_warning',
          message: `Negative cash! You have ${state.timers.bankruptIn} turns to recover`,
          severity: 'critical'
        });
      } else {
        state.timers.bankruptIn -= 1;
        if (state.timers.bankruptIn <= 0) {
          return {
            turn: state.turn,
            events: results.events,
            warnings: results.warnings,
            gameOver: true,
            gameStatus: 'bankruptcy',
            reason: 'Failed to recover from negative cash'
          };
        }
        results.warnings.push({
          type: 'bankruptcy_countdown',
          message: `${state.timers.bankruptIn} turns until bankruptcy`,
          severity: 'critical'
        });
      }
    } else if (state.timers.bankruptIn) {
      // Recovered from bankruptcy
      delete state.timers.bankruptIn;
      results.events.push({
        type: 'system',
        code: 'bankruptcy_recovered',
        title: 'Financial Recovery',
        description: 'Successfully recovered from financial crisis'
      });
    }

    // Check SLA failures
    const sla = this.formulaEngine.checkSLA(state);
    if (sla.status === 'fail') {
      if (!state.timers.slaFailIn) {
        state.timers.slaFailIn = this.config.sla.fail_streak_required;
        results.warnings.push({
          type: 'sla_warning',
          message: `SLA failure! ${state.timers.slaFailIn} consecutive failures will end the game`,
          severity: 'critical'
        });
      } else {
        state.timers.slaFailIn -= 1;
        if (state.timers.slaFailIn <= 0) {
          return {
            turn: state.turn,
            events: results.events,
            warnings: results.warnings,
            gameOver: true,
            gameStatus: 'sla_failure',
            reason: 'Consecutive SLA failures exceeded threshold'
          };
        }
        results.warnings.push({
          type: 'sla_countdown',
          message: `${state.timers.slaFailIn} more SLA failures until game over`,
          severity: 'critical'
        });
      }
    } else if (state.timers.slaFailIn) {
      // SLA recovered
      delete state.timers.slaFailIn;
      if (sla.status === 'pass') {
        results.events.push({
          type: 'system',
          code: 'sla_recovered',
          title: 'Performance Restored',
          description: 'SLA requirements back to normal'
        });
      }
    } else if (sla.status === 'warn') {
      results.warnings.push({
        type: 'sla_warning',
        message: sla.message,
        severity: 'warning'
      });
    }

    return results;
  }

  /**
   * Generate events for current turn
   */
  generateEvents(state) {
    const events = [];
    const rng = this.getRNG(state, 'event_generation');

    // Major events every N turns
    if (state.turn % this.config.game.major_event_interval === 0) {
      const majorEvent = this.generateMajorEvent(state, rng);
      if (majorEvent) {
        events.push(majorEvent);
      }
    }

    // Micro events with probability
    if (rng() < this.config.game.micro_event_prob) {
      const microEvent = this.generateMicroEvent(state, rng);
      if (microEvent) {
        events.push(microEvent);
      }
    }

    return events;
  }

  /**
   * Generate major event
   */
  generateMajorEvent(state, rng) {
    const events = [
      {
        code: 'traffic_surge',
        title: 'Traffic Surge',
        description: 'Viral content causes 50% MAU increase',
        choices: null,
        effect: { mau_mod: 0.5 }
      },
      {
        code: 'security_audit',
        title: 'Security Audit',
        description: 'Regulatory audit requires security review',
        choices: [
          {
            label: 'Invest in security improvements',
            cost: 300,
            effect: { security_mod: 20 }
          },
          {
            label: 'Risk minimal compliance',
            cost: 0,
            effect: { security_mod: -10 }
          }
        ]
      },
      {
        code: 'competitor_launch',
        title: 'Competitor Launch',
        description: 'New competitor enters market',
        choices: null,
        effect: { mau_growth_mod: -0.01 }
      },
      {
        code: 'tech_breakthrough',
        title: 'Technology Breakthrough',
        description: 'New optimization technique discovered',
        choices: null,
        effect: { latency_mod: -20 }
      }
    ];

    const index = Math.floor(rng() * events.length);
    const event = { ...events[index], type: 'major' };

    // Auto-apply if no choices
    if (!event.choices && event.effect) {
      this.applyEventEffect(state, event.effect);
      event.auto_applied = true;
    }

    return event;
  }

  /**
   * Generate micro event
   */
  generateMicroEvent(state, rng) {
    const events = [
      {
        code: 'ddos_attack',
        title: 'DDoS Attack',
        description: 'Small scale attack increases latency temporarily',
        effect: { latency_mod: 30 },
        duration: 2
      },
      {
        code: 'cost_spike',
        title: 'Cost Spike',
        description: 'Unexpected infrastructure costs',
        effect: { burn_mod: 20 },
        duration: 1
      },
      {
        code: 'user_churn',
        title: 'User Churn',
        description: 'Some users leave due to performance issues',
        effect: { mau_mod: -0.05 }
      },
      {
        code: 'positive_review',
        title: 'Positive Review',
        description: 'Good press increases user growth',
        effect: { mau_growth_mod: 0.01 },
        duration: 3
      }
    ];

    const index = Math.floor(rng() * events.length);
    const event = { ...events[index], type: 'micro' };

    // Apply effect
    if (event.effect) {
      if (event.duration && event.duration > 1) {
        // Queue for delayed removal
        state.queue_delayed.push({
          turn: state.turn + event.duration,
          event_code: 'remove_' + event.code,
          title: 'Effect Expires',
          description: `${event.title} effect has ended`,
          effect: this.invertEffect(event.effect)
        });
      }
      this.applyEventEffect(state, event.effect);
      event.auto_applied = true;
    }

    return event;
  }

  /**
   * Apply event effect to state
   */
  applyEventEffect(state, effect) {
    if (effect.mau_mod) {
      state.mau = Math.floor(state.mau * (1 + effect.mau_mod));
    }
    if (effect.latency_mod) {
      state.modifiers.latency_mod += effect.latency_mod;
    }
    if (effect.security_mod) {
      state.modifiers.security_mod += effect.security_mod;
    }
    if (effect.burn_mod) {
      state.modifiers.burn_mod += effect.burn_mod;
    }
    if (effect.mau_growth_mod) {
      state.modifiers.mau_growth_mod += effect.mau_growth_mod;
    }
    if (effect.action_cap_mod) {
      state.modifiers.action_cap_mod += effect.action_cap_mod;
    }
    if (effect.cash) {
      state.cash += effect.cash;
    }
  }

  /**
   * Invert effect for removal
   */
  invertEffect(effect) {
    const inverted = {};
    if (effect.latency_mod) inverted.latency_mod = -effect.latency_mod;
    if (effect.security_mod) inverted.security_mod = -effect.security_mod;
    if (effect.burn_mod) inverted.burn_mod = -effect.burn_mod;
    if (effect.mau_growth_mod) inverted.mau_growth_mod = -effect.mau_growth_mod;
    if (effect.action_cap_mod) inverted.action_cap_mod = -effect.action_cap_mod;
    return inverted;
  }

  /**
   * Update timers
   */
  updateTimers(state, results) {
    // Timers are updated in checkFailureConditions
    // This method can be extended for other timer types
  }

  /**
   * Get deterministic RNG for game state
   */
  getRNG(state, step) {
    const seed = `${state.game_uuid}_${state.turn}_${step}`;
    return seedrandom(seed);
  }
}

export default TurnProcessor;