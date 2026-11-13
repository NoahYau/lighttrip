import { useEffect, useMemo, useState } from 'react'
import type { CarbonOption, TripCarbonResponse } from '@trek/shared'
import { carbonRepo } from '../../repo/carbonRepo'
import { OnlineOnlyError } from '../../repo/onlineOnly'
import { bestOf, comparisonFor, mostEmittingLeg } from './carbonModel'

type CarbonStatus = 'loading' | 'ready' | 'offline' | 'error'

interface CarbonState {
  status: CarbonStatus
  footprint: TripCarbonResponse | null
}

/**
 * Loads the trip's footprint and keeps the leg the comparison is shown for.
 *
 * Online only, through the repo: the panel is not a trip entity, it is a reading
 * of one that the server derives, so there is nothing to keep in Dexie. The
 * comparison itself runs locally from `@trek/shared`, so switching the selected
 * leg costs no request.
 */
export function useCarbon(tripId: number) {
  const [state, setState] = useState<CarbonState>({ status: 'loading', footprint: null })
  const [selectedLegId, setSelectedLegId] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    carbonRepo.footprint(tripId, controller.signal).then(
      (footprint) => {
        if (controller.signal.aborted) return
        setState({ status: 'ready', footprint })
      },
      (error: unknown) => {
        if (controller.signal.aborted) return
        setState({ status: error instanceof OnlineOnlyError ? 'offline' : 'error', footprint: null })
      },
    )
    return () => controller.abort()
  }, [tripId, attempt])

  const legs = state.footprint?.legs ?? []
  // A selection the trip no longer has (a leg deleted elsewhere) falls back to the
  // leg worth looking at, never to a blank comparison.
  const selectedLeg = legs.find((leg) => leg.id === selectedLegId) ?? mostEmittingLeg(legs) ?? legs[0] ?? null
  const options: CarbonOption[] = useMemo(() => comparisonFor(selectedLeg), [selectedLeg])
  const best = useMemo(() => bestOf(options), [options])

  return {
    status: state.status,
    footprint: state.footprint,
    selectedLeg,
    options,
    best,
    selectLeg: setSelectedLegId,
    // The loading face belongs to the press, not to the effect: a state write at the
    // top of an effect is the warning this hook first tripped.
    retry: (): void => {
      setState({ status: 'loading', footprint: null })
      setAttempt((n) => n + 1)
    },
  }
}
