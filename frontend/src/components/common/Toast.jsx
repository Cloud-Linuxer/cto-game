import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { removeToast } from '@/features/ui/uiSlice';
import { cn } from '@/utils/cn';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const Toast = ({ id, title, description, variant = 'default', duration = 5000 }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(removeToast(id));
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, dispatch]);

  const variants = {
    default: 'bg-background border',
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-white',
    info: 'bg-blue-500 text-white',
  };

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertCircle,
    info: Info,
  };

  const Icon = icons[variant];

  return (
    <div
      className={cn(
        'pointer-events-auto flex w-full max-w-md rounded-lg shadow-lg p-4 transition-all',
        variants[variant]
      )}
    >
      {Icon && <Icon className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />}
      <div className="flex-1">
        {title && <div className="font-semibold">{title}</div>}
        {description && <div className="text-sm mt-1 opacity-90">{description}</div>}
      </div>
      <button
        onClick={() => dispatch(removeToast(id))}
        className="ml-4 flex-shrink-0 opacity-70 hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export const ToastContainer = () => {
  const toasts = useSelector((state) => state.ui.toasts);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>
  );
};

export default Toast;