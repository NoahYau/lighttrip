import { Navigation } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { MapTogglePill } from '../Map/MapTogglePill';
import ProximityCard from './ProximityCard';
import { ROAM_STATUS_LABELS, roamStatusKey } from './proximityStatusModel';
import { useProximityEngine } from './useProximityEngine';

/**
 * The map's roaming control and its floating card. A pill like the other map
 * controls; it switches roaming on and off, and while the engine has a place on
 * offer (`status === 'showing'`) the card stands over the map through
 * `ProximityCard`'s own portal. The engine is called once here and its state is
 * handed down, so the pill and the card always read the same instance.
 */
export default function ProximityCardHost({ tripId }: { tripId: number }) {
  const { t } = useTranslation();
  const { roamEnabled, toggleRoam, status, current, dismiss, accept } = useProximityEngine(tripId);

  return (
    <>
      <MapTogglePill
        active={roamEnabled}
        onToggle={toggleRoam}
        label={t(roamEnabled ? 'discovery.roam.stop' : 'discovery.roam.start')}
        testId="proximity-roam"
        icon={<Navigation size={17} strokeWidth={2} />}
      />
      <span className="sr-only" role="status" aria-live="polite">
        {t(ROAM_STATUS_LABELS[roamStatusKey(status, roamEnabled)].labelKey)}
      </span>
      {status === 'showing' && current && <ProximityCard current={current} accept={accept} dismiss={dismiss} />}
    </>
  );
}
