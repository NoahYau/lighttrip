import type { DiscoveryCategory, DiscoverySuggestion } from '@trek/shared';
import { MapPin } from 'lucide-react';
import { useMemo, useState } from 'react';
import DiscoveryFilterChips from '../../../components/Discovery/DiscoveryFilterChips';
import {
  CATEGORY_LABELS,
  categoryCounts,
  distanceLabel,
  filterByCategory,
  nearbyStatusView,
  walkTimeLabel,
} from '../../../components/Discovery/nearbyModel';
import { useNearbyDiscovery } from '../../../components/Discovery/useNearbyDiscovery';
import { useTranslation } from '../../../i18n';
import MSheet from '../../components/MSheet';

interface MNearbySheetProps {
  open: boolean;
  tripId: number;
  onClose: () => void;
  getFallbackCenter?: () => { lat: number; lng: number } | null;
}

/**
 * The phone "near me" list, docked above the nav. Its own markup rather than a
 * port of the desktop panel: the sheet has its own rows and its own scrolling.
 * What the two share is the logic — the `useNearbyDiscovery` hook and the
 * `nearbyModel` helpers — which is why both import the same module.
 */
export default function MNearbySheet({ open, tripId, onClose, getFallbackCenter }: MNearbySheetProps) {
  const { t, locale } = useTranslation();
  const { status, suggestions, scan } = useNearbyDiscovery(tripId, getFallbackCenter);
  const [chip, setChip] = useState<DiscoveryCategory | 'all'>('all');
  const counts = useMemo(() => categoryCounts(suggestions), [suggestions]);
  const visible = useMemo(() => filterByCategory(suggestions, chip), [suggestions, chip]);
  const view = nearbyStatusView(status, suggestions.length > 0, t);

  return (
    <MSheet open={open} onClose={onClose} variant="bottom" ariaLabel={t('discovery.title')}>
      <div className="flex flex-none items-center gap-3 px-5 pb-1 pt-4">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-[13px] bg-[color:var(--m-ic)] text-m-ink">
          <MapPin size={19} strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-subtitle font-bold leading-tight text-m-ink">{t('discovery.title')}</div>
          <div className="truncate font-geist text-caption text-m-muted">{t('discovery.subtitle')}</div>
        </div>
      </div>

      <div className="m-scroll-fade min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-3">
        {view.kind === 'empty' ? (
          <EmptyBlock text={view.text} action={view.action ?? undefined} onAction={scan} />
        ) : (
          <>
            <DiscoveryFilterChips
              variant="mobile"
              chip={chip}
              onSelect={setChip}
              counts={counts}
              total={suggestions.length}
              t={t}
            />

            {visible.length === 0 ? (
              <p className="font-geist text-caption text-m-muted">{t('discovery.noMatches')}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {visible.map((suggestion) => (
                  <NearbyRow key={suggestion.providerId} suggestion={suggestion} t={t} locale={locale} />
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={scan}
              className="mt-3 flex h-11 w-full items-center justify-center rounded-full border border-[color:var(--m-rowbr)] bg-[color:var(--m-ic)] font-semibold text-m-ink"
            >
              {t('discovery.scanAgain')}
            </button>
          </>
        )}
      </div>
    </MSheet>
  );
}

function NearbyRow({
  suggestion,
  t,
  locale,
}: {
  suggestion: DiscoverySuggestion;
  t: (key: string, vars?: Record<string, string>) => string;
  locale: string;
}) {
  return (
    <li className="rounded-2xl border border-[color:var(--m-rowbr)] bg-[color:var(--m-ic)] px-3.5 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate font-geist text-body font-semibold text-m-ink">{suggestion.name}</span>
        <span className="flex-none font-geist text-caption tabular-nums text-m-muted">
          {distanceLabel(suggestion.distanceM, locale)}
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 font-geist text-caption text-m-muted">
        <span className="rounded-full bg-[color:var(--m-rowbr)] px-2 py-0.5">
          {t(CATEGORY_LABELS[suggestion.category].labelKey)}
        </span>
        <span>{t('discovery.walkTime', { time: walkTimeLabel(suggestion.walkMinutes, locale) })}</span>
      </div>
      {suggestion.reason ? (
        <p className="mt-1.5 font-geist text-caption leading-relaxed text-m-muted">{suggestion.reason}</p>
      ) : null}
    </li>
  );
}

function EmptyBlock({ text, action, onAction }: { text: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="font-geist text-body text-m-muted">{text}</p>
      {action && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="flex h-11 items-center justify-center rounded-full bg-[color:var(--m-act)] px-4 font-semibold text-[color:var(--m-act-ink)]"
        >
          {action}
        </button>
      ) : null}
    </div>
  );
}
