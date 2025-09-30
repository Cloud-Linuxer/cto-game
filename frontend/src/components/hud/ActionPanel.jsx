import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { executeGameAction } from '@/features/game/gameSlice';
import { addToast } from '@/features/ui/uiSlice';
import Button from '@/components/common/Button';
import { Server, Network, Database, Zap, Globe, Shield, TrendingUp, Eye } from 'lucide-react';
import Tooltip from '@/components/common/Tooltip';

const actionIcons = {
  ec2_add: Server,
  enable_alb: Network,
  enable_rds: Database,
  enable_elasticache: Zap,
  enable_cloudfront: Globe,
  enable_waf: Shield,
  enable_autoscaling: TrendingUp,
  enable_obs: Eye,
};

const ActionPanel = ({ gameId, availableActions, actionsRemaining, disabled }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const handleAction = async (actionCode) => {
    if (disabled || actionsRemaining <= 0) return;

    try {
      await dispatch(executeGameAction({ gameId, actionCode })).unwrap();
      dispatch(addToast({
        title: t(`actions.${actionCode}`),
        description: 'Action executed successfully',
        variant: 'success',
      }));
    } catch (error) {
      dispatch(addToast({
        title: 'Error',
        description: error.message || t('errors.generic'),
        variant: 'error',
      }));
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-card rounded-lg border">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t('game.actionsRemaining')}</h3>
        <span className="text-2xl font-bold text-primary">{actionsRemaining}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {availableActions.map((action) => {
          const Icon = actionIcons[action.code] || Server;
          return (
            <Tooltip key={action.code} content={t(`tooltips.${action.code}`) || action.code}>
              <Button
                variant="outline"
                className="flex flex-col items-center gap-2 h-auto py-3"
                onClick={() => handleAction(action.code)}
                disabled={disabled || actionsRemaining <= 0}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs text-center">
                  {t(`actions.${action.code}`)}
                </span>
                {action.cost && (
                  <span className="text-xs text-muted-foreground">
                    ${action.cost}
                  </span>
                )}
              </Button>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};

export default ActionPanel;