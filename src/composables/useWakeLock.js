import { onUnmounted, ref, watch } from 'vue'

const STORAGE_KEY = 'downbeat.keepawake.v1'

function loadKeepAwake() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'on'
  } catch {
    return false
  }
}

// Opt-in screen wake lock ("Garder l'écran allumé"). Playback no longer
// depends on the screen staying on (playback audio session + loop engine in
// useMetronome), so the lock is a pure user preference, persisted across
// launches.
export function useWakeLock() {
  const wakeLockSupported = 'wakeLock' in navigator
  const keepAwake = ref(wakeLockSupported && loadKeepAwake())
  // True only after a request actually failed - not while one is pending -
  // so the UI message doesn't flash during the acquisition window.
  const wakeLockDenied = ref(false)

  let sentinel = null
  let requestPending = false
  let lastRetry = 0

  // Best effort: iOS refuses the request in Low Power Mode (sometimes by
  // resolving it without any actual effect - undetectable).
  async function acquire() {
    if (!wakeLockSupported || !keepAwake.value || sentinel || requestPending) return
    if (document.visibilityState !== 'visible') return
    requestPending = true
    try {
      const acquired = await navigator.wakeLock.request('screen')
      sentinel = acquired
      wakeLockDenied.value = false
      acquired.addEventListener('release', () => {
        // Voluntary releases clear `sentinel` first - skip those.
        if (sentinel !== acquired) return
        sentinel = null
        // The OS dropped a lock we still want: retry while visible,
        // throttled so a systematic refusal doesn't loop.
        if (keepAwake.value && document.visibilityState === 'visible' && Date.now() - lastRetry > 3000) {
          lastRetry = Date.now()
          acquire()
        }
      })
    } catch {
      // Denied (Low Power Mode, hidden tab...): surfaced to the UI, the
      // metronome itself is unaffected.
      wakeLockDenied.value = true
    } finally {
      requestPending = false
    }
  }

  async function release() {
    const current = sentinel
    sentinel = null
    try {
      await current?.release()
    } catch {
      // nothing to do
    }
  }

  watch(keepAwake, (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, value ? 'on' : 'off')
    } catch {
      // Storage unavailable (private browsing...): the setting stays active
      // for the current session, just not persisted.
    }
    if (value) {
      // The switch click itself provides the user gesture WebKit requires
      // for the very first wake lock request.
      acquire()
    } else {
      wakeLockDenied.value = false
      release()
    }
  })

  function toggleKeepAwake() {
    keepAwake.value = !keepAwake.value
  }

  // WebKit only grants the very first wake lock request from a user gesture,
  // and the restored-from-storage attempt below runs outside one - so the
  // first tap/keypress anywhere retries it. 'click' rather than
  // 'pointerdown': on touch devices pointerdown fires before the transient
  // activation exists.
  function handleFirstGesture() {
    window.removeEventListener('click', handleFirstGesture, true)
    window.removeEventListener('keydown', handleFirstGesture, true)
    if (!sentinel) acquire()
  }

  // The browser auto-releases the lock when the tab backgrounds; re-acquire
  // on return to foreground.
  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') acquire()
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
  if (keepAwake.value) {
    window.addEventListener('click', handleFirstGesture, { once: true, capture: true })
    window.addEventListener('keydown', handleFirstGesture, { once: true, capture: true })
    acquire()
  }

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('click', handleFirstGesture, true)
    window.removeEventListener('keydown', handleFirstGesture, true)
    release()
  })

  return { keepAwake, toggleKeepAwake, wakeLockSupported, wakeLockDenied }
}
