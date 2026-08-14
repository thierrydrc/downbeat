import fr from './fr.js'
import en from './en.js'
import es from './es.js'
import de from './de.js'
import it from './it.js'
import pt from './pt.js'

export const DEFAULT_LANG = 'fr'
export const messages = { fr, en, es, de, it, pt }
export const SUPPORTED_LANGS = Object.keys(messages)

// Noms natifs affichés dans le sélecteur : ils ne se traduisent jamais
// (« Français » reste « Français » quelle que soit la langue active).
export const LANGUAGES = [
  { code: 'fr', name: 'Français' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
]
