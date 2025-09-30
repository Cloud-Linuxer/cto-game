import gameConfig from '../config/config.js';

/**
 * FormulaEngine: Implements all game calculation formulas from BACKEND_POLICY.md
 */
class FormulaEngine {
  constructor(config = gameConfig) {
    this.config = config;
  }

  /**
   * Calculate MAU growth for next turn
   * Formula: mau_next = mau * (1 + base_rate + growth_mod) if latency < 350ms
   */
  calculateMAUGrowth(state) {
    const { base_mau_rate } = this.config.growth;
    const baseRate = base_mau_rate + state.modifiers.mau_growth_mod;

    // Growth only if latency is acceptable
    if (state.latency_ms >= 350) {
      return Math.floor(state.mau * 0.95); // 5% decline if poor latency
    }

    const newMAU = Math.floor(state.mau * (1 + baseRate));
    return Math.max(0, newMAU);
  }

  /**
   * Calculate base latency from infrastructure
   * Formula: base_latency = 280 - sum(service_bonus) + ec2_penalty
   */
  calculateLatency(state) {
    const { resources } = state;
    const perf = this.config.performance;

    let latency = 280; // Starting base latency

    // Service bonuses (negative = faster)
    if (resources.alb_enabled) latency += perf.alb_bonus_ms;
    if (resources.rds_enabled) latency += perf.rds_bonus_ms;
    if (resources.rds_multi_az) latency += perf.rds_multi_az_bonus_ms;
    if (resources.elasticache_enabled) latency += perf.elasticache_bonus_ms;
    if (resources.cloudfront_enabled) latency += perf.cloudfront_bonus_ms;
    if (resources.autoscaling_enabled) latency += perf.autoscaling_stability_ms;

    // EC2 scaling effects
    const ec2Bonus = (resources.ec2_count - 1) * perf.ec2_add_bonus_ms;
    latency += ec2Bonus;

    // Apply modifiers
    latency += state.modifiers.latency_mod;

    // Apply floor and ceiling
    latency = Math.max(this.config.growth.latency_floor, latency);
    latency = Math.min(this.config.growth.latency_ceiling, latency);

    return Math.round(latency * 100) / 100;
  }

  /**
   * Calculate security score from infrastructure and decay
   * Formula: security = base + sum(service_bonus) - decay_per_turn * turn + security_mod
   */
  calculateSecurity(state) {
    const { resources } = state;
    const secBonus = this.config.security_bonus;
    const decay = this.config.growth.security_decay_per_turn;

    let security = 40; // Starting base security

    // Service bonuses
    if (resources.rds_enabled) security += secBonus.rds_bonus;
    if (resources.waf_enabled) security += secBonus.waf_bonus;
    if (resources.net_private_nat) security += secBonus.net_private_nat_bonus;
    if (resources.obs_enabled) security += secBonus.obs_bonus;
    if (resources.rds_multi_az) security += secBonus.multi_az_bonus;

    // Natural decay over time
    security -= decay * (state.turn - 1);

    // Apply modifiers
    security += state.modifiers.security_mod;

    // Clamp to 0-100
    return Math.max(0, Math.min(100, security));
  }

  /**
   * Calculate monthly burn rate
   * Formula: burn = sum(service_costs) * (1 - discounts) + burn_mod
   */
  calculateBurn(state) {
    const { resources } = state;
    const cost = this.config.cost;

    let burn = 0;

    // Infrastructure costs
    burn += resources.ec2_count * cost.ec2_monthly;
    if (resources.alb_enabled) burn += cost.alb_monthly;
    if (resources.rds_enabled) {
      burn += cost.rds_monthly;
      if (resources.rds_multi_az) burn += cost.rds_multi_az_extra;
    }
    if (resources.elasticache_enabled) burn += cost.elasticache_monthly;
    if (resources.cloudfront_enabled) burn += cost.cloudfront_monthly;
    if (resources.waf_enabled) burn += cost.waf_monthly;
    if (resources.net_private_nat) burn += cost.net_private_nat_monthly;
    if (resources.autoscaling_enabled) burn += cost.autoscaling_base;
    if (resources.obs_enabled) burn += cost.obs_monthly;

    // Apply discounts
    if (resources.graviton_migrated) {
      burn *= (1 - cost.graviton_discount);
    }
    if (resources.ri_purchased) {
      burn *= (1 - cost.ri_discount);
    }

    // Apply modifiers
    burn += state.modifiers.burn_mod;

    return Math.max(0, Math.round(burn));
  }

  /**
   * Calculate action cap for turn
   * Formula: action_cap = 1 + floor(engineers / 3) + action_cap_mod
   */
  calculateActionCap(state) {
    const baseCap = 1;
    const engineerBonus = Math.floor(state.resources.engineers / 3);
    const cap = baseCap + engineerBonus + state.modifiers.action_cap_mod;
    return Math.max(0, cap);
  }

  /**
   * Check if infrastructure can handle current MAU
   * Formula: capacity = ec2_count * base_rps_per_ec2 * 60 * 60 * 24 * 30
   */
  checkCapacity(state) {
    const { base_rps_per_ec2 } = this.config.performance;
    const capacity = state.resources.ec2_count * base_rps_per_ec2;
    const required = state.mau / (30 * 24 * 60 * 60); // requests per second

    return {
      capacity,
      required: Math.round(required * 100) / 100,
      sufficient: capacity >= required,
      utilization: Math.round((required / capacity) * 100)
    };
  }

  /**
   * Check SLA compliance (latency thresholds)
   */
  checkSLA(state) {
    const { warn_latency_ms, fail_latency_ms } = this.config.sla;

    if (state.latency_ms >= fail_latency_ms) {
      return { status: 'fail', message: 'Latency exceeds SLA failure threshold' };
    } else if (state.latency_ms >= warn_latency_ms) {
      return { status: 'warn', message: 'Latency approaching SLA threshold' };
    }
    return { status: 'pass', message: 'SLA requirements met' };
  }

  /**
   * Check bankruptcy risk
   */
  checkBankruptcy(state) {
    if (state.cash < 0) {
      return {
        inGracePeriod: true,
        turnsRemaining: state.timers.bankruptIn || this.config.bankruptcy_grace_turns
      };
    }
    return { inGracePeriod: false, turnsRemaining: 0 };
  }

  /**
   * Calculate final score
   * Formula from GAME_RULES.md: MAU + (100 - latency/5) + security + cash/10
   */
  calculateFinalScore(state) {
    const mauScore = state.mau;
    const latencyScore = Math.max(0, 100 - state.latency_ms / 5);
    const securityScore = state.security;
    const cashScore = state.cash / 10;

    const total = mauScore + latencyScore + securityScore + cashScore;
    return Math.round(total);
  }

  /**
   * Calculate final grade based on score
   */
  calculateGrade(score) {
    if (score >= 50000) return 'S';
    if (score >= 30000) return 'A';
    if (score >= 15000) return 'B';
    if (score >= 8000) return 'C';
    if (score >= 5000) return 'D';
    return 'F';
  }

  /**
   * Update all metrics for a state (full recalculation)
   */
  updateMetrics(state) {
    state.latency_ms = this.calculateLatency(state);
    state.security = this.calculateSecurity(state);
    state.burn_monthly = this.calculateBurn(state);
    state.action_cap = this.calculateActionCap(state);

    return state;
  }
}

export default FormulaEngine;