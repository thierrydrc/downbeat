import { useRegisterSW } from 'virtual:pwa-register/vue'

// Composable minimal autour de vite-plugin-pwa : expose needRefresh (une
// nouvelle version du service worker a fini de s'installer en arrière-plan
// et attend qu'on recharge la page pour l'activer) pour pouvoir prévenir
// l'utilisateur plutôt que de le laisser tourner sur une version périmée
// sans le savoir.
export function useServiceWorkerUpdate() {
  const { needRefresh, updateServiceWorker } = useRegisterSW()

  function reload() {
    updateServiceWorker(true)
  }

  function dismiss() {
    needRefresh.value = false
  }

  return { needRefresh, reload, dismiss }
}
