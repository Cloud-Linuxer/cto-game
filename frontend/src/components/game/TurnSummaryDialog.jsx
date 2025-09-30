import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/common/Dialog';
import Button from '@/components/common/Button';
import { TrendingUp, TrendingDown } from 'lucide-react';

const TurnSummaryDialog = ({ summary, open, onClose }) => {
  const { t } = useTranslation();

  if (!summary) return null;

  const renderMetricChange = (label, current, previous) => {
    if (previous === undefined) return null;

    const change = current - previous;
    const isPositive = change > 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;

    return (
      <div className="flex items-center justify-between py-2 border-b">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm">{current.toLocaleString()}</span>
          <div className={`flex items-center gap-1 text-xs ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            <Icon className="h-3 w-3" />
            <span>{Math.abs(change).toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent onClose={onClose} className="max-w-md">
        <DialogHeader>
          <DialogTitle>Turn {summary.turn} Summary</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <h4 className="text-sm font-semibold mb-2">Metric Changes</h4>
            <div className="space-y-1">
              {renderMetricChange('MAU', summary.current.mau, summary.previous?.mau)}
              {renderMetricChange('Latency', Math.round(summary.current.latency_ms), Math.round(summary.previous?.latency_ms))}
              {renderMetricChange('Security', summary.current.security, summary.previous?.security)}
              {renderMetricChange('Cash', summary.current.cash, summary.previous?.cash)}
            </div>
          </div>

          {summary.events && summary.events.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Events This Turn</h4>
              <ul className="space-y-2">
                {summary.events.map((event, index) => (
                  <li key={index} className="text-sm p-2 bg-muted rounded">
                    {event.title || event.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.actionsPerformed && summary.actionsPerformed.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Actions Performed</h4>
              <ul className="space-y-1">
                {summary.actionsPerformed.map((action, index) => (
                  <li key={index} className="text-sm">
                    • {t(`actions.${action.code}`) || action.code}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="aws">
            {t('common.continue')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TurnSummaryDialog;