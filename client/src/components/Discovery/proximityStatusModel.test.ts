import { ROAM_FEATURE_LABELS, ROAM_STATUS_LABELS, SUPPRESS_REASON_LABELS, roamStatusKey } from './proximityStatusModel';

describe('SUPPRESS_REASON_LABELS', () => {
  it('names every suppress reason with its discovery.suppress key', () => {
    expect(SUPPRESS_REASON_LABELS.accuracy).toEqual({ labelKey: 'discovery.suppress.accuracy' });
    expect(SUPPRESS_REASON_LABELS['quiet-hours']).toEqual({ labelKey: 'discovery.suppress.quietHours' });
    expect(SUPPRESS_REASON_LABELS['daily-cap']).toEqual({ labelKey: 'discovery.suppress.dailyCap' });
    expect(SUPPRESS_REASON_LABELS.dismissed).toEqual({ labelKey: 'discovery.suppress.dismissed' });
    expect(Object.keys(SUPPRESS_REASON_LABELS)).toHaveLength(8);
  });
});

describe('ROAM_STATUS_LABELS', () => {
  it('names the toggle and the two while-roaming statuses', () => {
    expect(ROAM_STATUS_LABELS.on).toEqual({ labelKey: 'discovery.roam.on' });
    expect(ROAM_STATUS_LABELS.off).toEqual({ labelKey: 'discovery.roam.off' });
    expect(ROAM_STATUS_LABELS.tracking).toEqual({ labelKey: 'discovery.roam.tracking' });
    expect(ROAM_STATUS_LABELS.suppressed).toEqual({ labelKey: 'discovery.roam.suppressed' });
  });
});

describe('ROAM_FEATURE_LABELS', () => {
  it('names the title, subtitle and privacy keys', () => {
    expect(ROAM_FEATURE_LABELS.title.labelKey).toBe('discovery.roam.title');
    expect(ROAM_FEATURE_LABELS.subtitle.labelKey).toBe('discovery.roam.subtitle');
    expect(ROAM_FEATURE_LABELS.privacy.labelKey).toBe('discovery.roam.privacy');
  });
});

describe('roamStatusKey', () => {
  it('collapses the engine states onto the four UI lines', () => {
    expect(roamStatusKey('idle', false)).toBe('off');
    expect(roamStatusKey('tracking', true)).toBe('tracking');
    expect(roamStatusKey('suppressed', true)).toBe('suppressed');
    expect(roamStatusKey('showing', true)).toBe('on');
    expect(roamStatusKey('scanning', true)).toBe('on');
    expect(roamStatusKey('cooldown', true)).toBe('on');
  });
});
