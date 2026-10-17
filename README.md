# P1 Dash

An unofficial Formula 1 companion app: race-weekend countdowns, full-season schedule with results, championship standings and paddock news.

Built with Expo SDK 58 (React Native 0.88, React 19.3), Expo Router and TanStack Query.

## Getting started

```sh
nvm use          # Node 24 LTS (see .nvmrc)
npm install
npm start        # then press i / a, or scan with a development build
npm run typecheck
npm run doctor   # expo-doctor health checks
```

Native `ios/` and `android/` folders are generated on demand (`npx expo prebuild`) and are git-ignored.

## Project layout

```
app/                      Expo Router routes
  (tabs)/index.tsx        Home – next race hero, season progress, followed driver, last podium, news
  (tabs)/schedule.tsx     Upcoming / Completed / All rounds
  (tabs)/standings.tsx    Drivers & constructors championships
  (tabs)/news.tsx         formula1.com RSS feed
  race/[round].tsx        Weekend detail – track map, sessions, race/sprint/qualifying results
src/
  api/                    Jolpica + RSS clients and response types
  hooks/                  React Query hooks, favourite driver store, ticking clock
  lib/                    Asset URL builders, session/date helpers
  components/             UI building blocks
  theme/                  Colours, type scale, spacing
```

## Data sources

| Data | Source | Notes |
| --- | --- | --- |
| Calendar, sessions, results, standings | [Jolpica F1 API](https://github.com/jolpica/jolpica-f1) (`api.jolpi.ca/ergast/f1`) | Ergast-compatible. Replaces the old eCal ICS subscription, which only exposed a rolling window of *upcoming* events – the reason past races couldn't be shown. Rate limit is ~4 req/s burst, 500 req/h; React Query caching keeps us well under. |
| News | `https://www.formula1.com/en/latest/all.xml` | No images or dates in the feed; hero images come from each article's `og:image` and are cached for the session. formula1.com sends no CORS headers, so news only loads in the native apps, not on Expo web. |
| Imagery | `media.formula1.com` CDN | Track maps, driver headshots, car renders and team logos are derived from Jolpica ids in `src/lib/assets.ts`. Images are hotlinked, not bundled. Update `ASSET_SEASON` and the team/track maps each season. |

Formula 1 imagery and marks belong to Formula One Licensing B.V. This is a non-commercial fan project and isn't affiliated with Formula 1.

## Roadmap

Ideas to make the app more engaging, roughly ordered by value/effort:

1. **Session reminders** – local notifications (`expo-notifications`) 15 min before chosen sessions, with a per-weekend toggle on the race screen.
2. **Home-screen & lock-screen widgets / Live Activity** – next-session countdown and followed-driver card (`expo-widgets` / `@bacons/apple-targets`).
3. **Add to calendar** – export a weekend's sessions with `expo-calendar`.
4. **Driver & team profiles** – career stats, season results timeline and head-to-head teammate comparison (Jolpica `drivers/{id}/results`).
5. **Points progression chart** – cumulative points per round for the top drivers/teams.
6. **Live timing during sessions** – [OpenF1](https://openf1.org) positions, intervals, tyre stints and race control messages.
7. **Season archive** – season picker backed by Jolpica's history (back to 1950); assets fall back gracefully for older seasons.
8. **Circuit info** – lap record, length, first GP, weather forecast for race day.
9. **Predictions mini-game** – pick the podium before lights out, score after the race.
10. **Offline cache** – persist React Query cache with `@tanstack/query-async-storage-persister` for instant cold starts.
