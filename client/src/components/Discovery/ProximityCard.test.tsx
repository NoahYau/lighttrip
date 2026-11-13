import type { DiscoverySuggestion } from '@trek/shared';
import { render, screen } from '../../../tests/helpers/render';
import ProximityCard from './ProximityCard';

import { describe, expect, it, vi } from 'vitest';

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

describe('ProximityCard', () => {
  it('shows the place, its distance and its reason', () => {
    render(<ProximityCard current={suggestion()} accept={vi.fn()} dismiss={vi.fn()} />);

    expect(screen.getByText('Worth a look')).toBeInTheDocument();
    expect(screen.getByText('Old Pumping Station')).toBeInTheDocument();
    expect(screen.getByText('220 m')).toBeInTheDocument();
    expect(screen.getByText('Built in 1901.')).toBeInTheDocument();
  });

  it('accepts and dismisses through its two actions', () => {
    const accept = vi.fn();
    const dismiss = vi.fn();
    render(<ProximityCard current={suggestion()} accept={accept} dismiss={dismiss} />);

    screen.getByRole('button', { name: 'Add to today' }).click();
    expect(accept).toHaveBeenCalled();
    screen.getByRole('button', { name: 'Not now' }).click();
    expect(dismiss).toHaveBeenCalled();
  });
});
