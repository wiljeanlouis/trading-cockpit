import * as React from 'react';
import { Button } from './button';
import { cn } from '@/lib/utils';

export function PageShell({ className, ...props }: React.ComponentProps<'main'>) {
  return (
    <main
      className={cn(
        'mx-auto max-w-[1440px] px-12 pt-12 pb-16 max-[900px]:px-[26px] max-[900px]:py-9',
        className
      )}
      {...props}
    />
  );
}

export function PageHeader({ className, ...props }: React.ComponentProps<'header'>) {
  return (
    <header
      className={cn(
        'mb-8 flex items-end justify-between gap-8 max-[620px]:flex-col max-[620px]:items-start',
        className
      )}
      {...props}
    />
  );
}

export function Eyebrow({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'mb-2 text-[10px] font-extrabold tracking-[0.18em] text-[#4ee1a0] uppercase',
        className
      )}
      {...props}
    />
  );
}

export function PageTitle({ className, ...props }: React.ComponentProps<'h1'>) {
  return (
    <h1
      className={cn('mb-2 text-[clamp(32px,4vw,48px)] font-bold tracking-[-0.04em]', className)}
      {...props}
    />
  );
}

export function PageSubtitle({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('m-0 text-sm text-[#7f8fa6]', className)} {...props} />;
}

export function PageActions({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 max-[620px]:flex-col max-[620px]:items-start',
        className
      )}
      {...props}
    />
  );
}

export function UpdatedAt({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('m-0 text-[11px] text-[#6f8098]', className)} {...props} />;
}

export function LoadingState({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="flex min-h-[220px] items-center justify-center gap-3 rounded-[14px] border border-[#1c3045] bg-[rgba(11,23,38,0.75)] text-[#8495ac]"
      aria-live="polite"
    >
      <span
        className="size-[18px] animate-spin rounded-full border-2 border-[#27413f] border-t-[#4ee1a0]"
        aria-hidden="true"
      />
      {children}
    </section>
  );
}

export function ErrorState({
  title,
  error,
  onRetry
}: {
  title: string;
  error: string;
  onRetry: () => void;
}) {
  return (
    <section
      className="flex min-h-[220px] items-center justify-between gap-3 rounded-[14px] border border-[#61343a] bg-[rgba(61,23,31,0.45)] p-6 text-[#ffb9b9]"
      role="alert"
    >
      <div>
        <strong>{title}</strong>
        <p className="mt-1.5 mb-0 text-[#bd8a90]">{error}</p>
      </div>
      <Button variant="retry" onClick={onRetry}>
        Try again
      </Button>
    </section>
  );
}

export function EmptyState({
  icon,
  title,
  children
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-h-[300px] flex-col items-center justify-center rounded-[14px] border border-[#1c3045] bg-[rgba(11,23,38,0.75)] p-10 text-center text-[#71839b]">
      <span className="mb-[18px] text-[34px] text-[#4ee1a0]" aria-hidden="true">
        {icon}
      </span>
      <h2 className="mb-2 text-xl font-bold text-[#dce6f3]">{title}</h2>
      <p className="m-0 text-[13px]">{children}</p>
    </section>
  );
}

export function DataPanel({ className, ...props }: React.ComponentProps<'section'>) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-[14px] border border-[#1d3045] bg-[linear-gradient(145deg,rgba(15,29,47,0.94),rgba(9,20,34,0.94))] shadow-[0_18px_50px_rgba(0,0,0,0.18)]',
        className
      )}
      {...props}
    />
  );
}

export function MetricCard({
  label,
  value,
  detail,
  className,
  valueClassName
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <article
      className={cn(
        'relative min-h-[118px] overflow-hidden rounded-[12px] border border-[#1d3045] bg-[linear-gradient(145deg,rgba(18,32,50,0.92),rgba(11,23,38,0.9))] p-5 shadow-[0_14px_36px_rgba(0,0,0,0.14)] transition hover:-translate-y-px hover:border-[#2c4b56]',
        className
      )}
    >
      <div className="absolute inset-x-0 top-0 h-0.5 bg-[linear-gradient(90deg,#4ee1a0,transparent_70%)]" />
      <p className="mb-5 text-[10px] font-extrabold tracking-[0.12em] text-[#8393a9] uppercase">
        {label}
      </p>
      <strong
        className={cn(
          'mb-2 block text-[34px] leading-none tracking-[-0.05em] text-[#f5f8fc] tabular-nums',
          valueClassName
        )}
      >
        {value}
      </strong>
      {detail && <span className="text-[11px] text-[#60728b]">{detail}</span>}
    </article>
  );
}

export function MetricDetailGrid({ className, ...props }: React.ComponentProps<'dl'>) {
  return (
    <dl
      className={cn(
        'grid grid-cols-7 gap-4 p-5 text-sm max-[1180px]:grid-cols-4 max-[760px]:grid-cols-2',
        className
      )}
      {...props}
    />
  );
}

export function ScopeContextBar({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex flex-wrap gap-x-2 gap-y-1 border-b border-[#1d3045] px-5 py-3 text-xs text-[#7f8fa6] [&_b]:font-normal [&_b]:text-[#d7e3f4]',
        className
      )}
      {...props}
    />
  );
}

export function ScopeBadge({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'rounded-full border border-[#2a3c55] px-3 py-1 text-[10px] font-bold tracking-[0.08em] text-[#9fb0c6] uppercase',
        className
      )}
      {...props}
    />
  );
}

export function TableSummary({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex min-h-[50px] items-center justify-between border-b border-[#1d3045] px-5 text-xs text-[#92a3b9] [&_small]:rounded-full [&_small]:border [&_small]:border-[#29443f] [&_small]:px-2 [&_small]:py-1 [&_small]:text-[9px] [&_small]:font-extrabold [&_small]:tracking-[0.08em] [&_small]:text-[#6fae91] [&_small]:uppercase',
        className
      )}
      {...props}
    />
  );
}

export function TableScroll({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('overflow-x-auto', className)} {...props} />;
}

export const tableTickerClassName = 'block text-sm font-bold tracking-[0.03em] text-[#f4f8fc]';
export const tableDetailClassName = 'mt-1 block text-[10px] text-[#62748d]';
export const numericCellClassName = 'text-right';
export const actionCellClassName =
  'text-right [&_button]:px-[11px] [&_button]:py-[7px] [&_button]:text-[11px]';
export const screenReaderOnlyClassName =
  'absolute -m-px size-px overflow-hidden border-0 p-0 whitespace-nowrap [clip:rect(0,0,0,0)]';
