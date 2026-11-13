# Carbon Footprint

A trip's travel has a cost beyond money. TREK estimates the **CO₂e** of the transport you planned, breaks it down by mode and by day, and shows what the same legs would emit by another means of transport.

## Where to find it

Open the **Carbon** tab inside the trip planner, between **Costs** and **Files**. It is always there — there is no addon to enable and nothing to configure.

The tab holds four parts:

- **Estimated total** — the whole trip's CO₂e, and how many of its legs could be measured (`3 / 4`).
- **Where it comes from** — one bar per transport mode, longest first.
- **By day** — each day's share, in the order the planner shows the days.
- **Travel legs** and **Compare transport modes** — every leg TREK found, and below it the comparison for the leg you select. Selecting a leg is the only interaction the tab has.

## What it measures

TREK finds two kinds of leg in a trip:

1. **Day-plan legs** — the route between two consecutive stops of a day that both have a location. The mode is the one the day plan draws: the leg's own override, then the day's default mode, then a drive.
2. **Booked transport** — a flight, train, bus, ferry, cruise or cable car booking, measured from its stations. A booking with a stopover counts both hops.

A leg's distance is the **great-circle distance** between the two points. That is exact for nothing and close for a flight; a road or rail line is longer than the straight line, so those modes are slightly understated. Nothing is sent to a routing service to measure it.

## How it compares modes

Select any leg with a measured distance and a known mode, and the table under it ranks all twelve modes for that same distance:

**Walk**, **Cycle**, **Train**, **Bus**, **Coach**, **Car (petrol or diesel)**, **Electric car**, **Taxi**, **Motorbike**, **Ferry**, **Cruise ship**, **Flight**.

Each row shows its CO₂e and, against the mode you planned, how much the choice saves (or costs). The **Lowest** badge names the lowest option that burns fuel — a walk is always lowest and is not a plan for a 600 km leg. The table is computed in the browser from the same figures the server uses, so switching the selected leg is instant and asks nothing of the server.

Train against plane is the comparison the feature is for: on the same distance a flight is several times a train's emissions, which is what the radiative-forcing multiplier on aviation fuel accounts for.

## The figures

Everything is an **estimate**, and the tab says so under the total. Emission factors are rounded averages in the range published for passenger transport by DEFRA/DESNZ (UK greenhouse-gas conversion factors) and the EEA, in grams of CO₂e per passenger-kilometre:

| Mode | g CO₂e / km |
|---|---|
| Walk, Cycle | 0 |
| Train | 35 |
| Bus | 103 |
| Coach | 27 |
| Car (petrol or diesel) | 170 |
| Electric car (average grid) | 47 |
| Taxi | 210 |
| Motorbike | 114 |
| Ferry | 19 |
| Cruise ship | 250 |
| Flight, under 600 km | 246 |
| Flight, 600–3700 km | 151 |
| Flight, 3700 km and over | 148 |

A few consequences worth knowing:

- An empty coach and a full one differ by more than the gap between two rows of that table. TREK does not know the load factor, the fuel, or the route an aircraft actually flew.
- A leg between two stops in the same place is measured, at zero. A leg whose mode TREK cannot price — a plugin profile, `transport_other` — is shown as **Not estimated** and left out of the total rather than counted as zero.
- A booking with fewer than two stations cannot be measured. It still appears, so the `measured / total` count shows what is missing.
- Distances and factors are deliberately not stored. The tab is derived from the itinerary on every open, so an edit to a day, a mode or a booking is reflected by the next open, and there is no figure to go stale.

## Using it from an API

Two read-only routes, both behind the session cookie:

- `GET /api/trips/:tripId/carbon` — the whole footprint: `total_grams`, `total_km`, `estimated_legs`, `unestimated_legs`, the legs, the per-mode rows and the per-day rows. A trip the caller cannot reach answers `404 Trip not found`, like every other trip-scoped route.
- `GET /api/carbon/compare?distance_km=600&baseline=car` — the same table the panel shows, ranked cheapest first, with each option's saving against `baseline`.

Figures on the wire are whole **grams**; the panel converts to kilograms for display.

## Privacy

The estimate runs entirely inside your TREK instance. No routing service, no weather, no third party is asked anything, and no coordinates leave the server.
