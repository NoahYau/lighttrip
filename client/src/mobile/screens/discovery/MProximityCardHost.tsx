import { Navigation } from 'lucide-react';
import { useProximityEngine } from '../../../components/Discovery/useProximityEngine';
import { MapTogglePill } from '../../../components/Map/MapTogglePill';
import { useTranslation } from '../../../i18n';
import MProximitySheet from './MProximitySheet';

/**
 * The phone map's roaming control and its docked card. The engine is called once
 * here and handed to the sheet, so the pill's status and the sheet's card never
 * diverge.
 */
export default function MProximityCardHost({ tripId }: { tripId: number }) {
  const { t } = useTranslation();
  const { roamEnabled, toggleRoam, status, current, dismiss, accept } = useProximityEngine(tripId);

  return (
    <>
      <MapTogglePill
        active={roamEnabled}
        opensDialog
        onToggle={toggleRoam}
        label={t(roamEnabled ? 'discovery.roam.stop' : 'discovery.roam.start')}
        testId="mproximity-roam"
        icon={<Navigation size={17} strokeWidth={2} />}
      />
      <MProximitySheet
        open={status === 'showing'}
        current={current}
        accept={accept}
        dismiss={dismiss}
        onClose={dismiss}
      />
    </>
  );
}
