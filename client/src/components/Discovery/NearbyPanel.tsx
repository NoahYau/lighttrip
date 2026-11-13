import type { DiscoveryCategory, DiscoverySuggestion } from '@trek/shared';
import { MapPin, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from '../../i18n';
import DiscoveryFilterChips from './DiscoveryFilterChips';
import {
  CATEGORY_LABELS,
  categoryCounts,
  distanceLabel,
  filterByCategory,
  nearbyStatusView,
  walkTimeLabel,
} from './nearbyModel';
import { useNearbyDiscovery } from './useNearbyDiscovery';

/**
 * The desktop "near me" list — the answer to "what is worth a short walk". A
 * floating card over the map, opened by `NearbyLauncher`. Logic lives in the
 * shared `useNearbyDiscovery` hook; this file is only markup.
 */
export default function NearbyPanel({
  tripId,
  getFallbackCenter,
  onClose,
}: {
  tripId: number;
  getFallbackCenter?: () => { lat: number; lng: number } | null;
  onClose: () => void;
}) {
  const { t, locale } = useTranslation();
  const { status, suggestions, scan } = useNearbyDiscovery(tripId, getFallbackCenter);
  const [chip, setChip] = useState<DiscoveryCategory | 'all'>('all');
  const counts = useMemo(() => categoryCounts(suggestions), [suggestions]);
  const visible = useMemo(() => filterByCategory(suggestions, chip), [suggestions, chip]);
  const view = nearbyStatusView(status, suggestions.length > 0, t);

  return (
    <div
      className="flex max-h-[70vh] w-[360px] max-w-[calc(100vw-28px)] flex-col overflow-hidden rounded-2xl"
      style={{
        background: 'var(--sidebar-bg)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: 'var(--sidebar-shadow)',
      }}
    >
      <header className="flex items-center gap-2 px-4 pb-2 pt-3">
        <MapPin size={16} className="flex-none text-content-muted" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-subtitle font-semibold text-content">{t('discovery.title')}</h2>
          <p className="truncate text-caption text-content-muted">{t('discovery.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-content-muted hover:text-content"
        >
          <X size={16} strokeWidth={2} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
        {view.kind === 'empty' ? (
          <Empty text={view.text} action={view.action ?? undefined} onAction={scan} />
        ) : (
          <>
            <DiscoveryFilterChips
              variant="desktop"
              chip={chip}
              onSelect={setChip}
              counts={counts}
              total={suggestions.length}
              t={t}
            />

            {visible.length === 0 ? (
              <p className="text-caption text-content-muted">{t('discovery.noMatches')}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {visible.map((suggestion) => (
                  <SuggestionRow key={suggestion.providerId} suggestion={suggestion} t={t} locale={locale} />
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SuggestionRow({
  suggestion,
  t,
  locale,
}: {
  suggestion: DiscoverySuggestion;
  t: (key: string, vars?: Record<string, string>) => string;
  locale: string;
}) {
  return (
    <li className="rounded-xl border border-edge px-3 py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-body font-semibold text-content">{suggestion.name}</span>
        <span className="flex-none text-caption text-content-muted">{distanceLabel(suggestion.distanceM, locale)}</span>
      </div>
      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-caption text-content-muted">
        <span>{t(CATEGORY_LABELS[suggestion.category].labelKey)}</span>
        <span>{t('discovery.walkTime', { time: walkTimeLabel(suggestion.walkMinutes, locale) })}</span>
      </div>
      {suggestion.reason ? <p className="mt-0.5 text-caption text-content-muted">{suggestion.reason}</p> : null}
    </li>
  );
}

function Empty({ text, action, onAction }: { text: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-body text-content-muted">{text}</p>
      {action && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="rounded-full border border-edge px-4 py-2 text-body font-semibold text-content"
        >
          {action}
        </button>
      ) : null}
    </div>
  );
}
