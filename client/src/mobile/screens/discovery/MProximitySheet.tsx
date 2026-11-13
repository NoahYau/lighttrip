import type { DiscoverySuggestion } from '@trek/shared';
import { Navigation } from 'lucide-react';
import { distanceLabel, walkTimeLabel } from '../../../components/Discovery/nearbyModel';
import { useTranslation } from '../../../i18n';
import MSheet from '../../components/MSheet';

interface MProximitySheetProps {
  open: boolean;
  current: DiscoverySuggestion | null;
  accept: () => void;
  dismiss: () => void;
  onClose: () => void;
}

/**
 * The phone's roaming card, docked as a bottom sheet. Presentational — its own
 * markup rather than a port of the desktop card, with the state and actions
 * handed in by `MProximityCardHost`.
 */
export default function MProximitySheet({ open, current, accept, dismiss, onClose }: MProximitySheetProps) {
  const { t, locale } = useTranslation();

  return (
    <MSheet open={open} onClose={onClose} variant="bottom" ariaLabel={t('discovery.card.title')}>
      {current ? (
        <div className="flex flex-none flex-col px-5 pb-6 pt-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-[13px] bg-[color:var(--m-ic)] text-m-ink">
              <Navigation size={19} strokeWidth={1.8} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-subtitle font-bold leading-tight text-m-ink">
                {t('discovery.card.title')}
              </div>
              <div className="truncate font-geist text-caption text-m-muted">{current.name}</div>
            </div>
          </div>

          <div className="mt-3 font-geist text-caption tabular-nums text-m-muted">
            <span>{distanceLabel(current.distanceM, locale)}</span>
            {' · '}
            <span>{t('discovery.walkTime', { time: walkTimeLabel(current.walkMinutes, locale) })}</span>
          </div>

          {current.reason ? (
            <p className="mt-1.5 font-geist text-caption leading-relaxed text-m-muted">
              <span className="font-semibold text-m-ink">{t('discovery.card.reason')}: </span>
              {current.reason}
            </p>
          ) : null}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={dismiss}
              className="flex h-11 flex-1 items-center justify-center rounded-full border border-[color:var(--m-rowbr)] bg-[color:var(--m-ic)] font-semibold text-m-ink"
            >
              {t('discovery.card.dismiss')}
            </button>
            <button
              type="button"
              onClick={accept}
              className="flex h-11 flex-1 items-center justify-center rounded-full bg-[color:var(--m-act)] font-semibold text-[color:var(--m-act-ink)]"
            >
              {t('discovery.card.add')}
            </button>
          </div>
        </div>
      ) : null}
    </MSheet>
  );
}
