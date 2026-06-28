import React from 'react';
import { cn } from '@/lib/utils';
import { useCountUp } from '@/hooks/use-count-up';

interface DashboardStatCardProps {
  label: string;
  value: number;
  hint?: string;
  icon: React.ReactNode;
  loading?: boolean;
  delay?: number;
  accent?: 'teal' | 'violet' | 'amber' | 'sky';
}

const accentStyles = {
  teal: 'from-[#2EE6C5]/20 to-[#2EE6C5]/5 border-[#2EE6C5]/25 group-hover:shadow-[#2EE6C5]/10',
  violet: 'from-primary/20 to-primary/5 border-primary/25 group-hover:shadow-primary/10',
  amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/25 group-hover:shadow-amber-500/10',
  sky: 'from-sky-500/20 to-sky-500/5 border-sky-500/25 group-hover:shadow-sky-500/10',
};

const iconStyles = {
  teal: 'bg-[#2EE6C5]/15 text-[#2EE6C5]',
  violet: 'bg-primary/15 text-primary',
  amber: 'bg-amber-500/15 text-amber-500',
  sky: 'bg-sky-500/15 text-sky-500',
};

const DashboardStatCard: React.FC<DashboardStatCardProps> = ({
  label,
  value,
  hint,
  icon,
  loading = false,
  delay = 0,
  accent = 'teal',
}) => {
  const animated = useCountUp(value, 750, !loading);

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5',
        'backdrop-blur-sm transition-all duration-300',
        'hover:-translate-y-1 hover:shadow-xl animate-stagger-in',
        accentStyles[accent]
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight">
            {loading ? (
              <span className="inline-block h-9 w-16 rounded-lg bg-muted/80 animate-pulse" />
            ) : (
              animated.toLocaleString()
            )}
          </p>
          {hint ? (
            <p className="mt-1.5 text-xs text-muted-foreground leading-snug">{hint}</p>
          ) : null}
        </div>
        <div
          className={cn(
            'shrink-0 rounded-xl p-2.5 transition-transform duration-300 group-hover:scale-110',
            iconStyles[accent]
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

export default DashboardStatCard;
