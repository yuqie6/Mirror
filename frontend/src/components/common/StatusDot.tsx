import { cn } from '@/lib/utils';

export type StatusType = 'healthy' | 'warning' | 'error' | 'offline';

interface StatusDotProps {
  status: StatusType;
  label?: string;
  className?: string;
  showGlow?: boolean;
}

const statusColors: Record<StatusType, string> = {
  healthy: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-rose-500',
  offline: 'bg-zinc-500',
};

const glowColors: Record<StatusType, string> = {
  healthy: 'shadow-[0_0_8px_rgba(16,185,129,0.5)]',
  warning: 'shadow-[0_0_8px_rgba(245,158,11,0.5)]',
  error: 'shadow-[0_0_8px_rgba(244,63,94,0.5)]',
  offline: '',
};

export function StatusDot({ status, label, className, showGlow = true }: StatusDotProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div
        className={cn(
          'w-2 h-2 rounded-full',
          statusColors[status],
          showGlow && glowColors[status]
        )}
      />
      {label && (
        <span className="text-xs text-zinc-400 font-mono uppercase">{label}</span>
      )}
    </div>
  );
}

export default StatusDot;
