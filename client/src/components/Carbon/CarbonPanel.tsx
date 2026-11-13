import { useTranslation } from '../../i18n/TranslationContext';
import { MODE_LABELS, kilograms, kilometres, routeLabel, savingPercent, shareOf } from './carbonModel';
import { useCarbon } from './useCarbon';

/**
 * The trip's carbon footprint: the estimate, where it comes from, and what the
 * same legs would cost by another means of transport.
 *
 * A read-only tab, so it holds no form and writes nothing: the numbers follow the
 * itinerary, and the only interaction is choosing which leg to compare.
 */
export default function CarbonPanel({ tripId }: { tripId: number }) {
  const { t, locale } = useTranslation();
  const { status, footprint, selectedLeg, options, best, selectLeg, retry } = useCarbon(tripId);

  if (status === 'loading') {
    return (
      <Shell title={t('carbon.title')}>
        <p className="text-body text-content-muted">{t('carbon.loading')}</p>
      </Shell>
    );
  }
  if (status === 'offline') {
    return (
      <Shell title={t('carbon.title')}>
        <p className="text-body text-content-secondary">{t('carbon.offline')}</p>
      </Shell>
    );
  }
  if (status === 'error' || !footprint) {
    return (
      <Shell title={t('carbon.title')}>
        <p className="text-body text-content-secondary">{t('carbon.error')}</p>
        <button
          type="button"
          onClick={retry}
          className="mt-3 self-start rounded-lg bg-accent px-3 py-1.5 text-body text-accent-on hover:bg-accent-hover"
        >
          {t('carbon.retry')}
        </button>
      </Shell>
    );
  }
  if (footprint.legs.length === 0) {
    return (
      <Shell title={t('carbon.title')}>
        <p className="text-body text-content-secondary">{t('carbon.empty')}</p>
      </Shell>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-subtitle font-semibold text-content">{t('carbon.title')}</h2>
        <p className="text-body text-content-secondary">{t('carbon.subtitle')}</p>
      </header>

      <section
        aria-label={t('carbon.total')}
        className="flex flex-wrap items-end gap-x-8 gap-y-3 rounded-2xl border border-edge-faint bg-surface-secondary p-4"
      >
        <div>
          <div className="text-caption uppercase tracking-wide text-content-muted">{t('carbon.total')}</div>
          <div className="text-title font-semibold tabular-nums text-content">
            {t('carbon.totalValue', { value: kilograms(footprint.total_grams, locale) })}
          </div>
        </div>
        <div>
          <div className="text-caption uppercase tracking-wide text-content-muted">{t('carbon.measuredLegs')}</div>
          <div className="text-subtitle font-semibold tabular-nums text-content">
            {t('carbon.measuredValue', { estimated: footprint.estimated_legs, total: footprint.legs.length })}
          </div>
        </div>
        <p className="ms-auto max-w-xs text-caption text-content-faint">{t('carbon.disclaimer')}</p>
      </section>

      <section aria-label={t('carbon.byMode')} className="flex flex-col gap-2">
        <h3 className="text-caption uppercase tracking-wide text-content-muted">{t('carbon.byMode')}</h3>
        {footprint.by_mode.map((row) => (
          <div key={row.mode} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-body text-content">{t(MODE_LABELS[row.mode].labelKey)}</span>
              <span className="text-caption tabular-nums text-content-secondary">
                {t('carbon.totalValue', { value: kilograms(row.grams, locale) })}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-tertiary">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.round(shareOf(row.grams, footprint.total_grams) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </section>

      <section aria-label={t('carbon.perDay')} className="flex flex-col gap-1">
        <h3 className="text-caption uppercase tracking-wide text-content-muted">{t('carbon.perDay')}</h3>
        <ul className="flex flex-col divide-y divide-edge-faint rounded-2xl border border-edge-faint bg-surface-secondary">
          {footprint.days.map((row) => (
            <li key={row.day_id} className="flex items-baseline justify-between gap-3 px-4 py-2">
              <span className="min-w-0 truncate text-body text-content">
                {row.title || (row.date ? String(row.date) : `#${row.day_number ?? row.day_id}`)}
              </span>
              <span className="shrink-0 text-caption tabular-nums text-content-secondary">
                {t('carbon.totalValue', { value: kilograms(row.grams, locale) })}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label={t('carbon.legs')} className="flex flex-col gap-2">
        <h3 className="text-caption uppercase tracking-wide text-content-muted">{t('carbon.legs')}</h3>
        <ul className="flex flex-col gap-1">
          {footprint.legs.map((leg) => {
            const active = leg.id === selectedLeg?.id;
            return (
              <li key={leg.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => selectLeg(leg.id)}
                  className={`flex w-full items-baseline justify-between gap-3 rounded-xl border px-4 py-2 text-start ${
                    active
                      ? 'border-accent bg-accent-subtle'
                      : 'border-edge-faint bg-surface-secondary hover:bg-surface-hover'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-body text-content">{routeLabel(leg)}</span>
                    <span className="block text-caption text-content-muted">
                      {leg.mode ? t(MODE_LABELS[leg.mode].labelKey) : t('carbon.unknownMode')} ·{' '}
                      {t('carbon.km', { value: kilometres(leg.distance_km, locale) })}
                    </span>
                  </span>
                  <span className="shrink-0 text-caption tabular-nums text-content-secondary">
                    {leg.grams == null ? '—' : t('carbon.totalValue', { value: kilograms(leg.grams, locale) })}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label={t('carbon.compareTitle')} className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-caption uppercase tracking-wide text-content-muted">{t('carbon.compareTitle')}</h3>
          {selectedLeg && (
            <span className="text-caption text-content-secondary">
              {t('carbon.compareFor', { route: routeLabel(selectedLeg) })}
            </span>
          )}
        </div>
        {options.length === 0 ? (
          <p className="text-body text-content-muted">{t('carbon.comparePick')}</p>
        ) : (
          <table className="w-full border-collapse overflow-hidden rounded-2xl border border-edge-faint bg-surface-secondary">
            <thead>
              <tr className="text-caption uppercase tracking-wide text-content-muted">
                <th className="px-4 py-2 text-start font-normal">{t('carbon.compareMode')}</th>
                <th className="px-4 py-2 text-end font-normal">{t('carbon.compareEmissions')}</th>
                <th className="px-4 py-2 text-end font-normal">{t('carbon.compareSaved')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-faint">
              {options.map((option) => {
                const current = option.mode === selectedLeg?.mode;
                const percent = savingPercent(option);
                return (
                  <tr key={option.mode} className={current ? 'bg-accent-subtle' : undefined}>
                    <td className="px-4 py-2 text-body text-content">
                      {t(MODE_LABELS[option.mode].labelKey)}
                      {best?.mode === option.mode && (
                        <span className="ms-2 rounded-full bg-success-soft px-2 py-0.5 text-caption text-success">
                          {t('carbon.compareBest')}
                        </span>
                      )}
                      {current && (
                        <span className="ms-2 rounded-full bg-surface-tertiary px-2 py-0.5 text-caption text-content-secondary">
                          {t('carbon.compareCurrent')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-end text-caption tabular-nums text-content-secondary">
                      {t('carbon.totalValue', { value: kilograms(option.grams, locale) })}
                    </td>
                    <td className="px-4 py-2 text-end text-caption tabular-nums text-content-muted">
                      {percent == null ? '—' : current ? '—' : `${percent > 0 ? '−' : '+'}${Math.abs(percent)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

/** The panel's frame while there is nothing to lay out: the loading, offline and error faces. */
function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 p-4">
      <h2 className="text-subtitle font-semibold text-content">{title}</h2>
      {children}
    </div>
  );
}
