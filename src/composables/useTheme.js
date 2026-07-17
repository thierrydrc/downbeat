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
  // La couleur de la barre de statut mobile (theme-color) doit suivre le
  // thème actif, sinon elle reste figée sur la couleur sombre par défaut
  // définie dans index.html même une fois passé en thème clair.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[value])
}

// État au niveau du module : un seul thème pour toute l'app, peu importe le
// nombre de composants qui appellent useTheme().
const theme = ref(loadTheme())
applyTheme(theme.value)

watch(theme, (value) => {
  applyTheme(value)
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Stockage indisponible (navigation privée...) : le thème reste actif
    // pour la session en cours, simplement pas persisté.
  }
})

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}

export function useTheme() {
  return { theme, toggleTheme }
}
