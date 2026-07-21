import { ref, watch } from 'vue'

const STORAGE_KEY = 'downbeat.theme.v1'

function loadTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

const THEME_COLORS = { dark: '#0b0c0e', light: '#f6f6f4' }

function applyTheme(value) {
  document.documentElement.dataset.theme = value
  // The mobile status bar color (theme-color) must follow the active theme,
  // otherwise it stays stuck on index.html's default dark value even after
  // switching to light.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[value])
}

// Module-level state: one theme for the whole app, regardless of how many
// components call useTheme().
const theme = ref(loadTheme())
applyTheme(theme.value)

watch(theme, (value) => {
  applyTheme(value)
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Storage unavailable (private browsing...): theme stays active for the
    // current session, just not persisted.
  }
})

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}

export function useTheme() {
  return { theme, toggleTheme }
}
