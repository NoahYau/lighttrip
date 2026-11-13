import type { DiscoverySuggestion } from '@trek/shared';
import { render, screen } from '../../../../tests/helpers/render';
import MProximitySheet from './MProximitySheet';

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

describe('MProximitySheet', () => {
  it('shows the place and its actions when there is a suggestion', () => {
    render(<MProximitySheet open current={suggestion()} accept={vi.fn()} dismiss={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByText('Old Pumping Station')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add to today' })).toBeInTheDocument();
  });

  it('renders nothing when there is no suggestion', () => {
    render(<MProximitySheet open current={null} accept={vi.fn()} dismiss={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByText('Add to today')).not.toBeInTheDocument();
  });
});
