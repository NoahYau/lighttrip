import type { DiscoveryCategory } from '@trek/shared';
import { CATEGORY_LABELS, CATEGORY_ORDER } from './nearbyModel';

type ChipValue = DiscoveryCategory | 'all';

interface DiscoveryFilterChipsProps {
  variant: 'desktop' | 'mobile';
  chip: ChipValue;
  onSelect: (chip: ChipValue) => void;
  counts: Record<DiscoveryCategory, number>;
  total: number;
  t: (key: string) => string;
}

/**
 * The category chip bar both views render. The desktop and phone shells style
 * chips from different token systems, so the markup lives here once and the
 * `variant` picks the classes — `lint:dup` holds the two copies apart from ever
 * drifting by keeping a single source.
 */
export default function DiscoveryFilterChips({ variant, chip, onSelect, counts, total, t }: DiscoveryFilterChipsProps) {
  const chipClass = (active: boolean): string =>
    variant === 'desktop'
      ? `rounded-full border px-3 py-1 text-caption font-semibold ${active ? 'border-accent text-content' : 'border-edge text-content-muted'}`
      : active
        ? 'rounded-full bg-[color:var(--m-act)] px-3 py-1.5 font-geist text-caption font-semibold text-[color:var(--m-act-ink)]'
        : 'rounded-full border border-[color:var(--m-rowbr)] px-3 py-1.5 font-geist text-caption text-m-muted';

  return (
    <div
      role="tablist"
      aria-label={t('discovery.filters')}
      className={variant === 'desktop' ? 'flex flex-wrap gap-2 pb-2' : 'mb-3 flex flex-wrap gap-2'}
    >
      <button
        type="button"
        aria-pressed={chip === 'all'}
        onClick={() => onSelect('all')}
        className={chipClass(chip === 'all')}
      >
        {t('discovery.filterAll')}
        {total > 0 ? <span className="ms-1 tabular-nums opacity-70">{total}</span> : null}
      </button>
      {CATEGORY_ORDER.map((category) => (
        <button
          key={category}
          type="button"
          aria-pressed={chip === category}
          onClick={() => onSelect(category)}
          className={chipClass(chip === category)}
        >
          {t(CATEGORY_LABELS[category].labelKey)}
          {counts[category] > 0 ? <span className="ms-1 tabular-nums opacity-70">{counts[category]}</span> : null}
        </button>
      ))}
    </div>
  );
}
