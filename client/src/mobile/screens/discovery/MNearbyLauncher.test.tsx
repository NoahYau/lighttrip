// FE-MOB-MNEARBYLAUNCH-001 to FE-MOB-MNEARBYLAUNCH-002
//
// The phone map's "what's nearby" capsule. It is the same door as the desktop
// launcher and the same frosted capsule, opening the docked sheet instead of the
// floating panel — the words on it are what tells a thumb what it opens before it
// is tapped.
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '../../../../tests/helpers/render';
import MNearbyLauncher from './MNearbyLauncher';

const sheet = vi.hoisted(() => ({ props: {} as Record<string, unknown> }));

// The real sheet is a dialog with its own data flow; only what the capsule hands
// it, and whether it is up, is read here.
vi.mock('./MNearbySheet', () => ({
  default: (props: Record<string, unknown>) => {
    sheet.props = props;
    return props.open ? <div data-testid="mnearby-sheet" /> : null;
  },
}));

describe('MNearbyLauncher', () => {
  it('FE-MOB-MNEARBYLAUNCH-001: the phone control is a capsule that labels what it opens', () => {
    render(<MNearbyLauncher tripId={7} />);
    const button = screen.getByTestId('mnearby-launcher');

    expect(button).toHaveAccessibleName("What's Nearby");
    expect(button).toHaveTextContent("What's Nearby");
    // A dialog, not a toggle: the sheet covers the map while it is up.
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    expect(button).not.toHaveAttribute('aria-pressed');
  });

  it('FE-MOB-MNEARBYLAUNCH-002: tapping it opens the sheet on the trip and the fallback centre', () => {
    const fallback = () => ({ lat: 48.1, lng: 11.6 });
    render(<MNearbyLauncher tripId={7} getFallbackCenter={fallback} />);
    expect(screen.queryByTestId('mnearby-sheet')).toBeNull();

    fireEvent.click(screen.getByTestId('mnearby-launcher'));
    expect(screen.getByTestId('mnearby-sheet')).toBeInTheDocument();
    expect(sheet.props).toMatchObject({ open: true, tripId: 7, getFallbackCenter: fallback });
  });
});
