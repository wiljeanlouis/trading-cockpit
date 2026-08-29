import * as React from 'react';
import { cn } from '@/lib/utils';

export function DetailBackdrop({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-[1000] grid place-items-center overflow-hidden bg-[rgba(2,8,16,0.76)] p-7 backdrop-blur-lg max-[620px]:p-2',
        className
      )}
      {...props}
    />
  );
}

export function DetailPanel({ className, ...props }: React.ComponentProps<'section'>) {
  return (
    <section
      className={cn(
        'max-h-[calc(100dvh-56px)] w-full max-w-[1180px] min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain rounded-[14px] border border-[#29443f] bg-[linear-gradient(145deg,rgba(16,38,45,0.95),rgba(9,21,35,0.96))] p-[26px] shadow-[0_26px_90px_rgba(0,0,0,0.5)] outline-none max-[620px]:max-h-[calc(100dvh-16px)] max-[620px]:rounded-[10px] max-[620px]:p-4',
        className
      )}
      {...props}
    />
  );
}

export function DetailHeader({ className, ...props }: React.ComponentProps<'header'>) {
  return (
    <header
      className={cn(
        'mb-6 flex min-w-0 items-start justify-between gap-5 max-[620px]:gap-3 [&>div]:min-w-0 [&_h2]:mb-0 [&_h2]:text-[30px] [&_h2]:font-bold [&_h2]:tracking-[-0.03em] [&_h2]:text-[#f4f8fc] max-[620px]:[&_h2]:text-2xl [&_p:last-child]:mt-1.5 [&_p:last-child]:mb-0 [&_p:last-child]:break-all [&_p:last-child]:text-[13px] [&_p:last-child]:text-[#7f91a9]',
        className
      )}
      {...props}
    />
  );
}

export function DetailGrid({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'grid min-w-0 grid-cols-1 gap-6 min-[1100px]:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]',
        className
      )}
      {...props}
    />
  );
}

export function FactSections({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('grid min-w-0 gap-[18px]', className)} {...props} />;
}

const factSectionTone = {
  default:
    'border-[#22384d] [&>header]:border-[#22384d] [&>header]:bg-[linear-gradient(90deg,rgba(24,43,61,0.92),rgba(11,25,40,0.82))] [&>header>span]:border-[#315069] [&>header>span]:bg-[#0b1928] [&>header>span]:text-[#7f95aa]',
  price:
    'border-[#285043] [&>header]:border-[#285043] [&>header]:bg-[linear-gradient(90deg,rgba(16,52,44,0.88),rgba(10,29,34,0.78))] [&>header>span]:border-[#34705a] [&>header>span]:bg-[#0d2823] [&>header>span]:text-[#68dba5]',
  risk: 'border-[#51462b] [&>header]:border-[#51462b] [&>header]:bg-[linear-gradient(90deg,rgba(55,45,23,0.8),rgba(25,28,31,0.78))] [&>header>span]:border-[#776236] [&>header>span]:bg-[#2a2415] [&>header>span]:text-[#e1c36e]'
};

export function FactSection({
  tone = 'default',
  className,
  ...props
}: React.ComponentProps<'section'> & { tone?: keyof typeof factSectionTone }) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-[13px] border bg-[#0b1725] shadow-[0_12px_28px_rgba(0,0,0,0.12)] [&>header]:flex [&>header]:min-h-[68px] [&>header]:items-center [&>header]:gap-[13px] [&>header]:border-b [&>header]:px-[17px] [&>header]:py-[13px] [&>header>span]:grid [&>header>span]:size-[34px] [&>header>span]:shrink-0 [&>header>span]:place-items-center [&>header>span]:rounded-[9px] [&>header>span]:border [&>header>span]:text-[10px] [&>header>span]:font-extrabold [&>header>span]:tracking-[0.08em] [&_h3]:m-0 [&_h3]:text-[15px] [&_h3]:font-bold [&_h3]:text-[#e4edf7] [&_header_p]:mt-1 [&_header_p]:mb-0 [&_header_p]:text-[11px] [&_header_p]:leading-[1.4] [&_header_p]:text-[#6f8299]',
        factSectionTone[tone],
        className
      )}
      {...props}
    />
  );
}

export function FactGrid({
  columns = 3,
  className,
  ...props
}: React.ComponentProps<'dl'> & { columns?: 2 | 3 | 4 }) {
  return (
    <dl
      className={cn(
        'm-0 grid grid-cols-1 gap-px overflow-hidden bg-[#20364b] tabular-nums min-[480px]:grid-cols-2 [&>div]:min-h-[92px] [&>div]:min-w-0 [&>div]:bg-[#0c1929] [&>div]:p-4 [&_dd]:m-0 [&_dd]:break-words [&_dd]:text-sm [&_dd]:text-[#e5edf7] [&_dt]:mb-2 [&_dt]:text-[10px] [&_dt]:font-extrabold [&_dt]:tracking-[0.11em] [&_dt]:text-[#667a94] [&_dt]:uppercase [&_small]:mt-1.5 [&_small]:block [&_small]:break-words [&_small]:text-[11px] [&_small]:leading-[1.4] [&_small]:text-[#5f7189]',
        columns === 3 && 'min-[760px]:grid-cols-3',
        columns === 4 && 'min-[760px]:grid-cols-4',
        className
      )}
      {...props}
    />
  );
}

export function ActionColumn({ className, ...props }: React.ComponentProps<'aside'>) {
  return <aside className={cn('grid min-w-0 content-start gap-[14px]', className)} {...props} />;
}

export const actionCardClassName =
  'flex items-center justify-between gap-5 rounded-[11px] border border-[#2b5146] bg-[rgba(10,31,31,0.86)] p-[18px] [&_p]:mt-1.5 [&_p]:mb-0 [&_p]:text-[11px] [&_p]:leading-[1.5] [&_p]:text-[#71869b] [&_strong]:text-sm [&_strong]:text-[#dcf8ea]';
export const formLabelClassName =
  'text-[10px] font-extrabold tracking-[0.1em] text-[#8296ad] uppercase';
export const inputClassName =
  'min-h-[42px] w-full rounded-[9px] border border-[#2b4650] bg-[#0a1826] px-3 text-[13px] text-[#e6f1f8] tabular-nums outline-none focus:border-[#4ee1a0] focus:ring-2 focus:ring-[rgba(78,225,160,0.14)] disabled:opacity-60';
export const selectClassName = inputClassName;
export const noticeClassName =
  'rounded-[9px] border border-[#66562f] bg-[rgba(52,45,27,0.7)] px-3 py-[11px] text-[11px] leading-[1.45] text-[#e8ca77]';
export const errorNoticeClassName =
  'grid gap-2.5 rounded-[9px] border border-[#61343a] bg-[rgba(61,23,31,0.55)] px-3 py-[11px] text-[11px] leading-[1.45] text-[#ffb9b9]';
export const successNoticeClassName =
  'rounded-[9px] border border-[#28634e] bg-[rgba(18,58,45,0.72)] px-3 py-[11px] text-[11px] leading-[1.45] text-[#7af0b9]';
export const notesClassName =
  'mt-[18px] border-t border-[#20364b] pt-[18px] text-xs text-[#71839a] [&_p]:mt-1.5 [&_p]:mb-0 [&_strong]:text-[#9fb0c4]';
