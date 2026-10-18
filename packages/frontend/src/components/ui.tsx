import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function Card({
  title,
  subtitle,
  actions,
  className,
  children,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn('rounded-2xl border border-border bg-card p-500 shadow-sm', className)}>
      {(title || actions) && (
        <header className="mb-400 flex flex-wrap items-start justify-between gap-300">
          <div>
            {title && <h2 className="font-heading text-400 font-semibold leading-400">{title}</h2>}
            {subtitle && <p className="text-200 leading-200 text-muted-foreground">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-200">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Kpi({
  label,
  value,
  delta,
  deltaLabel,
  tone,
  hint,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaLabel?: string;
  tone?: 'up' | 'down' | 'flat';
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-400">
      <div className="text-200 font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-100 font-numeric text-hero-700 font-semibold leading-hero-700">{value}</div>
      {delta && (
        <div
          className={cn(
            'mt-100 text-200 font-semibold',
            tone === 'up' && 'text-success',
            tone === 'down' && 'text-destructive',
            tone === 'flat' && 'text-muted-foreground'
          )}
        >
          {delta} <span className="font-regular text-muted-foreground">{deltaLabel}</span>
        </div>
      )}
      {hint && <div className="mt-100 text-200 text-muted-foreground">{hint}</div>}
    </div>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  variant = 'secondary',
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        'inline-flex items-center justify-center gap-200 rounded-lg px-300 py-200 text-300 font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-primary text-primary-foreground hover:opacity-90',
        variant === 'secondary' && 'border border-border bg-secondary text-secondary-foreground hover:bg-accent',
        variant === 'ghost' && 'text-foreground hover:bg-accent',
        variant === 'danger' && 'border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground',
        className
      )}
    >
      {children}
    </button>
  );
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('flex flex-col gap-100 text-200 font-medium text-muted-foreground', className)}>
      {label}
      {children}
    </label>
  );
}

export const inputClass =
  'rounded-lg border border-input bg-background px-300 py-200 text-300 text-foreground focus-visible:outline-2 focus-visible:outline-ring';

export function Loading({ label = 'Querying the semantic model…' }: { label?: string }) {
  return (
    <div className="flex min-h-[120px] items-center justify-center gap-200 text-300 text-muted-foreground" role="status">
      <Loader2 className="icon-size-200 animate-spin" /> {label}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-muted', className)} />;
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-start gap-300 rounded-xl border border-destructive/40 bg-destructive/5 p-400 text-300">
      <AlertTriangle className="icon-size-300 shrink-0 text-destructive" />
      <div className="min-w-0 flex-1 break-words">{message}</div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          <RefreshCw className="icon-size-200" /> Retry
        </Button>
      )}
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex min-h-[120px] flex-col items-center justify-center gap-100 text-center">
      <div className="text-300 font-medium">{title}</div>
      {hint && <div className="text-200 text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'bad' | 'warn' | 'info' }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-200 py-100-nudge text-200 font-medium [overflow-wrap:normal]',
        tone === 'neutral' && 'bg-muted text-muted-foreground',
        tone === 'good' && 'bg-success/15 text-success',
        tone === 'bad' && 'bg-destructive/15 text-destructive',
        tone === 'warn' && 'bg-warning/15 text-warning',
        tone === 'info' && 'bg-primary/15 text-primary'
      )}
    >
      {children}
    </span>
  );
}
