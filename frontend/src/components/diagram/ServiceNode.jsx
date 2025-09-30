import { Handle, Position } from 'reactflow';
import { Server, Database, Network, Globe, Shield, Zap } from 'lucide-react';
import { cn } from '@/utils/cn';

const serviceIcons = {
  ec2: Server,
  rds: Database,
  alb: Network,
  cloudfront: Globe,
  waf: Shield,
  elasticache: Zap,
};

const ServiceNode = ({ data, selected }) => {
  const Icon = serviceIcons[data.type] || Server;

  return (
    <div
      className={cn(
        'px-4 py-3 shadow-md rounded-md bg-card border-2 min-w-[150px]',
        selected ? 'border-aws-orange' : 'border-border',
        'transition-all hover:shadow-lg'
      )}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />

      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        <div className="flex flex-col">
          <div className="text-sm font-semibold">{data.label}</div>
          {data.subtitle && (
            <div className="text-xs text-muted-foreground">{data.subtitle}</div>
          )}
        </div>
      </div>

      {data.metrics && (
        <div className="mt-2 pt-2 border-t text-xs space-y-1">
          {Object.entries(data.metrics).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="text-muted-foreground">{key}:</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

export default ServiceNode;