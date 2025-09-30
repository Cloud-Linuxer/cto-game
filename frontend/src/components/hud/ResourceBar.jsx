import { useTranslation } from 'react-i18next';
import { Users, Zap, Shield, DollarSign, TrendingDown } from 'lucide-react';
import Tooltip from '@/components/common/Tooltip';
import { cn } from '@/utils/cn';
import { METRIC_THRESHOLDS } from '@/utils/constants';

const MetricItem = ({ icon: Icon, label, value, unit, tooltip, status }) => {
  const statusColors = {
    excellent: 'text-green-500',
    good: 'text-blue-500',
    warning: 'text-yellow-500',
    critical: 'text-red-500',
  };

  return (
    <Tooltip content={tooltip}>
      <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-md border">
        <Icon className={cn('h-5 w-5', status && statusColors[status])} />
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-sm font-semibold">
            {typeof value === 'number' ? value.toLocaleString() : value}
            {unit && <span className="text-xs ml-1">{unit}</span>}
          </span>
        </div>
      </div>
    </Tooltip>
  );
};

const ResourceBar = ({ gameState }) => {
  const { t } = useTranslation();

  if (!gameState) return null;

  const { mau, latency_ms, security, cash, burn_monthly } = gameState;

  const getLatencyStatus = (latency) => {
    if (latency <= METRIC_THRESHOLDS.latency.excellent) return 'excellent';
    if (latency <= METRIC_THRESHOLDS.latency.good) return 'good';
    if (latency <= METRIC_THRESHOLDS.latency.warning) return 'warning';
    return 'critical';
  };

  const getSecurityStatus = (sec) => {
    if (sec >= METRIC_THRESHOLDS.security.excellent) return 'excellent';
    if (sec >= METRIC_THRESHOLDS.security.good) return 'good';
    if (sec >= METRIC_THRESHOLDS.security.warning) return 'warning';
    return 'critical';
  };

  return (
    <div className="flex flex-wrap gap-2 p-4 bg-background border-b">
      <MetricItem
        icon={Users}
        label={t('metrics.mau')}
        value={mau}
        tooltip={t('tooltips.mau')}
        status="good"
      />
      <MetricItem
        icon={Zap}
        label={t('metrics.latency')}
        value={Math.round(latency_ms)}
        unit="ms"
        tooltip={t('tooltips.latency')}
        status={getLatencyStatus(latency_ms)}
      />
      <MetricItem
        icon={Shield}
        label={t('metrics.security')}
        value={security}
        unit="/100"
        tooltip={t('tooltips.security')}
        status={getSecurityStatus(security)}
      />
      <MetricItem
        icon={DollarSign}
        label={t('metrics.cash')}
        value={cash}
        tooltip={t('tooltips.cash')}
        status={cash > 0 ? 'good' : 'critical'}
      />
      <MetricItem
        icon={TrendingDown}
        label={t('metrics.burn')}
        value={burn_monthly}
        unit="/mo"
        tooltip={t('tooltips.burn')}
      />
    </div>
  );
};

export default ResourceBar;