import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  // Inline JS/CSS directement dans index.html : en file://, les navigateurs
  // bloquent (CORS) le chargement des <script type="module"> et <link
  // stylesheet> externes. Un seul fichier sans requête réseau contourne le
  // problème.
  plugins: [vue(), tailwindcss(), viteSingleFile()],
  build: {
    cssCodeSplit: false,
  },
})
