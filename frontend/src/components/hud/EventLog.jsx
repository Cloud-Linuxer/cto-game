import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';

const eventIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

const eventColors = {
  info: 'text-blue-500',
  success: 'text-green-500',
  warning: 'text-yellow-500',
  error: 'text-red-500',
};

const EventLog = ({ events = [] }) => {
  const { t } = useTranslation();
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div className="flex flex-col gap-2 p-4 bg-card rounded-lg border h-full">
      <h3 className="text-lg font-semibold">Event Log</h3>
      <div
        ref={logRef}
        className="flex-1 overflow-y-auto space-y-2 max-h-[400px] pr-2"
      >
        {events.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            No events yet
          </div>
        ) : (
          events.map((event, index) => {
            const Icon = eventIcons[event.type] || Info;
            return (
              <div
                key={index}
                className="flex items-start gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
              >
                <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', eventColors[event.type])} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Turn {event.turn}
                    </span>
                    {event.title && (
                      <span className="text-xs font-semibold">{event.title}</span>
                    )}
                  </div>
                  <p className="text-sm mt-1">{event.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default EventLog;