import { DISCOVERY_METRIC_EVENTS, readDailyCount, recordDiscoveryMetric, todayKey } from './discoveryMetrics';

afterEach(() => localStorage.clear());

// A fixed local-midnight instant, so `todayKey` is deterministic whatever the
// test runner's timezone.
const NOW = new Date(2026, 0, 5, 10, 30, 0);

describe('todayKey', () => {
  it('writes the local date as YYYY-MM-DD', () => {
    expect(todayKey(NOW)).toBe('2026-01-05');
  });

  it('zero-pads the month and day', () => {
    expect(todayKey(new Date(2026, 2, 7))).toBe('2026-03-07');
  });
});

describe('recordDiscoveryMetric', () => {
  it('bumps the daily count for that event and leaves the others alone', () => {
    expect(recordDiscoveryMetric('discovery.emit', { cell: '12:34' }, NOW)).toEqual({
      cell: '12:34',
      dailyCount: 1,
    });
    expect(recordDiscoveryMetric('discovery.emit', { cell: '12:34' }, NOW).dailyCount).toBe(2);
    expect(readDailyCount('discovery.emit', NOW)).toBe(2);
    expect(readDailyCount('discovery.dismiss', NOW)).toBe(0);
  });

  it('keeps only the fields the payload declares, never a coordinate', () => {
    const recorded = recordDiscoveryMetric(
      'discovery.accept',
      { providerId: 'osm:node:1', category: 'culture', reason: 'Built in 1901.' },
      NOW
    );
    expect(recorded).toEqual({
      providerId: 'osm:node:1',
      category: 'culture',
      reason: 'Built in 1901.',
      dailyCount: 1,
    });
    expect('lat' in recorded).toBe(false);
    expect('lng' in recorded).toBe(false);
  });

  it('resets every count when the day rolls over', () => {
    recordDiscoveryMetric('discovery.scan', { cell: '12:34' }, NOW);
    expect(readDailyCount('discovery.scan', NOW)).toBe(1);

    const nextDay = new Date(2026, 0, 6, 9, 0, 0);
    expect(readDailyCount('discovery.scan', nextDay)).toBe(0);
    expect(recordDiscoveryMetric('discovery.scan', { cell: '12:34' }, nextDay).dailyCount).toBe(1);
    expect(readDailyCount('discovery.scan', nextDay)).toBe(1);
  });

  it('treats a malformed stored value as empty rather than trusting it', () => {
    localStorage.setItem('trek:discovery:metrics', '{not json');
    expect(recordDiscoveryMetric('discovery.emit', {}, NOW).dailyCount).toBe(1);

    localStorage.setItem(
      'trek:discovery:metrics',
      JSON.stringify({ date: '2026-01-05', counts: { 'discovery.emit': 'many' } })
    );
    expect(recordDiscoveryMetric('discovery.emit', {}, NOW).dailyCount).toBe(1);
  });
});

describe('readDailyCount', () => {
  it('returns 0 for an event nothing has recorded today', () => {
    expect(readDailyCount('discovery.accept', NOW)).toBe(0);
  });

  it('counts each event on its own', () => {
    recordDiscoveryMetric('discovery.scan', {}, NOW);
    recordDiscoveryMetric('discovery.scan', {}, NOW);
    recordDiscoveryMetric('discovery.dismiss', {}, NOW);
    expect(readDailyCount('discovery.scan', NOW)).toBe(2);
    expect(readDailyCount('discovery.dismiss', NOW)).toBe(1);
  });
});

describe('DISCOVERY_METRIC_EVENTS', () => {
  it('names exactly the six roaming events', () => {
    expect(DISCOVERY_METRIC_EVENTS).toEqual([
      'discovery.scan',
      'discovery.trigger',
      'discovery.suppress',
      'discovery.emit',
      'discovery.accept',
      'discovery.dismiss',
    ]);
  });
});
