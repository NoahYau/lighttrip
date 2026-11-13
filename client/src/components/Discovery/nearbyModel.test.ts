import {
  categoryCounts,
  distanceLabel,
  filterByCategory,
  nearbyStatusView,
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
