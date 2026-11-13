# Discover Nearby

TREK can point you to places worth a short walk from where you are — either on demand, when you press a button, or by itself, following you as you move. Both are part of the **Discovery** addon, and both answer the same question: what is around here that is worth a look?

## Enabling it

Discovery is an addon and is **off by default**. An admin enables it for the whole instance from [Admin-Addons](Admin-Addons). Until it is on, the **Nearby** button and the **Roaming** switch do not appear anywhere in the app.

## Nearby — look around on demand

**Nearby** is the manual side. From the trip planner, press **Look around** and TREK scans once around your current position, then lists what it found, nearest first, under a row of category chips:

- **Nature**, **Culture**, **Food**, **Shopping**, **Other**.

Each result shows its distance and the walk time, and offers **Add to today** to drop it onto the day you are on. A scan only reads — nothing is added or changed until you act.

Nearby needs a connection and your location. The first time you use it, the app asks for location permission; if it cannot read a position, it says so and offers **Try again**.

## Roaming — suggestions while you walk

**Roaming** is the automatic side. Turn on the **Roaming** switch and TREK follows you as you walk, suggesting nearby places as it goes. Roaming is **off by default** and you switch it off the same way.

Roaming is deliberately quiet. It only offers a suggestion when the moment is right:

- Your position must be accurate enough (within 80 m).
- You must be moving at walking pace — above about 5 m/s it goes quiet, so driving and cycling produce nothing.
- Quiet hours (22:00–07:00) pause it.
- A place you have already seen is not offered again for 24 hours.
- After one suggestion of a kind, that kind rests for 30 minutes.
- At most 8 suggestions appear in a day.

When a suggestion is due, a small card slides in at the bottom of the screen. It shows the place's name, its distance and walk time, a one-line **Why now**, and two actions: **Add to today** and **Not now**. If you ignore it, the card closes by itself after about 8 seconds.

## Privacy

Discovery is built around a small amount of location data, and **off by default**:

- Your location is read only while **Nearby** or **Roaming** is active.
- TREK never sends or stores your exact coordinates. It sends only a **150 m grid cell** — the square you are in, never your position inside it.
- That cell is **deleted after 24 hours**.
- Your location is not shared with the other members of your trip.
