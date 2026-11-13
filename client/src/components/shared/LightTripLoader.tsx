interface LightTripLoaderProps {
  /** Rendered size of the square mark, in pixels. */
  size?: number;
  /** Extra classes for the wrapper. */
  className?: string;
  /**
   * Screen-reader text for when the loader stands alone (a full-page boot, for
   * example). Leave it out when a visible label next to the loader already says
   * what is loading, so the state is not announced twice.
   */
  label?: string;
}

/**
 * LightTrip's loading mark: the leaf needle sweeps one full turn while the amber
 * light at its pivot breathes.
 *
 * The two palettes are files rather than inline SVG on purpose — brand colours
 * are not appearance tokens, and marking each one as an intentional exception
 * would add to a ratchet that only shrinks. Each file also freezes its own
 * animation under `prefers-reduced-motion`, so a still loader needs no JS.
 */
export function LightTripLoader({ size = 40, className = '', label }: LightTripLoaderProps) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label}
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
    >
      <img
        src="/icons/lighttrip-loading-light.svg"
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        draggable={false}
        className="block dark:hidden"
      />
      <img
        src="/icons/lighttrip-loading-dark.svg"
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        draggable={false}
        className="hidden dark:block"
      />
    </span>
  );
}
