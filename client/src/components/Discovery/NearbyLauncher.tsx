import { MapPin } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../../i18n';
import { MapTogglePill } from '../Map/MapTogglePill';
import NearbyPanel from './NearbyPanel';

/**
 * The map's "near me" button and its floating list. A pill like the other map
 * controls; the panel it opens stands bottom-right over the map.
 */
export default function NearbyLauncher({ tripId }: { tripId: number }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <MapTogglePill
        active={open}
        onToggle={() => setOpen((o) => !o)}
        label={t('discovery.title')}
        testId="nearby-launcher"
        icon={<MapPin size={17} strokeWidth={2} />}
      />
      {open &&
        createPortal(
          <div
            className="pointer-events-none fixed flex flex-col items-end"
            style={{ bottom: 18, insetInlineEnd: 14, zIndex: 'var(--z-modal)' }}
          >
            <div className="pointer-events-auto">
              <NearbyPanel tripId={tripId} />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
