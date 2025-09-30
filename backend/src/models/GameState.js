import crypto from 'crypto';

/**
 * GameState model representing the current state of a game
 */
class GameState {
  constructor(data = {}) {
    this.game_uuid = data.game_uuid;
    this.turn = data.turn || 1;
    this.mau = data.mau || 10000;
    this.latency_ms = data.latency_ms || 280.0;
    this.security = data.security || 40;
    this.cash = data.cash || 500;
    this.burn_monthly = data.burn_monthly || 50;
    this.action_cap = data.action_cap || 1;
    this.resources = data.resources || {
      ec2_count: 1,
      alb_enabled: false,
      rds_enabled: false,
      rds_multi_az: false,
      elasticache_enabled: false,
      cloudfront_enabled: false,
      waf_enabled: false,
      net_private_nat: false,
      autoscaling_enabled: false,
      obs_enabled: false,
      graviton_migrated: false,
      ri_purchased: false,
      engineers: 0
    };
    this.modifiers = data.modifiers || {
      latency_mod: 0,
      security_mod: 0,
      burn_mod: 0,
      mau_growth_mod: 0,
      action_cap_mod: 0
    };
    this.timers = data.timers || {};
    this.queue_delayed = data.queue_delayed || [];
    this.rng_seed = data.rng_seed || '';
    this.history_hash = data.history_hash || '';
  }

  /**
   * Convert to database format
   */
  toDatabase() {
    return {
      game_uuid: this.game_uuid,
      turn: this.turn,
      mau: this.mau,
      latency_ms: this.latency_ms,
      security: this.security,
      cash: this.cash,
      burn_monthly: this.burn_monthly,
      action_cap: this.action_cap,
      resources: JSON.stringify(this.resources),
      modifiers: JSON.stringify(this.modifiers),
      timers: JSON.stringify(this.timers),
      queue_delayed: JSON.stringify(this.queue_delayed),
      rng_seed: this.rng_seed,
      history_hash: this.history_hash
    };
  }

  /**
   * Create from database row
   */
  static fromDatabase(row) {
    return new GameState({
      game_uuid: row.game_uuid,
      turn: row.turn,
      mau: row.mau,
      latency_ms: parseFloat(row.latency_ms),
      security: row.security,
      cash: row.cash,
      burn_monthly: row.burn_monthly,
      action_cap: row.action_cap,
      resources: typeof row.resources === 'string' ? JSON.parse(row.resources) : row.resources,
      modifiers: typeof row.modifiers === 'string' ? JSON.parse(row.modifiers) : row.modifiers,
      timers: typeof row.timers === 'string' ? JSON.parse(row.timers) : row.timers,
      queue_delayed: typeof row.queue_delayed === 'string' ? JSON.parse(row.queue_delayed) : row.queue_delayed,
      rng_seed: row.rng_seed,
      history_hash: row.history_hash
    });
  }

  /**
   * Create snapshot for history
   */
  createSnapshot() {
    return {
      turn: this.turn,
      mau: this.mau,
      latency_ms: this.latency_ms,
      security: this.security,
      cash: this.cash,
      burn_monthly: this.burn_monthly,
      action_cap: this.action_cap,
      resources: { ...this.resources },
      modifiers: { ...this.modifiers },
      timers: { ...this.timers },
      queue_delayed: [...this.queue_delayed]
    };
  }

  /**
   * Update history hash chain
   */
  updateHistoryHash(previousHash) {
    const snapshot = this.createSnapshot();
    const data = previousHash + JSON.stringify(snapshot);
    this.history_hash = crypto.createHash('sha256').update(data).digest('hex');
    return this.history_hash;
  }

  /**
   * Validate state integrity
   */
  validate() {
    const errors = [];

    if (this.turn < 1 || this.turn > 36) {
      errors.push('Turn must be between 1 and 36');
    }
    if (this.mau < 0) {
      errors.push('MAU cannot be negative');
    }
    if (this.latency_ms < 0) {
      errors.push('Latency cannot be negative');
    }
    if (this.security < 0 || this.security > 100) {
      errors.push('Security must be between 0 and 100');
    }
    if (this.action_cap < 0) {
      errors.push('Action cap cannot be negative');
    }
    if (this.resources.ec2_count < 0) {
      errors.push('EC2 count cannot be negative');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Clone state for simulation
   */
  clone() {
    return new GameState({
      game_uuid: this.game_uuid,
      turn: this.turn,
      mau: this.mau,
      latency_ms: this.latency_ms,
      security: this.security,
      cash: this.cash,
      burn_monthly: this.burn_monthly,
      action_cap: this.action_cap,
      resources: { ...this.resources },
      modifiers: { ...this.modifiers },
      timers: { ...this.timers },
      queue_delayed: [...this.queue_delayed],
      rng_seed: this.rng_seed,
      history_hash: this.history_hash
    });
  }
}

export default GameState;