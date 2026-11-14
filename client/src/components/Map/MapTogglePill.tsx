import type { ReactNode } from 'react'
import { Tooltip } from '../shared/Tooltip'
import { MAP_CONTROL_SHADOW } from './mapControlShadow'

/**
 * One on/off control in the frosted shell every map control wears, so a new one
 * lines up with the compass, the layer switcher and the overview toggle.
 *
 * Given `text` it stops being round and becomes a capsule naming what it opens:
 * icon first, that label after it. A visible label needs no tooltip, so the tip
 * that explains a wordless control is skipped.
 */
export function MapTogglePill({ active, onToggle, label, icon, text, testId, tooltipPlacement = 'left', badge = 0, opensDialog = false }: {
  active: boolean
  onToggle: () => void
  label: string
  icon: ReactNode
  /**
   * Shown beside the icon, which turns the round control into a capsule. The
   * accessible name stays `label`; this is the same words made visible.
   */
  text?: string
  testId?: string
  /** Away from the edge the control hugs: left on the right edge, right on the left one. */
  tooltipPlacement?: 'left' | 'right'
  /** A count pinned to the top right corner while above zero (how many filters are on, say). */
  badge?: number
  /**
   * The control opens a dialog instead of switching something on and off (the phone
   * map's places filter): it then announces the dialog, not a pressed state it
   * does not have. `active` still lights it.
   */
  opensDialog?: boolean
}) {
  const button = (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={opensDialog ? undefined : active}
      aria-haspopup={opensDialog ? 'dialog' : undefined}
      data-testid={testId}
      className={active ? 'text-accent' : 'text-content-muted'}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 34, height: 34, borderRadius: 999, border: 'none', cursor: 'pointer',
        background: 'transparent', padding: 0,
        // A capsule stretches around the icon and the words it shows; the round
        // control keeps the 34px square the map's other pills stand on.
        ...(text ? { width: 'auto', height: 34, gap: 8, paddingInline: '10px 14px' } : null),
        transition: 'background 0.14s, color 0.14s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      {icon}
      {text && (
        <span style={{
          fontSize: 'calc(12px * var(--fs-scale-caption, 1))',
          fontWeight: 600, lineHeight: 1, whiteSpace: 'nowrap',
        }}>{text}</span>
      )}
    </button>
  )

  return (
    <div style={{
      position: 'relative',
      display: 'inline-flex', alignItems: 'center', padding: 4, borderRadius: 999, pointerEvents: 'auto',
      background: 'var(--sidebar-bg)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      boxShadow: MAP_CONTROL_SHADOW,
    }}>
      {/* TREK's own tooltip, not the browser's: the native one ignores the colour
          scheme, waits a second and a half, and cannot be read on a touch device.
          A capsule skips it: its label is already on screen. */}
      {text ? button : <Tooltip label={label} placement={tooltipPlacement}>{button}</Tooltip>}
      {badge > 0 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-[3px] -top-[3px] box-border flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 font-geist text-[0.5625rem] font-bold tabular-nums text-accent-text"
        >
          {badge}
        </span>
      )}
    </div>
  )
}
