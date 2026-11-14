import {
  categoryCounts,
  DEFAULT_SCAN_RADIUS_M,
  distanceLabel,
  filterByCategory,
  nearbyStatusView,
  originFromViewport,
  quantiseScanRadiusM,
  showsWalkTime,
  toCell,
  walkTimeLabel,
} from './nearbyModel';

describe('toCell', () => {
  it('returns the same cell for nearby positions and a different one further away', () => {
    const cell = toCell(22.3027, 114.1772);
    expect(cell).toMatch(/^-?\d+:-?\d+$/);
    expect(toCell(22.3027, 114.1772)).toBe(cell);
    // A few metres apart still lands in the same 150 m cell.
    expect(toCell(22.30275, 114.17725)).toBe(cell);
    expect(toCell(22.3047, 114.1772)).not.toBe(cell);
  });
});

describe('distanceLabel', () => {
  it('shows metres under a kilometre and km past it', () => {
    expect(distanceLabel(220, 'en-US')).toBe('220 m');
    expect(distanceLabel(1250, 'en-US')).toBe('1.3 km');
  });
});

describe('walkTimeLabel', () => {
  it('shows the minutes with the shared unit', () => {
    expect(walkTimeLabel(3, 'en-US')).toBe('3 min');
  });
});

describe('filterByCategory', () => {
  const suggestions = [{ category: 'culture' }, { category: 'food' }, { category: 'culture' }] as never[];

  it('returns everything for "all" and only the category otherwise', () => {
    expect(filterByCategory(suggestions, 'all')).toHaveLength(3);
    expect(filterByCategory(suggestions, 'culture')).toHaveLength(2);
    expect(filterByCategory(suggestions, 'shopping')).toHaveLength(0);
  });
});

describe('categoryCounts', () => {
  it('tallies each category', () => {
    const counts = categoryCounts([{ category: 'culture' }, { category: 'food' }, { category: 'culture' }] as never[]);
    expect(counts.culture).toBe(2);
    expect(counts.food).toBe(1);
    expect(counts.nature).toBe(0);
  });
});

describe('nearbyStatusView', () => {
  const t = (k: string): string => k;

  it('maps each status to its message and action', () => {
    expect(nearbyStatusView('idle', false, t)).toEqual({
      kind: 'empty',
      text: 'discovery.idle',
      action: 'discovery.scan',
    });
    expect(nearbyStatusView('loading', false, t)).toEqual({ kind: 'empty', text: 'discovery.loading', action: null });
    expect(nearbyStatusView('offline', false, t)).toEqual({
      kind: 'empty',
      text: 'discovery.offline',
      action: 'discovery.retry',
    });
    expect(nearbyStatusView('denied', false, t)).toEqual({ kind: 'empty', text: 'discovery.denied', action: null });
    expect(nearbyStatusView('unavailable', false, t)).toEqual({
      kind: 'empty',
      text: 'discovery.unavailable',
      action: 'discovery.retry',
    });
    expect(nearbyStatusView('error', false, t)).toEqual({
      kind: 'empty',
      text: 'discovery.error',
      action: 'discovery.retry',
    });
  });

  it('shows the list when ready with suggestions, and the empty message without', () => {
    expect(nearbyStatusView('ready', true, t)).toEqual({ kind: 'list' });
    expect(nearbyStatusView('ready', false, t)).toEqual({
      kind: 'empty',
      text: 'discovery.empty',
      action: 'discovery.scanAgain',
    });
  });
});

describe('quantiseScanRadiusM', () => {
  it('rounds up onto the 250/500/1000/2000/5000 ladder', () => {
    expect(quantiseScanRadiusM(250)).toBe(250);
    expect(quantiseScanRadiusM(251)).toBe(500);
    expect(quantiseScanRadiusM(500)).toBe(500);
    expect(quantiseScanRadiusM(501)).toBe(1000);
    expect(quantiseScanRadiusM(1000)).toBe(1000);
    expect(quantiseScanRadiusM(1001)).toBe(2000);
    expect(quantiseScanRadiusM(2000)).toBe(2000);
    expect(quantiseScanRadiusM(2001)).toBe(5000);
    expect(quantiseScanRadiusM(5000)).toBe(5000);
  });

  it('clamps to the contract bounds instead of leaving the ladder', () => {
    expect(quantiseScanRadiusM(0)).toBe(250);
    expect(quantiseScanRadiusM(49)).toBe(250);
    expect(quantiseScanRadiusM(50)).toBe(250);
    expect(quantiseScanRadiusM(6000)).toBe(5000);
    expect(quantiseScanRadiusM(Number.POSITIVE_INFINITY)).toBe(5000);
    expect(quantiseScanRadiusM(Number.NEGATIVE_INFINITY)).toBe(250);
  });

  it('falls back to the device default for a non-numeric radius', () => {
    expect(quantiseScanRadiusM(Number.NaN)).toBe(DEFAULT_SCAN_RADIUS_M);
  });

  it('is idempotent on every rung, so the ladder never drifts on a re-quantise', () => {
    for (const step of [250, 500, 1000, 2000, 5000]) {
      expect(quantiseScanRadiusM(quantiseScanRadiusM(step))).toBe(step);
    }
  });
});

describe('originFromViewport', () => {
  const viewport = { tripId: 7, south: 22.3, west: 114.17, north: 22.31, east: 114.18 };

  it('answers for the box centre with the quantised half-diagonal', () => {
    // A 0.01° × 0.01° box is ~756 m from its centre to a corner: the 1000 m rung.
    const region = originFromViewport(viewport, 7);
    expect(region?.lat).toBeCloseTo(22.305, 6);
    expect(region?.lng).toBeCloseTo(114.175, 6);
    expect(region?.radiusM).toBe(1000);
  });

  it('does not round a small viewport down: the narrowest rung is 250 m', () => {
    const region = originFromViewport({ tripId: 7, south: 22.3, west: 114.17, north: 22.3, east: 114.17 }, 7);
    expect(region?.lat).toBeCloseTo(22.3, 6);
    expect(region?.lng).toBeCloseTo(114.17, 6);
    expect(region?.radiusM).toBe(250);
  });

  it('treats an absent viewport, or one belonging to another trip, as no region', () => {
    expect(originFromViewport(null, 7)).toBeNull();
    expect(originFromViewport(undefined, 7)).toBeNull();
    expect(originFromViewport({ ...viewport, tripId: 8 }, 7)).toBeNull();
  });

  it('treats the antimeridian, an inverted box, a scrolled world map and non-finite bounds as no region', () => {
    // West east of east: the box crosses the date line.
    expect(originFromViewport({ ...viewport, west: 179.9, east: -179.9 }, 7)).toBeNull();
    // Longitudes past ±180 after scrolling the world map sideways.
    expect(originFromViewport({ ...viewport, west: 170, east: 200 }, 7)).toBeNull();
    expect(originFromViewport({ ...viewport, south: -91 }, 7)).toBeNull();
    expect(originFromViewport({ ...viewport, north: 91 }, 7)).toBeNull();
    // Inverted latitude.
    expect(originFromViewport({ ...viewport, south: 22.31, north: 22.3 }, 7)).toBeNull();
    // A viewport the map reported while still animating.
    expect(originFromViewport({ ...viewport, north: Number.NaN }, 7)).toBeNull();
  });
});

describe('showsWalkTime', () => {
  it('allows the walk chip up to 400 m', () => {
    expect(showsWalkTime(250)).toBe(true);
    expect(showsWalkTime(399)).toBe(true);
    expect(showsWalkTime(400)).toBe(true);
  });

  it('drops it above 400 m, where "walk" would overstate the distance', () => {
    expect(showsWalkTime(401)).toBe(false);
    expect(showsWalkTime(1000)).toBe(false);
    expect(showsWalkTime(5000)).toBe(false);
  });

  it('treats a non-numeric radius as not a short walk', () => {
    expect(showsWalkTime(Number.NaN)).toBe(false);
  });
});
