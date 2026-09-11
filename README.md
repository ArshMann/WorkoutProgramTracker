# PPL Logger

A dedicated, offline-only logger for the 52-week Push/Pull/Legs program. The
program document is the spec; the app encodes it exactly and adds nothing.

The core loop: **open → Start → ✓ on each set → Finish.** No typing, no
menus, no dialogs on that path. Everything else is one tap away from Home.

- Expo (managed) · React Native · TypeScript · expo-router
- Local only. No backend, no account, no network calls.
- `expo-sqlite` via Drizzle for sessions/sets/metrics; MMKV for app state
  (falls back to a SQLite key-value table inside Expo Go, where MMKV's native
  module is unavailable).
- Zustand for state, `react-native-gifted-charts` for the two charts.
- Backup = one JSON dump of the whole database to the share sheet; restore
  from Settings or the onboarding screen.

## Run it on a physical Android phone from Fedora

Nothing below needs macOS or Windows.

```bash
sudo dnf install nodejs git            # Node 20+ (22 used here)
git clone <this repo> && cd WorkoutProgramTracker
npm install --legacy-peer-deps         # the only flag needed; a dev-only peer conflict in @expo/devtools
npm test                               # 105 unit tests: seed integrity + every program rule
npm run typecheck
```

### Option A — Expo Go (fastest; phone and laptop on the same Wi-Fi)

1. Install **Expo Go** from the Play Store.
2. `npx expo start` — scan the QR code with Expo Go. If the LAN is blocked,
   `npx expo start --tunnel`.

Expo Go caveats: MMKV is not in Expo Go, so app state lives in the SQLite
`kv` table (Settings → About shows which backend is active). Local
notifications for the rest timer work in Expo Go on Android; the in-app
haptic fires regardless.

### Option B — Development build with EAS (cloud; no Android SDK on the laptop)

```bash
npm install -g eas-cli && eas login
eas build --profile development --platform android   # produces an APK
```
Install the APK on the phone, then `npx expo start --dev-client`. This uses
real MMKV and has no Expo Go limitations.

### Option C — Local development build (Android SDK on Fedora)

Install Android Studio (or just the command-line tools + platform 35 + build
tools), set `ANDROID_HOME`, enable USB debugging, then:

```bash
npx expo run:android          # builds and installs a dev build over USB
```

iOS: `eas build --profile development --platform ios` from the same Linux
host (EAS builds it in the cloud); Expo Go on iOS works for Option A.

## Layout

```
app/                          expo-router screens
  _layout.tsx                 stack, theme, DB migrations, notification channel
  index.tsx                   Home — NEXT card, Start, sessions this week, variants, stalls
  onboarding.tsx              the single onboarding screen: program start date (+ restore)
  session.tsx                 Active session — cards, one-tap ✓, rest bar, calibration prompt
  substitute.tsx              Part 3 substitutes for a slot (modal) + joint fallback
  exercise/[id].tsx           Exercise history, e1RM chart with block markers, stall step, increment
  exercises.tsx               Exercise list for the current block
  metrics.tsx                 Bodyweight (7-day avg), calorie instruction, waist, checks, conditioning
  photos.tsx                  Front/side/back photos, side-by-side comparison
  reference.tsx               Read-only block tables, progression rule, missed-day matrix
  review.tsx                  Part 10.3 block review, prefilled with the block's numbers
  settings.tsx                Theme, rest durations, start date, export/import, reset
src/
  program/                    the document as data (version-tagged)
    types.ts                  Exercise / Prescription / Block types
    exercises.ts              catalogue: name, pattern, equipment, role, ordered Part 3 substitutes
    blocks.ts                 all six blocks written out in full (4/5/6 expanded, sources noted)
    core.ts                   Part 7 core/APT stages 1–4
    fullbody.ts               Part 5.6 FB-A / FB-B
    reference.ts              rule text rendered on the Program screen
    decisions.ts              every ambiguity in the document, as a named constant (see DECISIONS.md)
    program.test.ts           seed integrity + spot checks against the document
  engine/                     pure functions, no UI, all unit-tested
    week.ts                   program week from start date, deloads, on-ramp, block restart
    queue.ts                  PUSH → PULL → LEGS, one session per day
    progression.ts            Part 1.4 double progression → prefilled sets
    increments.ts / rir.ts    increments by equipment and per-exercise override; RIR chips
    stall.ts                  Part 11 trigger, step-per-week, multi-stall
    layoff.ts                 Part 5 matrix → load factor / RIR override / block restart
    variants.ts               minimum session, deload transforms
    supersets.ts              A1 B1 A2 B2 interleave
    substitution.ts           Part 3 substitute lists per slot, joint-fallback rule
    types.ts                  Appearance / PlannedSession types shared with the stores
    session-builder.ts        composes all of the above into a planned session; substitutions
    calibration.ts            RIR calibration cadence + Part 8.1 calorie rules
    attendance.ts             sessions per week (a count, never a streak), 4-week average
    e1rm.ts / rest.ts / dates.ts
  db/                         schema.ts (Drizzle) · migrations.ts (hand-written DDL) · repo.ts (queries)
  storage/kv.ts               MMKV with SQLite fallback; Zustand storage adapter
  store/                      app.ts (persisted app state) · session.ts (active session, timer) · context.ts
  services/                   notifications, haptics, export/import, photos
  ui/                         theme + components (Stepper, RirChips, SetRow, ExerciseCard, RestBar, …)
```

## Phases

The three deliverable phases from the brief map onto the tree above:

1. **The loop** — `program/` (all six blocks), `engine/{week,queue,supersets,rest,session-builder}`,
   `db/`, `store/`, `app/{index,onboarding,session}.tsx`, rest timer (`RestBar`, `services/notifications`).
2. **The engine** — `engine/{progression,increments,stall,layoff,variants,substitution}`,
   `app/substitute.tsx`, the variant buttons on Home, stall cards, layoff banner.
3. **Tracking** — `engine/{calibration,attendance,e1rm}`, `app/{metrics,photos,exercise/[id],exercises,review,reference,settings}.tsx`,
   `services/{export,photos}`.

All three are in this tree; `npm test` verifies the rules directly.

## How the rules are wired

- **Prefill = suggestion.** `engine/progression.prefill()` takes an exercise's
  history and returns the sets to show. The number on the row is the
  suggestion; there is nothing to confirm. Load increases only when every
  prescribed set hit the top of its range at (or above) the target RIR; dumbbells
  and coarse isolation increments need top + 2.
- **Substitutes log as themselves.** A substituted slot is planned from the
  substitute's own history and its sets are stored under the substitute's id
  (with `substituted_from` recorded for reference).
- **Deload / minimum / full-body sessions** are stored with their `kind`; the
  progression and stall engines skip them as evidence.
- **Layoffs** are classified at Start from days since the last finished session.
  A 2–3 week gap stores a "return loop" (−10 %, RIR 2–3) that lasts three queue
  sessions and only reduces loads that were logged before the return. A 4+
  week gap moves the program-start anchor so the current block restarts at its
  week 1.
- **Sessions this week** is a count over the program's own week; it never
  turns red, resets with emphasis, or warns.

## Scripts

`npm test` · `npm run test:watch` · `npm run typecheck` · `npm start`
