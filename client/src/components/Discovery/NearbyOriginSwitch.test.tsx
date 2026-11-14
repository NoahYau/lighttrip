import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NearbyOriginSwitch from './NearbyOriginSwitch';

const t = (key: string) => key;

describe('NearbyOriginSwitch', () => {
  it('FE-COMP-NEARBYORIGIN-001: offers the device and the map area as two named options', () => {
    render(<NearbyOriginSwitch variant="desktop" origin="device" onSelect={vi.fn()} t={t} />);

    expect(screen.getByRole('button', { name: 'discovery.originDevice' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'discovery.originArea' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'discovery.title' })).toBeInTheDocument();
  });

  it('FE-COMP-NEARBYORIGIN-002: marks only the active option pressed', () => {
    render(<NearbyOriginSwitch variant="desktop" origin="map" onSelect={vi.fn()} t={t} />);

    expect(screen.getByRole('button', { name: 'discovery.originArea' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'discovery.originDevice' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('FE-COMP-NEARBYORIGIN-003: picking an option reports its mode', () => {
    const onSelect = vi.fn();
    render(<NearbyOriginSwitch variant="mobile" origin="device" onSelect={onSelect} t={t} />);

    fireEvent.click(screen.getByRole('button', { name: 'discovery.originArea' }));
    expect(onSelect).toHaveBeenCalledWith('map');

    fireEvent.click(screen.getByRole('button', { name: 'discovery.originDevice' }));
    expect(onSelect).toHaveBeenLastCalledWith('device');
  });
});
