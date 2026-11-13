import { carbonLeg, tripCarbon } from '../../../tests/helpers/carbon'
import { fireEvent, render, screen, within } from '../../../tests/helpers/render'
import CarbonPanel from './CarbonPanel'
import { useCarbon } from './useCarbon'

import { describe, expect, it, vi } from 'vitest'

vi.mock('./useCarbon', () => ({ useCarbon: vi.fn() }))

const useCarbonMock = vi.mocked(useCarbon)

type State = ReturnType<typeof useCarbon>

function state(over: Partial<State> = {}): State {
  return {
    status: 'ready',
    footprint: tripCarbon(),
    selectedLeg: carbonLeg(),
    options: [],
    best: null,
    selectLeg: vi.fn(),
    retry: vi.fn(),
    ...over,
  }
}

describe('CarbonPanel', () => {
  it('shows the total, the measured legs and the disclaimer', () => {
    vi.mocked(useCarbonMock).mockReturnValue(state())
    render(<CarbonPanel tripId={7} />)

    expect(screen.getByRole('heading', { name: 'Carbon footprint' })).toBeInTheDocument()
    expect(screen.getByLabelText('Estimated total')).toHaveTextContent('21 kg CO₂e')
    expect(screen.getByLabelText('Estimated total')).toHaveTextContent('1 / 1')
    expect(screen.getByText(/not a carbon audit/i)).toBeInTheDocument()
  })

  it('breaks the footprint down by mode and by day', () => {
    vi.mocked(useCarbonMock).mockReturnValue(state())
    render(<CarbonPanel tripId={7} />)

    expect(within(screen.getByLabelText('Where it comes from')).getByText('Train')).toBeInTheDocument()
    expect(within(screen.getByLabelText('By day')).getByText('Arrival')).toBeInTheDocument()
  })

  it('lists the legs and asks to pick one for the comparison', () => {
    vi.mocked(useCarbonMock).mockReturnValue(state())
    render(<CarbonPanel tripId={7} />)

    const legs = screen.getByLabelText('Travel legs')
    expect(within(legs).getByText('Hotel → Museum')).toBeInTheDocument()
    expect(within(legs).getByText(/27\.3 km/)).toBeInTheDocument()
    expect(screen.getByText('Select a leg to see its alternatives.')).toBeInTheDocument()
  })

  it('selects a leg when its row is pressed', () => {
    const selectLeg = vi.fn()
    vi.mocked(useCarbonMock).mockReturnValue(state({ selectLeg }))
    render(<CarbonPanel tripId={7} />)

    const row = within(screen.getByLabelText('Travel legs')).getByRole('button', { name: /Hotel → Museum/ })
    expect(row).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(row)
    expect(selectLeg).toHaveBeenCalledWith('day-1-1-2')
  })

  it('shows what the same leg would cost by every other mode, lowest marked', () => {
    vi.mocked(useCarbonMock).mockReturnValue(
      state({
        options: [
          { mode: 'rail', grams: 21_000, grams_per_km: 35, saving_grams: 0, saving_share: 0 },
          { mode: 'flight', grams: 90_600, grams_per_km: 151, saving_grams: -69_600, saving_share: -3.31 },
        ],
        best: { mode: 'rail', grams: 21_000, grams_per_km: 35, saving_grams: 0, saving_share: 0 },
      }),
    )
    render(<CarbonPanel tripId={7} />)

    const table = screen.getByLabelText('Compare transport modes')
    expect(within(table).getByText('Lowest')).toBeInTheDocument()
    expect(within(table).getByText('Current')).toBeInTheDocument()
    expect(within(table).getByText('+331%')).toBeInTheDocument()
  })

  it('says nothing to measure when the trip holds no leg', () => {
    vi.mocked(useCarbonMock).mockReturnValue(state({ footprint: tripCarbon({ legs: [], total_grams: 0, by_mode: [], days: [] }) }))
    render(<CarbonPanel tripId={7} />)
    expect(screen.getByText(/Nothing to measure yet/)).toBeInTheDocument()
  })

  it('explains that the estimate needs a connection while offline', () => {
    vi.mocked(useCarbonMock).mockReturnValue(state({ status: 'offline', footprint: null }))
    render(<CarbonPanel tripId={7} />)
    expect(screen.getByText('The carbon estimate needs a connection.')).toBeInTheDocument()
  })

  it('offers a retry after a failure', () => {
    const retry = vi.fn()
    vi.mocked(useCarbonMock).mockReturnValue(state({ status: 'error', footprint: null, retry }))
    render(<CarbonPanel tripId={7} />)

    screen.getByRole('button', { name: 'Try again' }).click()
    expect(retry).toHaveBeenCalled()
  })
})
