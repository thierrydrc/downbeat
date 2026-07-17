import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  // Inline JS/CSS directement dans index.html : en file://, les navigateurs
  // bloquent (CORS) le chargement des <script type="module"> et <link
  // stylesheet> externes. Un seul fichier sans requête réseau contourne le
  // problème.
  //
  // vite-plugin-pwa cohabite avec viteSingleFile : il génère manifest.webmanifest,
  // le service worker (sw.js) et les icônes comme fichiers séparés dans dist/,
  // ce que viteSingleFile n'inline pas (il n'inline que le JS/CSS de l'app elle-
  // même). En file://, ces fichiers annexes sont simplement ignorés/inaccessibles
  // (pas d'installation PWA possible sans contexte sécurisé http/https), mais
  // n'empêchent pas index.html de fonctionner en autonome. Sur GitHub Pages
  // (https), ils permettent l'installation en PWA. Voir le README, section
  // "Installer l'app".
  plugins: [
    vue(),
    tailwindcss(),
    viteSingleFile(),
    VitePWA({
      registerType: 'autoUpdate',
      // On enregistre le service worker nous-mêmes via le composable
      // `virtual:pwa-register/vue` (voir useServiceWorkerUpdate.js) plutôt
      // que via le script auto-injecté, pour pouvoir afficher un toast
      // "nouvelle version disponible" côté app.
      injectRegister: false,
      includeAssets: [
        'favicon.ico',
        'icons/apple-touch-icon.png',
        'icons/favicon-48.png',
        'icons/favicon-32.png',
        'icons/favicon-16.png',
      ],
      manifest: {
        id: '.',
        name: 'Downbeat',
        short_name: 'Downbeat',
        description: 'Métronome web pour groupe, utilisable hors ligne.',
        lang: 'fr',
        theme_color: '#0b0c0e',
        background_color: '#0b0c0e',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/maskable-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // index.html contient tout le JS/CSS inliné par viteSingleFile : le
        // précacher suffit à couvrir l'app entière pour l'usage hors ligne.
        // Les icônes et manifest.webmanifest sont déjà précachés séparément
        // par vite-plugin-pwa lui-même (via `manifest.icons`/`includeAssets`
        // ci-dessus) : ne pas les remettre ici, sous peine de doublons.
        globPatterns: ['index.html'],
        // vite-plugin-pwa calcule sa valeur par défaut à partir de
        // `build.assetsDir`, que viteSingleFile vide - ça produit une regex
        // `/^/` qui matche tout et annule (revision: null) la révision de
        // CHAQUE fichier précaché, y compris index.html. Résultat : le
        // service worker ne détecterait jamais qu'index.html a changé entre
        // deux builds, et ne se mettrait donc jamais à jour. On n'a pas de
        // dossier assets/ séparé (tout est inliné), donc cette regex n'a
        // besoin de matcher qu'un chemin qui n'existe pas.
        dontCacheBustURLsMatching: /^assets\//,
      },
    }),
  ],
  build: {
    cssCodeSplit: false,
  },
})
