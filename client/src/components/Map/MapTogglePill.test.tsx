// FE-COMP-MAPTOGGLE-001 to FE-COMP-MAPTOGGLE-003
//
// The frosted shell every map control wears, in both of its shapes: the round,
// wordless pill (the layer switcher, the overview toggle, the locate button) and
// the capsule that shows what it opens ("What's Nearby"). The second one must not
// quietly become the first: the round pills' geometry and tooltip are what the
// map's other controls line up on.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '../../../tests/helpers/render';
import { MapTogglePill } from './MapTogglePill';

const icon = <svg data-testid="pill-icon" aria-hidden="true" />;

function pill(props: { text?: string; label?: string } = {}) {
  return render(<MapTogglePill active={false} onToggle={vi.fn()} label="Layers" icon={icon} {...props} />);
}

afterEach(() => {
  vi.useRealTimers();
});

describe('MapTogglePill', () => {
  it('FE-COMP-MAPTOGGLE-001: without text it is still the round, wordless control', () => {
    pill();
    const button = screen.getByRole('button', { name: 'Layers' });

    // The icon is the whole button, so nothing is visible to read but it.
    expect(button.textContent).toBe('');
    expect(button.querySelector('span')).toBeNull();
    expect(button.style.width).toBe('34px');
    expect(button.style.height).toBe('34px');
    expect(button.style.borderRadius).toBe('999px');
  });

  it('FE-COMP-MAPTOGGLE-002: with text the icon and that label make a capsule, named by the label', () => {
    pill({ text: "What's Nearby" });
    const button = screen.getByRole('button', { name: 'Layers' });
    const label = button.querySelector('span') as HTMLElement | null;

    // The accessible name still comes from `label`, and the same words are on
    // screen for a touch device the tooltip never reaches.
    expect(button).toHaveAccessibleName('Layers');
    expect(button).toHaveTextContent("What's Nearby");
    expect(label?.textContent).toBe("What's Nearby");
    // Icon first, the words after it.
    expect(button.firstElementChild).toBe(screen.getByTestId('pill-icon'));
    expect(button.lastElementChild).toBe(label);

    // Stretched around both instead of the 34px square, in the caption tier that
    // follows the text-size setting.
    expect(button.style.width).toBe('auto');
    expect(button.style.height).toBe('34px');
    expect(button.style.gap).toBe('8px');
    expect(button.style.paddingInline).toBe('10px 14px');
    expect(label?.style.fontSize).toBe('calc(12px * var(--fs-scale-caption, 1))');
    expect(label?.style.fontWeight).toBe('600');
    expect(label?.style.lineHeight).toBe('1');
    expect(label?.style.whiteSpace).toBe('nowrap');
  });

  it('FE-COMP-MAPTOGGLE-003: the tip explains a wordless control and stays off a capsule', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const round = pill();
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Layers' }));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByRole('tooltip')).toHaveTextContent('Layers');
    round.unmount();

    // The capsule already says the words, so a tip repeating them is noise.
    pill({ text: "What's Nearby" });
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Layers' }));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
