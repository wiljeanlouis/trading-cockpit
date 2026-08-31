export type SortDirection = 'asc' | 'desc';

export function sortChevron(active: boolean, direction: SortDirection): string {
  if (!active) return '↕';
  return direction === 'asc' ? '↑' : '↓';
}

export function sortAriaLabel(label: string, active: boolean, direction: SortDirection): string {
  if (!active) return `${label}, sortable`;
  return `${label}, sorted ${direction === 'asc' ? 'ascending' : 'descending'}`;
}

export function CockpitSortHeader({
  label,
  active,
  direction,
  onClick,
  align = 'left'
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
  align?: 'left' | 'right';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={sortAriaLabel(label, active, direction)}
      className={[
        'flex h-full w-full items-center px-5 py-3',
        align === 'right' ? 'justify-end text-right' : 'justify-start text-left'
      ].join(' ')}
    >
      {label}
      <span className="ml-2 text-[10px] text-[#62748d]">{sortChevron(active, direction)}</span>
    </button>
  );
}
