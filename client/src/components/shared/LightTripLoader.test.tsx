// FE-LTL-001 to FE-LTL-003
import { describe, expect, it } from 'vitest';
import { render, screen } from '../../../tests/helpers/render';

import { LightTripLoader } from './LightTripLoader';

describe('LightTripLoader', () => {
  it('FE-LTL-001: renders both theme variants at the requested size, hidden from assistive tech', () => {
    const { container } = render(<LightTripLoader size={28} />);

    const light = container.querySelector('img[src="/icons/lighttrip-loading-light.svg"]');
    const dark = container.querySelector('img[src="/icons/lighttrip-loading-dark.svg"]');

    expect(light).toHaveAttribute('width', '28');
    expect(light).toHaveAttribute('height', '28');
    expect(light).toHaveAttribute('aria-hidden', 'true');
    expect(dark).toHaveAttribute('width', '28');
    expect(dark).toHaveAttribute('aria-hidden', 'true');
    // Only one variant is shown per theme.
    expect(light).toHaveClass('dark:hidden');
    expect(dark).toHaveClass('hidden', 'dark:block');
  });

  it('FE-LTL-002: is silent when it sits beside a visible label', () => {
    render(<LightTripLoader />);

    expect(screen.queryByRole('status')).toBeNull();
  });

  it('FE-LTL-003: announces a status region when it stands alone', () => {
    render(<LightTripLoader label="Loading your trip" />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading your trip');
  });
});
