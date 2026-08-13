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

## Volume

The volume slider goes from 0 to 100% of the device's native output — no digital boost beyond
that. For the loudest possible click, turn the device's system volume all the way up too.

## Screen lock and background playback

The click keeps playing with the screen locked or the app in the background. Two mechanisms
make that possible on iOS: the audio session is declared as `playback`
([Audio Session API](https://developer.mozilla.org/en-US/docs/Web/API/AudioSession), the only
mechanism that exempts Web Audio from iOS's background restrictions — reliable since iOS 17.5),
and the click itself is a full measure pre-rendered into a buffer and looped natively on the
audio thread, so no throttled main-thread timer is involved. This also registers the metronome
as active media playback: play/pause controls on the lock screen/notifications
([Media Session](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API)), and the
ringer/silent switch doesn't mute it. On browsers without the Audio Session API (Chrome,
Android...), a silent looping track provides the same media-playback treatment instead.

As long as the app is open, it also keeps the screen from locking (Wake Lock API) — best
effort: iOS refuses it in Low Power Mode (which forces a 30 s auto-lock), in which case the
app shows a small warning while playing; the sound itself doesn't depend on the screen staying
on. While the metronome is running, audio automatically resumes after an interruption (phone
call, notification...) when coming back to the foreground.

Known limitation: iOS 26.0/26.0.1 has OS-level audio bugs specific to installed web apps
(improved from 26.1 on, never acknowledged by Apple) that no web app can work around — if the
sound still dies with the screen locked, update iOS.

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
