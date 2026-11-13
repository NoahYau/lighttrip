import type { DiscoverySuggestion } from '@trek/shared';
import { render, screen } from '../../../../tests/helpers/render';
import { useNearbyDiscovery } from '../../../components/Discovery/useNearbyDiscovery';
import MNearbySheet from './MNearbySheet';

import { describe, expect, it, vi } from 'vitest';

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

describe('MNearbySheet', () => {
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
});
