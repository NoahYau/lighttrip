// FE-COMP-NEARBYLAUNCH-001 to FE-COMP-NEARBYLAUNCH-003
//
// The map's "what's nearby" capsule and the panel it opens. The capsule is one of
// the frosted map controls and must read as one: a monochrome compass, the words
// beside it, and the panel centred above it inside the corridor the side panels
// leave — never a card tucked under a panel, which is what "nearby" would still be
// answering if the button were in a corner.
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '../../../tests/helpers/render';
import NearbyLauncher from './NearbyLauncher';

// The real panel talks to the discovery API and owns its own layout; here only the
// door and the frame around it matter.
vi.mock('./NearbyPanel', () => ({
  default: ({
    tripId,
    getFallbackCenter,
    onClose,
  }: {
    tripId: number;
    getFallbackCenter?: () => { lat: number; lng: number } | null;
    onClose: () => void;
  }) => (
    <div data-testid="nearby-panel">
      <span>{`trip ${tripId}`}</span>
      <span>{`centre ${getFallbackCenter?.()?.lat ?? 'none'}`}</span>
      <button type="button" onClick={onClose}>
        close
      </button>
    </div>
  ),
}));

/** The portal's outer band: the panel sits inside the band's pointer-events-auto wrapper. */
function band(): HTMLElement {
  const wrapper = screen.getByTestId('nearby-panel').parentElement?.parentElement;
  if (!wrapper) throw new Error('the panel was not portalled into a band');
  return wrapper;
}

describe('NearbyLauncher', () => {
  it('FE-COMP-NEARBYLAUNCH-001: the map control is a capsule showing "What\'s Nearby" with the compass beside it', () => {
    render(<NearbyLauncher tripId={7} />);
    const button = screen.getByTestId('nearby-launcher');

    expect(button).toHaveAccessibleName("What's Nearby");
    expect(button).toHaveTextContent("What's Nearby");
    // The labelled capsule, not the round pill the other map controls are.
    expect(button.style.width).toBe('auto');

    // The compass is decoration: the label names the control, and the needle is
    // drawn on the button's own colour rather than a colour of its own.
    const icon = button.querySelector('svg');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
    expect(icon?.querySelector('path')?.getAttribute('fill')).toBe('currentColor');
  });

  it('FE-COMP-NEARBYLAUNCH-002: pressing it opens the panel on the trip and the fallback centre, and its close puts it away', () => {
    const fallback = { lat: 48.1, lng: 11.6 };
    render(<NearbyLauncher tripId={7} getFallbackCenter={() => fallback} />);
    expect(screen.queryByTestId('nearby-panel')).toBeNull();

    fireEvent.click(screen.getByTestId('nearby-launcher'));
    expect(screen.getByTestId('nearby-panel')).toHaveTextContent('trip 7');
    expect(screen.getByTestId('nearby-panel')).toHaveTextContent('centre 48.1');
    expect(screen.getByTestId('nearby-launcher')).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.queryByTestId('nearby-panel')).toBeNull();
  });

  it('FE-COMP-NEARBYLAUNCH-003: the panel opens centred above the capsule, inside the measured corridor', () => {
    render(<NearbyLauncher tripId={7} insetStart={330} insetEnd={290} />);
    fireEvent.click(screen.getByTestId('nearby-launcher'));
    const wrapper = band();

    // Over the map, not inside the map's own box, and centred by the flex row.
    expect(wrapper.parentElement).toBe(document.body);
    expect(wrapper.style.position).toBe('fixed');
    expect(wrapper.style.insetInlineStart).toBe('330px');
    expect(wrapper.style.insetInlineEnd).toBe('290px');
    // 18px above the bottom for the capsule, its 42, and an 8px gap.
    expect(wrapper.style.bottom).toBe('68px');
    expect(wrapper.style.display).toBe('flex');
    expect(wrapper.style.justifyContent).toBe('center');
    expect(wrapper.style.pointerEvents).toBe('none');

    // Logical insets only, so the corridor follows the reading direction.
    expect(wrapper.style.left).toBe('');
    expect(wrapper.style.right).toBe('');
    expect(wrapper.firstElementChild).toHaveClass('pointer-events-auto');
  });
});
