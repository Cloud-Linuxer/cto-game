export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const GAME_CONSTANTS = {
  MAX_TURNS: 36,
  MAJOR_EVENT_INTERVAL: 3,
  STARTING_CASH: 500,
  STARTING_MAU: 10000,
};

export const METRIC_THRESHOLDS = {
  latency: {
    excellent: 150,
    good: 250,
    warning: 300,
    critical: 350,
  },
  security: {
    excellent: 85,
    good: 70,
    warning: 60,
    critical: 40,
  },
  mau: {
    bronze: 100000,
    silver: 500000,
    gold: 1000000,
  },
};

export const AWS_SERVICES = {
  ec2: { name: 'EC2', icon: 'Server', category: 'compute' },
  alb: { name: 'ALB', icon: 'Network', category: 'networking' },
  rds: { name: 'RDS', icon: 'Database', category: 'database' },
  elasticache: { name: 'ElastiCache', icon: 'Zap', category: 'database' },
  cloudfront: { name: 'CloudFront', icon: 'Globe', category: 'networking' },
  waf: { name: 'WAF', icon: 'Shield', category: 'security' },
  autoscaling: { name: 'Auto Scaling', icon: 'TrendingUp', category: 'compute' },
  obs: { name: 'Observability', icon: 'Eye', category: 'management' },
};