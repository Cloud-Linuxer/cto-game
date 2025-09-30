import FormulaEngine from './FormulaEngine.js';
import gameConfig from '../config/config.js';

/**
 * ActionProcessor: Validates and executes player actions
 */
class ActionProcessor {
  constructor(config = gameConfig) {
    this.config = config;
    this.formulaEngine = new FormulaEngine(config);
  }

  /**
   * Process an action and return updated state + result
   */
  processAction(state, actionType, params = {}) {
    const action = this.getActionDefinition(actionType);
    if (!action) {
      return {
        success: false,
        error: 'Unknown action type',
        state
      };
    }

    // Validate prerequisites
    const validation = this.validateAction(state, action, params);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        state
      };
    }

    // Clone state for modification
    const newState = state.clone();

    // Execute action
    const result = action.execute(newState, params, this.config);

    // Recalculate metrics
    this.formulaEngine.updateMetrics(newState);

    return {
      success: true,
      state: newState,
      result
    };
  }

  /**
   * Validate if action can be performed
   */
  validateAction(state, action, params) {
    // Check tier requirement
    if (action.tier && !this.checkTierUnlocked(state, action.tier)) {
      return {
        valid: false,
        error: `Requires tier ${action.tier} to be unlocked`
      };
    }

    // Check cost
    if (action.cost && state.cash < action.cost) {
      return {
        valid: false,
        error: `Insufficient cash. Required: ${action.cost}, Available: ${state.cash}`
      };
    }

    // Check custom prerequisites
    if (action.prerequisite) {
      const prereqCheck = action.prerequisite(state, params);
      if (!prereqCheck.valid) {
        return prereqCheck;
      }
    }

    return { valid: true };
  }

  /**
   * Check if tier is unlocked based on resources
   */
  checkTierUnlocked(state, tier) {
    const { resources } = state;

    switch (tier) {
      case 1:
        return true; // Tier 1 always available
      case 2:
        return resources.alb_enabled || resources.rds_enabled;
      case 3:
        return resources.elasticache_enabled || resources.cloudfront_enabled;
      case 4:
        return resources.autoscaling_enabled || resources.obs_enabled;
      case 5:
        return resources.engineers >= 2;
      default:
        return false;
    }
  }

  /**
   * Get action definition by type
   */
  getActionDefinition(actionType) {
    return ACTION_CATALOG[actionType];
  }

  /**
   * Get all available actions for current state
   */
  getAvailableActions(state) {
    return Object.entries(ACTION_CATALOG)
      .filter(([_, action]) => this.validateAction(state, action, {}).valid)
      .map(([type, action]) => ({
        type,
        name: action.name,
        description: action.description,
        cost: action.cost || 0,
        tier: action.tier
      }));
  }
}

/**
 * Action Catalog: All available player actions
 */
const ACTION_CATALOG = {
  // Basic Actions (Tier 1)
  ec2_add: {
    name: 'Add EC2 Instance',
    description: 'Add additional compute capacity',
    tier: 1,
    cost: 0,
    execute: (state, params, config) => {
      state.resources.ec2_count += 1;
      return { message: `Added EC2 instance. Total: ${state.resources.ec2_count}` };
    }
  },

  ec2_remove: {
    name: 'Remove EC2 Instance',
    description: 'Remove compute capacity to save costs',
    tier: 1,
    cost: 0,
    prerequisite: (state) => {
      if (state.resources.ec2_count <= 1) {
        return { valid: false, error: 'Cannot remove last EC2 instance' };
      }
      return { valid: true };
    },
    execute: (state, params, config) => {
      state.resources.ec2_count -= 1;
      return { message: `Removed EC2 instance. Total: ${state.resources.ec2_count}` };
    }
  },

  // Service Actions (Tier 2)
  alb_enable: {
    name: 'Enable ALB',
    description: 'Enable Application Load Balancer for better distribution',
    tier: 2,
    cost: 100,
    prerequisite: (state) => {
      if (state.resources.alb_enabled) {
        return { valid: false, error: 'ALB already enabled' };
      }
      return { valid: true };
    },
    execute: (state, params, config) => {
      state.resources.alb_enabled = true;
      state.cash -= 100;
      return { message: 'ALB enabled successfully' };
    }
  },

  alb_disable: {
    name: 'Disable ALB',
    description: 'Disable Application Load Balancer',
    tier: 2,
    cost: 0,
    prerequisite: (state) => {
      if (!state.resources.alb_enabled) {
        return { valid: false, error: 'ALB not enabled' };
      }
      return { valid: true };
    },
    execute: (state) => {
      state.resources.alb_enabled = false;
      return { message: 'ALB disabled' };
    }
  },

  rds_enable: {
    name: 'Enable RDS',
    description: 'Enable managed database service',
    tier: 2,
    cost: 200,
    prerequisite: (state) => {
      if (state.resources.rds_enabled) {
        return { valid: false, error: 'RDS already enabled' };
      }
      return { valid: true };
    },
    execute: (state) => {
      state.resources.rds_enabled = true;
      state.cash -= 200;
      return { message: 'RDS enabled successfully' };
    }
  },

  rds_disable: {
    name: 'Disable RDS',
    description: 'Disable managed database',
    tier: 2,
    cost: 0,
    prerequisite: (state) => {
      if (!state.resources.rds_enabled) {
        return { valid: false, error: 'RDS not enabled' };
      }
      if (state.resources.rds_multi_az) {
        return { valid: false, error: 'Disable Multi-AZ first' };
      }
      return { valid: true };
    },
    execute: (state) => {
      state.resources.rds_enabled = false;
      return { message: 'RDS disabled' };
    }
  },

  rds_multi_az_enable: {
    name: 'Enable RDS Multi-AZ',
    description: 'Enable high availability for database',
    tier: 3,
    cost: 300,
    prerequisite: (state) => {
      if (!state.resources.rds_enabled) {
        return { valid: false, error: 'RDS must be enabled first' };
      }
      if (state.resources.rds_multi_az) {
        return { valid: false, error: 'Multi-AZ already enabled' };
      }
      return { valid: true };
    },
    execute: (state) => {
      state.resources.rds_multi_az = true;
      state.cash -= 300;
      return { message: 'RDS Multi-AZ enabled' };
    }
  },

  rds_multi_az_disable: {
    name: 'Disable RDS Multi-AZ',
    description: 'Disable high availability',
    tier: 3,
    cost: 0,
    prerequisite: (state) => {
      if (!state.resources.rds_multi_az) {
        return { valid: false, error: 'Multi-AZ not enabled' };
      }
      return { valid: true };
    },
    execute: (state) => {
      state.resources.rds_multi_az = false;
      return { message: 'RDS Multi-AZ disabled' };
    }
  },

  // Tier 3 Services
  elasticache_enable: {
    name: 'Enable ElastiCache',
    description: 'Enable in-memory caching for performance',
    tier: 3,
    cost: 300,
    prerequisite: (state) => {
      if (state.resources.elasticache_enabled) {
        return { valid: false, error: 'ElastiCache already enabled' };
      }
      return { valid: true };
    },
    execute: (state) => {
      state.resources.elasticache_enabled = true;
      state.cash -= 300;
      return { message: 'ElastiCache enabled successfully' };
    }
  },

  elasticache_disable: {
    name: 'Disable ElastiCache',
    description: 'Disable caching service',
    tier: 3,
    cost: 0,
    prerequisite: (state) => {
      if (!state.resources.elasticache_enabled) {
        return { valid: false, error: 'ElastiCache not enabled' };
      }
      return { valid: true };
    },
    execute: (state) => {
      state.resources.elasticache_enabled = false;
      return { message: 'ElastiCache disabled' };
    }
  },

  cloudfront_enable: {
    name: 'Enable CloudFront',
    description: 'Enable CDN for global content delivery',
    tier: 3,
    cost: 250,
    prerequisite: (state) => {
      if (state.resources.cloudfront_enabled) {
        return { valid: false, error: 'CloudFront already enabled' };
      }
      return { valid: true };
    },
    execute: (state) => {
      state.resources.cloudfront_enabled = true;
      state.cash -= 250;
      return { message: 'CloudFront enabled successfully' };
    }
  },

  cloudfront_disable: {
    name: 'Disable CloudFront',
    description: 'Disable CDN',
    tier: 3,
    cost: 0,
    prerequisite: (state) => {
      if (!state.resources.cloudfront_enabled) {
        return { valid: false, error: 'CloudFront not enabled' };
      }
      return { valid: true };
    },
    execute: (state) => {
      state.resources.cloudfront_enabled = false;
      return { message: 'CloudFront disabled' };
    }
  },

  waf_enable: {
    name: 'Enable WAF',
    description: 'Enable Web Application Firewall for security',
    tier: 3,
    cost: 150,
    prerequisite: (state) => {
      if (state.resources.waf_enabled) {
        return { valid: false, error: 'WAF already enabled' };
      }
      return { valid: true };
    },
    execute: (state) => {
      state.resources.waf_enabled = true;
      state.cash -= 150;
      return { message: 'WAF enabled successfully' };
    }
  },

  waf_disable: {
    name: 'Disable WAF',
    description: 'Disable firewall',
    tier: 3,
    cost: 0,
    prerequisite: (state) => {
      if (!state.resources.waf_enabled) {
        return { valid: false, error: 'WAF not enabled' };
      }
      return { valid: true };
    },
    execute: (state) => {
      state.resources.waf_enabled = false;
      return { message: 'WAF disabled' };
    }
  },

  net_private_nat_enable: {
    name: 'Enable Private NAT',
    description: 'Enable private networking with NAT gateway',
    tier: 3,
    cost: 200,
    prerequisite: (state) => {
      if (state.resources.net_private_nat) {
        return { valid: false, error: 'Private NAT already enabled' };
      }
      return { valid: true };
    },
    execute: (state) => {
      state.resources.net_private_nat = true;
      state.cash -= 200;
      return { message: 'Private NAT enabled successfully' };
    }
  },

  net_private_nat_disable: {
    name: 'Disable Private NAT',
    description: 'Disable private networking',
    tier: 3,
    cost: 0,
    prerequisite: (state) => {
      if (!state.resources.net_private_nat) {
        return { valid: false, error: 'Private NAT not enabled' };
      }
      return { valid: true };
    },
    execute: (state) => {
      state.resources.net_private_nat = false;
      return { message: 'Private NAT disabled' };
    }
  },

  // Tier 4 - Advanced Operations
  autoscaling_enable: {
    name: 'Enable Auto Scaling',
    description: 'Enable automatic capacity scaling',
    tier: 4,
    cost: 400,
    prerequisite: (state) => {
      if (state.resources.autoscaling_enabled) {
        return { valid: false, error: 'Auto Scaling already enabled' };
      }
      if (!state.resources.alb_enabled) {
        return { valid: false, error: 'Requires ALB to be enabled' };
      }
      return { valid: true };
    },
    execute: (state) => {
      state.resources.autoscaling_enabled = true;
      state.cash -= 400;
      return { message: 'Auto Scaling enabled successfully' };
    }
  },

  autoscaling_disable: {
    name: 'Disable Auto Scaling',
    description: 'Disable automatic scaling',
    tier: 4,
    cost: 0,
    prerequisite: (state) => {
      if (!state.resources.autoscaling_enabled) {
        return { valid: false, error: 'Auto Scaling not enabled' };
      }
      return { valid: true };
    },
    execute: (state) => {
      state.resources.autoscaling_enabled = false;
      return { message: 'Auto Scaling disabled' };
    }
  },

  obs_enable: {
    name: 'Enable Observability',
    description: 'Enable monitoring and observability tools',
    tier: 4,
    cost: 300,
    prerequisite: (state) => {
      if (state.resources.obs_enabled) {
        return { valid: false, error: 'Observability already enabled' };
      }
      return { valid: true };
    },
    execute: (state) => {
      state.resources.obs_enabled = true;
      state.cash -= 300;
      return { message: 'Observability enabled successfully' };
    }
  },

  obs_disable: {
    name: 'Disable Observability',
    description: 'Disable monitoring tools',
    tier: 4,
    cost: 0,
    prerequisite: (state) => {
      if (!state.resources.obs_enabled) {
        return { valid: false, error: 'Observability not enabled' };
      }
      return { valid: true };
    },
    execute: (state) => {
      state.resources.obs_enabled = false;
      return { message: 'Observability disabled' };
    }
  },

  // Optimization Actions
  graviton_migration: {
    name: 'Migrate to Graviton',
    description: 'Migrate to ARM-based Graviton processors for cost savings',
    tier: 4,
    cost: 500,
    prerequisite: (state) => {
      if (state.resources.graviton_migrated) {
        return { valid: false, error: 'Already migrated to Graviton' };
      }
      return { valid: true };
    },
    execute: (state) => {
      state.resources.graviton_migrated = true;
      state.cash -= 500;
      return { message: 'Successfully migrated to Graviton (20% cost reduction)' };
    }
  },

  ri_purchase: {
    name: 'Purchase Reserved Instances',
    description: 'Commit to long-term capacity for cost savings',
    tier: 4,
    cost: 800,
    prerequisite: (state) => {
      if (state.resources.ri_purchased) {
        return { valid: false, error: 'Reserved Instances already purchased' };
      }
      return { valid: true };
    },
    execute: (state) => {
      state.resources.ri_purchased = true;
      state.cash -= 800;
      return { message: 'Reserved Instances purchased (20% cost reduction)' };
    }
  },

  // Strategy Actions (Tier 5)
  hire_engineer: {
    name: 'Hire Engineer',
    description: 'Hire additional engineer to increase action capacity',
    tier: 5,
    cost: 300,
    execute: (state) => {
      state.resources.engineers += 1;
      state.cash -= 300;
      state.burn_monthly += 30; // Engineers have monthly salary
      return {
        message: `Hired engineer. Total: ${state.resources.engineers}`,
        bonus: Math.floor(state.resources.engineers / 3) > 0 ? 'Action cap increased!' : ''
      };
    }
  },

  fundraising: {
    name: 'Fundraising',
    description: 'Raise capital from investors',
    tier: 5,
    cost: 0,
    prerequisite: (state) => {
      if (state.mau < 50000) {
        return { valid: false, error: 'Requires at least 50,000 MAU to attract investors' };
      }
      return { valid: true };
    },
    execute: (state) => {
      const amount = 2000;
      state.cash += amount;
      return { message: `Raised $${amount}K in funding` };
    }
  }
};

export default ActionProcessor;