# PPL Logger on an iPhone 17 Pro, from a Fedora PC

Xcode only runs on macOS, so an iPhone is never plugged into the Fedora box.
Everything reaches the phone one of two ways: over Wi-Fi from a dev server
running on the PC (Expo Go), or through Expo's cloud build service (EAS),
which does the Apple signing and produces an installable app.

## Pick a path

| | A · Expo Go | B · Development build | C · TestFlight |
|---|---|---|---|
| What you get | The app inside the Expo Go client | Its own icon; still loads JS from the PC while developing | Its own icon; runs with no PC at all |
| Apple Developer Program ($99/yr) | No | **Yes** (device installs need ad-hoc signing) | **Yes** + an App Store Connect record |
| Time to first run | ~15 min | ~1–2 h, plus Apple enrollment (can take a day or two) | Same as B, plus a review-free TestFlight upload |
| PC must be running `expo start` | Every time you open the app | While developing; not for a finished build with bundled JS | Never |
| App state store | SQLite `kv` table (MMKV is not in Expo Go) | MMKV | MMKV |
| Good for | Trying it today, iterating on the UI | Day-to-day development | Actually training with it |

Start with A today. Move to C once you want it on the phone for the gym.

Everything below assumes the source is on the PC: either `git clone` of the
repo once the branch is pushed, or the `ppl-logger-src.tar.gz` archive.

## 1 · Fedora prerequisites

```bash
sudo dnf install nodejs npm git        # Node 20 or newer (22 was used to build this)
node --version
cd WorkoutProgramTracker
npm install --legacy-peer-deps         # the only flag needed; a dev-only peer conflict in @expo/devtools
npm test                               # 105 tests: seed integrity + every program rule
npm run typecheck
```

`--legacy-peer-deps` is required every time you `npm install` in this
project; add it to `~/.npmrc` as `legacy-peer-deps=true` if you would
rather not type it.

## 2 · iPhone prerequisites

- iOS 26 (what the 17 Pro ships with). Expo SDK 57 targets it.
- Install **Expo Go** from the App Store (path A), or the **TestFlight** app
  (path C). Path B needs neither.
- Phone and PC on the same Wi-Fi for A and B. A VPN on either side usually
  breaks the LAN connection — turn it off while developing.

## 3 · Path A — Expo Go

```bash
npx expo start
```

Point the iPhone's Camera app at the QR code in the terminal; it offers to
open in Expo Go. The first load takes a minute while Metro bundles.

**Firewall.** Metro listens on TCP 8081. Fedora Workstation's default
firewall zone (`FedoraWorkstation`) already allows ports 1025–65535, so
this normally just works. Check with:

```bash
firewall-cmd --get-default-zone
# if it says "public" rather than "FedoraWorkstation":
sudo firewall-cmd --add-port=8081/tcp --permanent && sudo firewall-cmd --reload
```

If the phone still cannot reach the PC (hotel/campus Wi-Fi with client
isolation, for example), use a tunnel; it is slower but needs no LAN:

```bash
npx expo start --tunnel      # installs @expo/ngrok on first use
```

Reload after editing code: shake the phone → **Reload**, or press `r` in
the terminal. `npx expo start -c` clears Metro's cache if something looks
stale.

Expo Go specifics: the app detects that MMKV is unavailable and keeps app
state in the SQLite `kv` table instead (Settings → About shows
`state store: sqlite`). Data survives reloads. The rest-timer notification
is a local notification and, as far as I can tell, still fires in Expo Go
on iOS — I have not been able to verify this on a device; the in-app haptic
fires either way while the app is open.

## 4 · Paths B and C — building with EAS

### 4.1 Accounts

1. **Apple Developer Program** — enroll at developer.apple.com with your
   Apple ID ($99/year). Approval is usually hours to a couple of days.
   Without it, nothing built on Linux can be installed on an iPhone; the
   free-Apple-ID route requires Xcode on a Mac.
2. **Expo account** — free, at expo.dev. The free plan includes a monthly
   build quota that a handful of iOS builds fits inside; I am not sure of
   the current exact number, check expo.dev/pricing.

### 4.2 Link the project

```bash
npm install -g eas-cli
eas login
eas init                       # creates the project on expo.dev and writes extra.eas.projectId into app.json
```

The bundle identifier is `com.arshmann.ppllogger` in `app.json`. If Apple
reports it as taken, change it to something unique before the first build;
it cannot be changed after the app exists in App Store Connect.

`app.json` already sets `ITSAppUsesNonExemptEncryption: false`, which
answers Apple's export-compliance question up front (the app makes no
network calls and uses no encryption).

### 4.3 Path B — development build on your phone

```bash
eas device:create              # registers the iPhone: open the link it prints on the phone in Safari,
                               # install the profile it offers; this records the UDID with Apple
eas build --profile development --platform ios
```

On the first build EAS asks to sign in with your Apple ID and then creates
the distribution certificate and an ad-hoc provisioning profile for you.
The build runs in the cloud (roughly 10–20 minutes). When it finishes, open
the build page (QR code or link) in Safari on the iPhone and tap
**Install**. iOS asks you to trust the developer profile the first time:
Settings → General → VPN & Device Management.

Then, on the PC:

```bash
npx expo start --dev-client
```

Open the installed **PPL Logger** app; it shows a screen to connect to a
dev server — scan the terminal's QR code from inside the app, or type the
`exp+ppllogger://` URL it prints. From here JS edits reload live; only
adding or upgrading a native module needs a new `eas build`.

### 4.4 Path C — TestFlight

```bash
eas build --profile production --platform ios
eas submit --platform ios      # creates the App Store Connect record if needed and uploads the build
```

`eas submit` needs either an App Store Connect API key (it walks you
through creating one) or an Apple ID login. The first upload creates the
app in App Store Connect; give it a unique name when asked. A few minutes
after processing, the build appears in the **TestFlight** app on the
iPhone under your own account — tap **Install**. No review is needed for
your own device.

TestFlight builds expire after 90 days; rebuild and resubmit before then.
Every code change is a new build with this path (there is no over-the-air
update configured — `expo-updates` is deliberately not part of the app so
it stays fully offline).

## 5 · First launch

1. The only onboarding screen asks for the **program start date**. Week 1
   starts on that day; the queue does not care what weekday it is.
2. Home shows `NEXT · PUSH`, `Week 1 · Block 1 · Hypertrophy 1`, **Start**.
3. Tap **Start**. iOS asks for notification permission — allow it; that is
   what lets the rest timer buzz with the phone locked in a pocket.
4. The first appearance of every lift prefills the empty bar (45 lb) or 0;
   set your week-1 load with the ± steppers (tap the number itself for a
   keypad). Week 1 is the on-ramp, so RIR prefills at 4.
5. Tap **✓**. The set is logged and the bottom bar starts the rest timer
   (3:00 for a main lift in a hypertrophy block). Lock the phone; at zero
   it vibrates and posts a notification.
6. Tap **Finish**. Home now reads **Logged today** and `NEXT · PULL`.

Camera and photo-library permission are only requested the first time you
add a progress photo from Body → Progress photos.

## 6 · iPhone settings worth doing once

- **Notifications → PPL Logger**: allow, with sound. Add the app to any
  Focus mode you use at the gym, or the rest-timer alert is silenced.
- The screen stays awake during a session (the app asks iOS for that);
  outside a session normal auto-lock applies.
- **Low Power Mode** may delay local notifications slightly; I am not
  certain how iOS 26 treats a timed notification under it.

## 7 · Backups between the iPhone and Fedora

Settings → **Export to share sheet** produces one JSON file with the whole
database. From the share sheet, **Save to Files** (iCloud Drive or On My
iPhone) or send it through whatever you already use (mail, Signal,
Nextcloud, Syncthing). AirDrop does not reach Fedora; iCloud Drive is not
easily mounted on Linux either, so a synced folder or an attachment is the
practical route.

Restore with Settings → **Import a backup…** (or "Restore from a backup"
on the onboarding screen); the Files picker opens and the import replaces
everything on the phone after one confirmation. Progress-photo image files
are not inside the JSON; they stay in the app's own storage on the device.

## 8 · Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Expo Go: "Could not connect to the server" | Different Wi-Fi networks, a VPN, or a firewall zone without 8081 open. Confirm the PC's LAN address matches the `exp://` URL, or use `--tunnel`. |
| Expo Go: "project is incompatible with this version of Expo Go" | Expo Go only runs the current SDK. Update Expo Go from the App Store; the project is on SDK 57. |
| Red error screen mentioning `NitroModules` or MMKV in Expo Go | Should not happen — the app catches the missing native module and falls back to SQLite. If it does, `npx expo start -c` and reload; if it persists it is a bug, tell me. |
| `eas build` fails at credentials | Apple enrollment not yet approved, or two-factor prompt missed. Re-run; EAS resumes. |
| "Bundle identifier is not available" | Change `ios.bundleIdentifier` in `app.json` and rebuild. |
| No rest-timer notification with the phone locked | Notification permission denied at first Start: Settings → Notifications → PPL Logger. |
| Stale UI after editing code (path A/B) | Shake → Reload, or `npx expo start -c`. |
| `npm install` errors about peer dependencies | Missing `--legacy-peer-deps`. |

## 9 · Updating later

- **Path A**: pull the new code, `npm install --legacy-peer-deps`, `npx expo start`. Nothing on the phone changes.
- **Path B**: same, unless `package.json` gained a native module — then `eas build --profile development --platform ios` again.
- **Path C**: `eas build --profile production --platform ios && eas submit --platform ios`, then install from TestFlight.

The data lives in the app's SQLite database on the phone and survives all
of these; export a backup first anyway.
