import { LazyPanel } from './LazyPanel'

/**
 * The scroll area a panel tab lives in.
 *
 * Every scrolling trip tab (packing, costs, carbon, files) repeated the same
 * wrapper — the height, the overscroll containment and the bottom padding the
 * phone shell's nav bar needs — around its lazily loaded panel. The fourth copy
 * pushed the page past its line budget, and `lint:size` wants the repeated concern
 * moved out rather than one more copy kept in.
 *
 * `fixed` is the files tab: it fills its height and scrolls its own panes, so the
 * outer area must not scroll as well.
 */
export function TabPage({
  id,
  fixed,
  children,
}: Readonly<{ id: string; fixed?: boolean; children: React.ReactNode }>): React.ReactElement {
  return (
    <div
      style={{
        height: '100%',
        overflow: fixed ? 'hidden' : undefined,
        overflowY: fixed ? undefined : 'auto',
        overscrollBehavior: 'contain',
        width: '100%',
        paddingBottom: 'var(--bottom-nav-h)',
      }}
    >
      <LazyPanel id={id}>{children}</LazyPanel>
    </div>
  )
}
