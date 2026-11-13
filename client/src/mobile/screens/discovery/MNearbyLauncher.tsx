import { MapPin } from 'lucide-react';
import { useState } from 'react';
import { MapTogglePill } from '../../../components/Map/MapTogglePill';
import { useTranslation } from '../../../i18n';
import MNearbySheet from './MNearbySheet';

/**
 * The phone map's "near me" control: a round control that opens the docked
 * sheet. Marked `opensDialog` so it announces a dialog rather than a pressed
 * state it does not have.
 */
export default function MNearbyLauncher({ tripId }: { tripId: number }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <MapTogglePill
        active={open}
        opensDialog
        onToggle={() => setOpen(true)}
        label={t('discovery.title')}
        testId="mnearby-launcher"
        icon={<MapPin size={17} strokeWidth={2} />}
      />
      <MNearbySheet open={open} tripId={tripId} onClose={() => setOpen(false)} />
    </>
  );
}
