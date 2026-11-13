import type { DiscoverySuggestion } from '@trek/shared';
import { createPortal } from 'react-dom';
import { useTranslation } from '../../i18n';
import { distanceLabel, walkTimeLabel } from './nearbyModel';

/**
 * The desktop "roaming" card: a floating notice over the map naming one place
 * worth a look right now. Presentational — `ProximityCardHost` owns the engine
 * and passes `current`, `accept` and `dismiss` down; this file is only markup.
 */
export default function ProximityCard({
  current,
  accept,
  dismiss,
}: {
  current: DiscoverySuggestion;
  accept: () => void;
  dismiss: () => void;
}) {
  const { t, locale } = useTranslation();

  return createPortal(
    <div
      className="pointer-events-none fixed flex flex-col items-end"
      style={{ bottom: 18, insetInlineEnd: 14, zIndex: 'var(--z-modal)' }}
    >
      <div className="pointer-events-auto w-[320px] max-w-[calc(100vw-28px)] rounded-2xl border border-edge bg-surface p-4 shadow-lg">
        <h2 className="text-subtitle font-semibold text-content">{t('discovery.card.title')}</h2>
        <p className="mt-1 text-body font-semibold text-content">{current.name}</p>
        <p className="mt-0.5 text-caption text-content-muted">
          <span>{distanceLabel(current.distanceM, locale)}</span>
          {' · '}
          <span>{t('discovery.walkTime', { time: walkTimeLabel(current.walkMinutes, locale) })}</span>
        </p>
        {current.reason ? (
          <p className="mt-2 text-caption leading-relaxed text-content-muted">
            <span className="font-semibold text-content">{t('discovery.card.reason')}: </span>
            {current.reason}
          </p>
        ) : null}
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="rounded-full border border-edge px-4 py-2 text-body font-semibold text-content"
          >
            {t('discovery.card.dismiss')}
          </button>
          <button
            type="button"
            onClick={accept}
            className="rounded-full bg-accent px-4 py-2 text-body font-semibold text-accent-text"
          >
            {t('discovery.card.add')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
