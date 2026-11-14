import { useState } from 'react';
import { MapTogglePill } from '../../../components/Map/MapTogglePill';
import SafariCompassIcon from '../../../components/shared/SafariCompassIcon';
import { useTranslation } from '../../../i18n';
import MNearbySheet from './MNearbySheet';

/**
 * The phone map's "what's nearby" control: a capsule that opens the docked sheet.
 * Marked `opensDialog` so it announces a dialog rather than a pressed state it
 * does not have.
 */
export default function MNearbyLauncher({
  tripId,
  getFallbackCenter,
}: {
  tripId: number;
  getFallbackCenter?: () => { lat: number; lng: number } | null;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <MapTogglePill
        active={open}
        opensDialog
        onToggle={() => setOpen(true)}
        label={t('discovery.whatsNearby')}
        text={t('discovery.whatsNearby')}
        testId="mnearby-launcher"
        icon={<SafariCompassIcon size={17} />}
      />
      <MNearbySheet open={open} tripId={tripId} onClose={() => setOpen(false)} getFallbackCenter={getFallbackCenter} />
    </>
  );
}
