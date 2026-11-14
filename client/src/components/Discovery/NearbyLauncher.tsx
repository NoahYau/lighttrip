import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../../i18n';
import { MapTogglePill } from '../Map/MapTogglePill';
import SafariCompassIcon from '../shared/SafariCompassIcon';
import NearbyPanel from './NearbyPanel';

/**
 * The panel's bottom edge, in px from the viewport bottom: the capsule's own 18
 * plus its 42 (a 34px button in the shell's 4px padding) and an 8px gap above it.
 */
const PANEL_BOTTOM = 68;

/**
 * The map's "what's nearby" capsule and its floating list. The capsule is a
 * bottom-centre map control like the others; the panel it opens stands centred
 * above it, inside the corridor the side panels leave ("what is around here" is
 * answered against the map behind it, so it must not sit under a panel).
 */
export default function NearbyLauncher({
  tripId,
  getFallbackCenter,
  insetStart = 0,
  insetEnd = 0,
}: {
  tripId: number;
  getFallbackCenter?: () => { lat: number; lng: number } | null;
  /** The card's gap from the viewport's inline start, in px (past the left panel). */
  insetStart?: number;
  /** The card's gap from the viewport's inline end, in px (past the right panel). */
  insetEnd?: number;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <MapTogglePill
        active={open}
        onToggle={() => setOpen((o) => !o)}
        label={t('discovery.whatsNearby')}
        text={t('discovery.whatsNearby')}
        testId="nearby-launcher"
        icon={<SafariCompassIcon size={17} />}
      />
      {open &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              insetInlineStart: insetStart,
              insetInlineEnd: insetEnd,
              bottom: PANEL_BOTTOM,
              display: 'flex',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 'var(--z-modal)',
            }}
          >
            <div className="pointer-events-auto">
              <NearbyPanel tripId={tripId} getFallbackCenter={getFallbackCenter} onClose={() => setOpen(false)} />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
