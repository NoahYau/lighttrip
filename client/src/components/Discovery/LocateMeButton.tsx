import { Navigation } from 'lucide-react';
import { getCurrentPositionOnce, type GeoPosition } from '../../hooks/useGeolocation';
import { useTranslation } from '../../i18n';
import { MapTogglePill } from '../Map/MapTogglePill';

/**
 * The desktop plan map's "locate me" pill. It wears the same frosted look as the
 * other map controls and, on click, asks the browser for a one-shot position fix,
 * handing it to the caller to recenter the map. A failed fix is ignored on
 * purpose: the button simply does nothing.
 */
export function LocateMeButton({ onLocate }: { onLocate: (pos: GeoPosition) => void }) {
  const { t } = useTranslation();

  const handleLocate = () => {
    void getCurrentPositionOnce().then(onLocate, () => {});
  };

  return (
    <MapTogglePill
      active={false}
      onToggle={handleLocate}
      label={t('discovery.locate')}
      testId="locate-me"
      icon={<Navigation size={17} strokeWidth={2} />}
    />
  );
}
