# Downbeat

Web metronome for bands: start/stop, 4/4 and 3/4 time signatures, tap tempo, volume, presets
(tempo + time signature) saved locally (reorderable, exportable/importable as JSON), and
light/dark theme.

Works **offline**, over `file://` (the `dist/` folder) or installed as a PWA.

## Stack

Vue 3 + Vite (`vite-plugin-singlefile` for `file://` support, `vite-plugin-pwa` for
install/offline support), Tailwind CSS v4, [MDI](https://materialdesignicons.com/) icons via
`@mdi/js`.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Generates `dist/` (checked into the repo, no rebuild needed to fetch it as-is).

## Icons

```bash
npm run icons
```

Regenerates `public/icons/*.png` and `public/favicon.ico` from the source logo
(`scripts/icon-sources/source-icon.png`, ideally square and high-resolution) using
[sharp](https://sharp.pixelplumbing.com/) and [png-to-ico](https://www.npmjs.com/package/png-to-ico).
To change the logo, replace this PNG and rerun the command.

## Using the app offline

Open `dist/index.html` directly in a browser (double-click, or drag-and-drop): all JS/CSS is
inlined (`vite-plugin-singlefile`), no server required. If that fails on a particular device:
`npx serve dist`.

The PWA manifest, service worker and icons remain separate files in `dist/` (not inlined): no
effect over `file://`, but they enable PWA installation once served over HTTPS (GitHub Pages).

## Installing the app

From <https://thierrydrc.github.io/DownBeat/>:

- **Chrome / Android**: install banner, or **⋮** menu → **Install app**.
- **iPhone / iPad**: only via **Safari** (Apple constraint: every iOS browser, including
  Chrome, runs on Safari's engine, but only Safari has access to PWA installation). Open the
  link in Safari, then **Share** → **Add to Home Screen**.

## Volume and "Line Input Boost"

The volume slider goes from 0 to 100%. The **Line Input Boost** checkbox (below the slider)
amplifies the signal beyond 100% with an anti-clipping limiter, for a headphone/line output
into a mixing console. Actual result depends on the device's hardware output ceiling — test
under real conditions. Also turn the device's system volume all the way up.

While the metronome is running, the app keeps the screen from locking (Wake Lock API) and
automatically resumes audio if it was suspended (device sleep, phone call...) when coming back
to the foreground — useful on stage, where the screen isn't touched for several minutes at a
time.

The app also plays a silent looping track alongside the click and registers a
[Media Session](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API), so the OS
treats it as active media playback: play/pause controls on the lock screen/notifications, and
on iOS, sound isn't muted by the ringer/silent switch the way plain Web Audio output normally
would be. Note: on iOS, a plain web app (even installed to the home screen) may still stop
audio when the screen is manually locked — this is a Safari platform limitation that no web
API can fully work around; only a native wrapper (e.g. Capacitor) with background audio
capabilities can guarantee it.

## Presets

Add via modal (name, tempo, time signature), click to load (click again to deselect),
drag-and-drop to reorder, JSON export/import (`⋮`). A loaded preset hides the tempo/time
signature controls in favor of a summary + **Edit** button; **Save** updates the preset.
With no preset loaded, **Save preset** creates a new one from the current tempo/time
signature. The ‹ › arrows around the loaded preset jump to the previous/next one in the list
without reopening the drawer.

Automatically saved to the browser's `localStorage` (local to the device, does not sync across
devices).

## Keyboard shortcuts

Space: start/stop. Up/Right arrows: +1 BPM. Down/Left arrows: -1 BPM. Escape: closes the preset
drawer. Inactive while typing in a text field.

## Updates (PWA)

The service worker installs and activates updates automatically in the background, no action
required — visible the next time the app is opened.

## License

[MIT](LICENSE)
