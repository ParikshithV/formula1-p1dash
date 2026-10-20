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
| Imagery | `media.formula1.com` CDN | Car profiles, driver portraits and circuit maps are downloaded at build time by `scripts/render-assets/f1.mjs` (see below), then bundled. Update `SEASON` and the slug maps there each season. |

Formula 1 imagery and marks belong to Formula One Licensing B.V. This is a non-commercial fan project and isn't affiliated with Formula 1.

## Features

- **Home** – next race poster with live countdown, last race podium, followed driver and team, championship top three, paddock news.
- **Schedule** – full season timeline with winners for completed rounds; race weekend pages with track map, sessions, countdown and race / sprint / qualifying results.
- **Standings** – drivers and constructors; tap a driver for their profile.
- **Driver profiles** – season numbers (points, wins, podiums, best finish, gap to leader) and a round-by-round results timeline.
- **Onboarding & preferences** – first-run setup (follow a driver and team, clock format, reminders, haptics), reopened any time from *Menu → Settings*.
- **Session reminders** – local notifications before every session, 15 / 30 / 60 minutes ahead (iOS & Android).
- **News** – formula1.com RSS feed (iOS & Android; the site blocks browser requests).

## Artwork, data & credits

Artwork is built from **official formula1.com imagery** by `scripts/render-assets/f1.mjs`, written as transparent PNGs to `assets/f1`:

- **Drivers** – the official portrait, head and shoulders, as a single-ink riso-style print in the team colour: lightness becomes ink density with local contrast and print grain; light areas are left transparent ("paper").
- **Cars** – each team's official side profile, unedited.
- **Circuits** – neon line drawings traced from the official detailed track map: one closed centreline glowing in the official sector colours, with direction chevrons and a start / finish line (taken from the S3 → S1 boundary).

> ⚠️ These images belong to Formula One and the teams. They're fine for a personal build, but App Store / Play Store review is likely to reject them (guidelines 5.2.1 / IP policy). For a store build, fall back to the original 3D renders below.

Original **3D renders of procedural models** (`scripts/render-assets/scene.js` → `assets/renders`) cover anything F1 has no image for: circuits outside the current calendar, team helmets, and the news cover's chequered flag. Circuit geometry comes from [bacinger/f1-circuits](https://github.com/bacinger/f1-circuits) (MIT).

To regenerate (e.g. a new driver or season):

```sh
cd scripts/render-assets && npm install
npm run f1                               # F1 imagery -> assets/f1, src/lib/f1art.generated.ts
node ../build-tracks.mjs && npm run render   # 3D fallbacks -> assets/renders, src/lib/renders.generated.ts
```

The tooling has its own `package.json` and isn't part of the app bundle. Downloads are cached in `scripts/render-assets/.cache`.

Results and schedules come from [Jolpica F1](https://github.com/jolpica/jolpica-f1), licensed CC BY-NC-SA 4.0 (non-commercial – contact Jolpica before monetising). News headlines link out to formula1.com.

P1 Dash is an unofficial fan app and is not affiliated with Formula 1, the FIA or any team. "Formula 1", "F1" and related marks belong to Formula One Licensing B.V.

## Roadmap

Next ideas, roughly ordered by value/effort:

1. **Home-screen & lock-screen widgets / Live Activity** – next-session countdown and followed-driver card (`expo-widgets` / `@bacons/apple-targets`).
2. **Add to calendar** – export a weekend's sessions with `expo-calendar`.
3. **Team profiles & teammate head-to-head** – qualifying and race battles per round.
4. **Points progression chart** – cumulative points per round for the top drivers/teams.
5. **Live timing during sessions** – [OpenF1](https://openf1.org) positions, intervals, tyre stints and race control messages.
6. **Season archive** – season picker backed by Jolpica's history (back to 1950); assets fall back gracefully for older seasons.
7. **Circuit info** – lap record, length, first GP, weather forecast for race day.
8. **Predictions mini-game** – pick the podium before lights out, score after the race.
9. **Offline cache** – persist React Query cache with `@tanstack/query-async-storage-persister` for instant cold starts.
