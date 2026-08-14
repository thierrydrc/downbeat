import { ref, watch } from 'vue'
import { messages, SUPPORTED_LANGS, DEFAULT_LANG, LANGUAGES } from '../i18n/index.js'

const STORAGE_KEY = 'downbeat.lang.v1'

// Premier lancement : on suit la langue du navigateur (match par préfixe,
// « pt-BR » → « pt ») ; langue inconnue → français.
function detectLang() {
  const candidates =
    navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]
  for (const candidate of candidates) {
    if (!candidate) continue
    const code = candidate.toLowerCase().split('-')[0]
    if (SUPPORTED_LANGS.includes(code)) return code
  }
  return DEFAULT_LANG
}

function loadLang() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (SUPPORTED_LANGS.includes(stored)) return stored
  } catch {
    // Storage indisponible : on retombe sur la détection.
  }
  return detectLang()
}

function applyLang(value) {
  // index.html livre lang="fr" (langue par défaut) ; le runtime le garde en
  // phase avec la langue active pour les lecteurs d'écran et la césure.
  document.documentElement.lang = value
}

// État au niveau module : une seule langue pour toute l'app, quel que soit le
// nombre de composants qui appellent useI18n().
const lang = ref(loadLang())
applyLang(lang.value)

// La valeur détectée n'est jamais persistée (le watch ne se déclenche que sur
// un changement explicite) : tant que l'utilisateur n'a pas choisi, la langue
// continue de suivre celle du navigateur à chaque lancement.
watch(lang, (value) => {
  applyLang(value)
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Storage indisponible (navigation privée...) : la langue reste active
    // pour la session, juste pas persistée.
  }
})

function setLang(value) {
  if (SUPPORTED_LANGS.includes(value)) lang.value = value
}

// Lit lang.value à chaque appel : réactif dans les templates (re-rendu au
// changement de langue) et toujours à jour dans les handlers JS (confirm...).
// Fallback : langue courante → français → la clé elle-même.
function t(key, params) {
  const table = messages[lang.value] ?? messages[DEFAULT_LANG]
  let str = table[key] ?? messages[DEFAULT_LANG][key] ?? key
  if (params) {
    str = str.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match))
  }
  return str
}

export function useI18n() {
  return { lang, setLang, t, languages: LANGUAGES }
}
