import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { addNode } from '@/features/diagram/diagramSlice';
import { Server, Database, Network, Globe, Shield, Zap, TrendingUp, Eye } from 'lucide-react';
import { cn } from '@/utils/cn';

const availableServices = [
  { type: 'ec2', label: 'EC2', icon: Server, color: 'text-orange-500' },
  { type: 'rds', label: 'RDS', icon: Database, color: 'text-blue-500' },
  { type: 'alb', label: 'ALB', icon: Network, color: 'text-purple-500' },
  { type: 'elasticache', label: 'ElastiCache', icon: Zap, color: 'text-red-500' },
  { type: 'cloudfront', label: 'CloudFront', icon: Globe, color: 'text-green-500' },
  { type: 'waf', label: 'WAF', icon: Shield, color: 'text-indigo-500' },
  { type: 'autoscaling', label: 'Auto Scaling', icon: TrendingUp, color: 'text-yellow-500' },
  { type: 'obs', label: 'Observability', icon: Eye, color: 'text-pink-500' },
];

const NodePalette = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const gameState = useSelector((state) => state.game.state);

  const handleDragStart = (event, service) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(service));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleAddNode = (service) => {
    const newNode = {
      id: `${service.type}-${Date.now()}`,
      type: 'service',
      position: { x: 100, y: 100 + Math.random() * 100 },
      data: {
        label: service.label,
        type: service.type,
      },
    };
    dispatch(addNode(newNode));
  };

  const isServiceEnabled = (type) => {
    if (!gameState?.resources) return false;
    return gameState.resources[type] === true || gameState.resources[`${type}_count`] > 0;
  };

  return (
    <div className="w-64 bg-card border-r p-4 overflow-y-auto">
      <h3 className="text-lg font-semibold mb-4">AWS Services</h3>
      <div className="space-y-2">
        {availableServices.map((service) => {
          const Icon = service.icon;
          const enabled = isServiceEnabled(service.type);

          return (
            <div
              key={service.type}
              draggable={enabled}
              onDragStart={(e) => handleDragStart(e, service)}
              onClick={() => enabled && handleAddNode(service)}
              className={cn(
                'flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-all',
                enabled
                  ? 'hover:bg-accent hover:border-primary'
                  : 'opacity-50 cursor-not-allowed'
              )}
            >
              <Icon className={cn('h-5 w-5', service.color)} />
              <div className="flex-1">
                <div className="text-sm font-medium">{service.label}</div>
                {!enabled && (
                  <div className="text-xs text-muted-foreground">Not enabled</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-3 bg-muted rounded-md text-xs text-muted-foreground">
        <p className="font-medium mb-1">How to use:</p>
        <ul className="space-y-1">
          <li>• Click or drag to add services</li>
          <li>• Connect nodes by dragging handles</li>
          <li>• Click nodes to view details</li>
        </ul>
      </div>
    </div>
  );
};

export default NodePalette;