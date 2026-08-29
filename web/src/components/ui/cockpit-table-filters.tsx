import { Button } from './button';

export function CockpitStatusFilters({
  totalCount,
  visibleCount,
  availableStatuses,
  activeStatuses,
  onToggleStatus,
  onReset,
  defaultLabel = 'Read-only'
}: {
  totalCount: number;
  visibleCount: number;
  availableStatuses: string[];
  activeStatuses: string[];
  onToggleStatus: (status: string) => void;
  onReset: () => void;
  defaultLabel?: string;
}) {
  const statuses = availableStatuses.length > 0 ? availableStatuses : activeStatuses;

  return (
    <div className="flex flex-col gap-4 border-b border-[#1d3045] px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-[#92a3b9]">
          {visibleCount} of {totalCount} items
        </span>
        <small className="rounded-full border border-[#29443f] px-2 py-1 text-[9px] font-extrabold tracking-[0.08em] text-[#6fae91] uppercase">
          {defaultLabel}
        </small>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-extrabold tracking-[0.14em] text-[#64758d] uppercase">
          Status filters
        </span>
        {statuses.map((status) => {
          const active = activeStatuses.includes(status);
          return (
            <button
              key={status}
              type="button"
              onClick={() => onToggleStatus(status)}
              aria-pressed={active}
              className={[
                'inline-flex items-center rounded-full border px-3 py-1.5 text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors',
                active
                  ? 'border-[#4ee1a0] bg-[rgba(78,225,160,0.12)] text-[#dfffee]'
                  : 'border-[#24384d] bg-[rgba(10,20,33,0.6)] text-[#7f8fa6] hover:border-[#35526d] hover:text-[#dce6f3]'
              ].join(' ')}
            >
              {status}
            </button>
          );
        })}
        <Button variant="retry" onClick={onReset}>
          Reset
        </Button>
      </div>
    </div>
  );
}
