import type { DiscoverySuggestion } from '@trek/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '../../../../tests/helpers/render';
import { resetAllStores, seedStore } from '../../../../tests/helpers/store';
import { useNearbyDiscovery } from '../../../components/Discovery/useNearbyDiscovery';
import { useAddonStore } from '../../../store/addonStore';
import MNearbySheet from './MNearbySheet';

vi.mock('../../../components/Discovery/useNearbyDiscovery', () => ({ useNearbyDiscovery: vi.fn() }));

const hook = vi.mocked(useNearbyDiscovery);

function suggestion(over: Partial<DiscoverySuggestion> = {}): DiscoverySuggestion {
  return {
    providerId: 'osm:node:1',
    source: 'openstreetmap',
    name: 'Old Pumping Station',
    category: 'culture',
    lat: 22.3,
    lng: 114.1,
    distanceM: 220,
    walkMinutes: 3,
    reason: 'Built in 1901.',
    score: 0.5,
    imageUrl: null,
    opensNow: null,
    state: 'new',
    ...over,
  };
}

function state(over: Partial<ReturnType<typeof useNearbyDiscovery>> = {}) {
  return { status: 'idle' as const, suggestions: [], scan: vi.fn(), retry: vi.fn(), ...over };
}

/** The options the sheet last handed the shared hook: origin mode and the open gate. */
function lastOptions() {
  const calls = hook.mock.calls;
  return calls[calls.length - 1]?.[2];
}

function seedArea(enabled: boolean) {
  seedStore(useAddonStore, { discoveryMapArea: enabled });
}

describe('MNearbySheet', () => {
  beforeEach(() => {
    resetAllStores();
    hook.mockReset();
  });

  it('opens on the idle state and offers the scan action', () => {
    const scan = vi.fn();
    hook.mockReturnValue(state({ scan }));
    render(<MNearbySheet open tripId={7} onClose={vi.fn()} />);

    expect(screen.getByText('Nearby')).toBeInTheDocument();
    screen.getByRole('button', { name: 'Look around' }).click();
    expect(scan).toHaveBeenCalled();
  });

  it('lists a suggestion with its category and distance', () => {
    hook.mockReturnValue(state({ status: 'ready', suggestions: [suggestion()] }));
    render(<MNearbySheet open tripId={7} onClose={vi.fn()} />);

    expect(screen.getByText('Old Pumping Station')).toBeInTheDocument();
    expect(screen.getByText('220 m')).toBeInTheDocument();
    expect(screen.getByText('Built in 1901.')).toBeInTheDocument();
  });

  it('leaves the origin control out while the map-area setting is off', () => {
    hook.mockReturnValue(state({ status: 'ready', suggestions: [suggestion()] }));
    render(<MNearbySheet open tripId={7} onClose={vi.fn()} />);

    expect(screen.queryByRole('group', { name: 'Nearby' })).not.toBeInTheDocument();
    expect(lastOptions()).toMatchObject({ origin: 'device', enabled: true });
  });

  it('offers the origin control before the first scan, so the area is pickable from idle', () => {
    seedArea(true);
    hook.mockReturnValue(state({ status: 'idle' }));
    render(<MNearbySheet open tripId={7} onClose={vi.fn()} />);

    // The idle card offers "Look around"; the switch must already be there, or
    // the only way into area mode would be a device scan first.
    expect(screen.getByRole('button', { name: 'Look around' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Nearby' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'This area' }));
    expect(lastOptions()).toMatchObject({ origin: 'map', enabled: true });
  });

  it('offers the origin control and hands the chosen area mode to the hook', () => {
    seedArea(true);
    hook.mockReturnValue(state({ status: 'ready', suggestions: [suggestion()] }));
    render(<MNearbySheet open tripId={7} onClose={vi.fn()} />);

    // The device is the default, so the switch starts on "Near me".
    expect(screen.getByRole('group', { name: 'Nearby' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Near me' })).toHaveAttribute('aria-pressed', 'true');
    expect(lastOptions()).toMatchObject({ origin: 'device', enabled: true });

    fireEvent.click(screen.getByRole('button', { name: 'This area' }));
    expect(lastOptions()).toMatchObject({ origin: 'map', enabled: true });

    fireEvent.click(screen.getByRole('button', { name: 'Near me' }));
    expect(lastOptions()).toMatchObject({ origin: 'device', enabled: true });
  });

  it('never scans behind a closed sheet, even after choosing the area', () => {
    seedArea(true);
    hook.mockReturnValue(state({ status: 'ready', suggestions: [suggestion()] }));
    const { rerender } = render(<MNearbySheet open tripId={7} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'This area' }));
    expect(lastOptions()).toMatchObject({ origin: 'map', enabled: true });

    // The launcher keeps the sheet mounted while it is shut, so the hook has to
    // be told: a closed sheet answers around the device and starts nothing.
    rerender(<MNearbySheet open={false} tripId={7} onClose={vi.fn()} />);
    expect(lastOptions()).toMatchObject({ origin: 'device', enabled: false });
  });

  it('wires the persistent Look around again button to the hook rescan', () => {
    const scan = vi.fn();
    const rescan = vi.fn();
    hook.mockReturnValue(state({ status: 'ready', suggestions: [suggestion()], scan, rescan }));
    render(<MNearbySheet open tripId={7} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Look around again' }));
    expect(rescan).toHaveBeenCalledTimes(1);
    expect(scan).not.toHaveBeenCalled();
  });

  it('falls back to a scan when the hook offers no rescan', () => {
    const scan = vi.fn();
    hook.mockReturnValue(state({ status: 'ready', suggestions: [suggestion()], scan }));
    render(<MNearbySheet open tripId={7} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Look around again' }));
    expect(scan).toHaveBeenCalledTimes(1);
  });

  it('drops the walk chip once the answer covers more than a short walk', () => {
    seedArea(true);
    hook.mockReturnValue(state({ status: 'ready', radiusM: 250, suggestions: [suggestion()] }));
    const { unmount } = render(<MNearbySheet open tripId={7} onClose={vi.fn()} />);
    expect(screen.getByText('walk 3 min')).toBeInTheDocument();
    unmount();

    // 2 km is no short walk: the distance stays, the walk wording does not.
    hook.mockReturnValue(state({ status: 'ready', radiusM: 2000, suggestions: [suggestion()] }));
    render(<MNearbySheet open tripId={7} onClose={vi.fn()} />);
    expect(screen.getByText('220 m')).toBeInTheDocument();
    expect(screen.queryByText('walk 3 min')).not.toBeInTheDocument();
  });
});
