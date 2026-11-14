import type { CSSProperties } from 'react';

/**
 * The Safari-style compass on the map's "What's Nearby" capsule.
 *
 * A hand-vendored mark rather than lucide's `Compass`: this control is the map's
 * own "look around here" door, and the dial with a solid needle is the shape a
 * traveller already reads as one, where lucide's single-stroke circle is one more
 * generic action beside the layer and overview pills. Monochrome on
 * currentColor, never Safari's coloured logo, so it sits beside those icons
 * without shouting — the capsule's visible label carries the words.
 *
 * Same shape as the other hand-vendored marks in the client (`GoogleMapsIcon`):
 * 24×24 box, aria-hidden because the button is already labelled.
 */
export default function SafariCompassIcon({
  size = 17,
  className,
  style,
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" strokeWidth="1.8" />
      {/* The dial's inner ring, thin and faded so the needle stays the mark. */}
      <circle cx="12" cy="12" r="6.1" strokeWidth="1.1" opacity="0.45" />
      {/* The needle: a solid diamond, north-east to south-west. */}
      <path d="M16.9 7.1 13 12 7.1 16.9 11 12 Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
