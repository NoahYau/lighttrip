import type { DiscoverySuggestion } from '@trek/shared';
import { fireEvent, render, screen, within } from '../../../tests/helpers/render';
import NearbyPanel from './NearbyPanel';
import { useNearbyDiscovery } from './useNearbyDiscovery';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetAllStores, seedStore } from '../../../tests/helpers/store';
import { useAddonStore } from '../../store/addonStore';

vi.mock('./useNearbyDiscovery', () => ({ useNearbyDiscovery: vi.fn() }));

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
  return {
    status: 'idle' as const,
    suggestions: [],
    scan: vi.fn(),
    retry: vi.fn(),
    ...over,
  };
}

/** Turn the instance's Discovery map-area flag on; the store default is off, so each test says what it needs. */
function withMapArea(): void {
  seedStore(useAddonStore, { discoveryMapArea: true });
}

beforeEach(() => {
  resetAllStores();
});

describe('NearbyPanel', () => {
  it('opens on the idle state and scans when the button is pressed', () => {
    const scan = vi.fn();
    hook.mockReturnValue(state({ scan }));
    render(<NearbyPanel tripId={7} onClose={vi.fn()} />);

    expect(screen.getByText('Nearby')).toBeInTheDocument();
    expect(screen.getByText('See what is around you.')).toBeInTheDocument();
    screen.getByRole('button', { name: 'Look around' }).click();
    expect(scan).toHaveBeenCalled();
  });

  it('lists the suggestions with their category, walk time and reason', () => {
    hook.mockReturnValue(
      state({
        status: 'ready',
        suggestions: [
          suggestion(),
          suggestion({
            providerId: 'osm:node:2',
            name: 'Corner Cafe',
            category: 'food',
            distanceM: 100,
            walkMinutes: 1,
            reason: '',
          }),
        ],
      })
    );
    render(<NearbyPanel tripId={7} onClose={vi.fn()} />);

    const list = screen.getByRole('tablist', { name: 'Categories' });
    expect(within(list).getByRole('button', { name: /Culture/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Old Pumping Station')).toBeInTheDocument();
    expect(screen.getByText('walk 3 min')).toBeInTheDocument();
    expect(screen.getByText('Built in 1901.')).toBeInTheDocument();
  });

  it('shows the offline message with a retry', () => {
    const scan = vi.fn();
    hook.mockReturnValue(state({ status: 'offline', scan }));
    render(<NearbyPanel tripId={7} onClose={vi.fn()} />);

    expect(screen.getByText('Finding nearby places needs a connection.')).toBeInTheDocument();
    screen.getByRole('button', { name: 'Try again' }).click();
    expect(scan).toHaveBeenCalled();
  });

  it("keeps today's card when the map-area setting is off: no origin switch, no second rescan", () => {
    const rescan = vi.fn();
    hook.mockReturnValue(state({ status: 'ready', suggestions: [suggestion()], radiusM: 250, rescan }));
    render(<NearbyPanel tripId={7} onClose={vi.fn()} />);

    expect(screen.queryByRole('group', { name: 'Nearby' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Near me' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'This area' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Look around again' })).toBeNull();
    // The device scan is a short walk, so the row still says so.
    expect(screen.getByText('walk 3 min')).toBeInTheDocument();
  });

  it('shows the origin switch before the first scan and asks for the map area once it is picked', () => {
    withMapArea();
    hook.mockReturnValue(state());
    render(<NearbyPanel tripId={7} onClose={vi.fn()} />);

    expect(screen.getByRole('group', { name: 'Nearby' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Near me' })).toHaveAttribute('aria-pressed', 'true');
    expect(hook).toHaveBeenLastCalledWith(7, undefined, { origin: 'device' });

    fireEvent.click(screen.getByRole('button', { name: 'This area' }));

    expect(hook).toHaveBeenLastCalledWith(7, undefined, { origin: 'map' });
    expect(screen.getByRole('button', { name: 'This area' })).toHaveAttribute('aria-pressed', 'true');
    // Nothing is listed yet, so the empty state keeps its own single action.
    expect(screen.queryByRole('button', { name: 'Look around again' })).toBeNull();
  });

  it('offers a persistent "look around again" once a list is showing, wired to the hook rescan', () => {
    withMapArea();
    const rescan = vi.fn();
    hook.mockReturnValue(state({ status: 'ready', suggestions: [suggestion()], radiusM: 250, rescan }));
    render(<NearbyPanel tripId={7} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Look around again' }));
    expect(rescan).toHaveBeenCalled();
  });

  it('drops the walk-time chip above 400 m but keeps the distance', () => {
    withMapArea();
    hook.mockReturnValue(state({ status: 'ready', suggestions: [suggestion()], radiusM: 5000 }));
    render(<NearbyPanel tripId={7} onClose={vi.fn()} />);

    const row = screen.getByRole('listitem');
    expect(within(row).queryByText('walk 3 min')).toBeNull();
    expect(within(row).getByText('220 m')).toBeInTheDocument();
    expect(within(row).getByText('Culture')).toBeInTheDocument();
  });
});
