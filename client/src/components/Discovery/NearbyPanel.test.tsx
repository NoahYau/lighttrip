import type { DiscoverySuggestion } from '@trek/shared';
import { render, screen, within } from '../../../tests/helpers/render';
import NearbyPanel from './NearbyPanel';
import { useNearbyDiscovery } from './useNearbyDiscovery';

import { describe, expect, it, vi } from 'vitest';

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
});
