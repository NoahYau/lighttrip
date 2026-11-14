import type { NearbyOriginMode } from './nearbyModel';

interface NearbyOriginSwitchProps {
  variant: 'desktop' | 'mobile';
  origin: NearbyOriginMode;
  onSelect: (origin: NearbyOriginMode) => void;
  t: (key: string) => string;
}

/** The two options, in the order they are offered: the device first, the map second. */
const OPTIONS: readonly { mode: NearbyOriginMode; labelKey: string }[] = [
  { mode: 'device', labelKey: 'discovery.originDevice' },
  { mode: 'map', labelKey: 'discovery.originArea' },
];

/**
 * The "near me / this area" switch both nearby views render once the map-area
 * setting is on. The desktop card and the phone sheet style a pill from
 * different token systems, so the markup lives here once and the `variant`
 * picks the classes — the same arrangement `DiscoveryFilterChips` uses, which
 * keeps `lint:dup` from ever seeing two copies that could drift.
 *
 * It is presentation only: the chosen mode is the caller's state, and what the
 * mode means lives in `useNearbyDiscovery`.
 */
export default function NearbyOriginSwitch({ variant, origin, onSelect, t }: NearbyOriginSwitchProps) {
  const optionClass = (active: boolean): string =>
    variant === 'desktop'
      ? `rounded-full border px-3 py-1 text-caption font-semibold ${active ? 'border-accent text-content' : 'border-edge text-content-muted'}`
      : `rounded-full px-3 py-1.5 font-geist text-caption font-semibold ${active ? 'bg-[color:var(--m-act)] text-[color:var(--m-act-ink)]' : 'border border-[color:var(--m-rowbr)] text-m-muted'}`;

  return (
    <div
      role="group"
      aria-label={t('discovery.title')}
      className={variant === 'desktop' ? 'flex flex-wrap gap-2 pb-2' : 'mb-3 flex flex-wrap gap-2'}
    >
      {OPTIONS.map(({ mode, labelKey }) => (
        <button
          key={mode}
          type="button"
          aria-pressed={origin === mode}
          onClick={() => onSelect(mode)}
          className={optionClass(origin === mode)}
        >
          {t(labelKey)}
        </button>
      ))}
    </div>
  );
}
