export const formatNumber = (num) => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

export const formatCurrency = (amount) => {
  return `$${amount.toLocaleString()}`;
};

export const formatLatency = (ms) => {
  return `${Math.round(ms)}ms`;
};

export const formatPercentage = (value, total) => {
  return `${Math.round((value / total) * 100)}%`;
};

export const getMetricStatus = (metric, value) => {
  const thresholds = {
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
  };

  if (!thresholds[metric]) return 'good';

  const t = thresholds[metric];

  if (metric === 'latency') {
    if (value <= t.excellent) return 'excellent';
    if (value <= t.good) return 'good';
    if (value <= t.warning) return 'warning';
    return 'critical';
  }

  if (metric === 'security') {
    if (value >= t.excellent) return 'excellent';
    if (value >= t.good) return 'good';
    if (value >= t.warning) return 'warning';
    return 'critical';
  }

  return 'good';
};

export const getStatusColor = (status) => {
  const colors = {
    excellent: 'text-green-500',
    good: 'text-blue-500',
    warning: 'text-yellow-500',
    critical: 'text-red-500',
  };

  return colors[status] || colors.good;
};

export const truncateText = (text, maxLength) => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};