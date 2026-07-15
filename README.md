# Downbeat

Métronome web pour groupe — cercle central start/stop, mesures 4/4 et 3/4, tap tempo,
réglage du volume, et liste de chansons (tempo + mesure) sauvegardée, réordonnable par
glisser-déposer, exportable/importable en JSON.

Conçu pour fonctionner **hors ligne**, directement depuis le dossier `dist/`, sur téléphone,
tablette ou ordinateur.

## Stack

- Vue 3 (Composition API)
- Vite
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Icônes [Material Design Icons](https://materialdesignicons.com/) via `@mdi/js` (SVG
  inline, pas de police ni de CDN — compatible hors ligne)

## Développement

Installer les dépendances :

```bash
npm install
```

Lancer le serveur de développement :

```bash
npm run dev
```

## Build de production

```bash
npm run build
```

Ça génère le dossier `dist/`, qui contient l'application complète et autonome. Le dossier
`dist/` est versionné dans le repo (il n'est pas ignoré par git) : c'est voulu, pour pouvoir
récupérer l'app déjà buildée sans avoir à relancer `npm install`/`npm run build`.

## Utiliser l'app hors ligne

- **Ouverture directe du fichier (`file://`) : ne fonctionne pas.** Le build Vite charge le
  JavaScript via des modules ES (`<script type="module">`) et une feuille de style séparée.
  Les navigateurs bloquent ces requêtes en `file://` avec une erreur CORS (« Cross origin
  requests are only supported for protocol schemes: http, https... »), ce qui donne un
  écran blanc.
- **Méthode qui fonctionne : servir `dist/` avec un petit serveur local.** Par exemple :

  ```bash
  npx serve dist
  ```

  puis ouvrir l'URL affichée (`http://localhost:3000` par défaut) dans le navigateur.
  Alternative en IDE (PhpStorm, WebStorm...) : clic droit sur `dist/index.html` → **Open in
  Browser**.

  Pour un usage sur téléphone/tablette sans connexion, lancez ce serveur sur un PC/mini-PC
  présent sur place et connectez l'appareil au même réseau local (Wi-Fi sans accès internet
  suffit), ou utilisez un serveur HTTP statique portable installé directement sur l'appareil.

## Fonctionnalités

- **Métronome** : scheduler Web Audio "lookahead" indépendant du rendu Vue (`useMetronome.js`),
  mesures 4/4 ou 3/4, tempo 30–240 BPM (slider, boutons +/-, tap tempo), volume, cercle
  central qui démarre/arrête le métronome et flashe à chaque temps (couleur distincte pour
  le premier temps).
- **Chansons** : sidebar toujours visible sur tablette/PC, repliable en tiroir sur mobile.
  Ajout via une modale dédiée, chargement d'une chanson en un clic (reclic pour la
  désélectionner), suppression avec confirmation, réordonnancement par glisser-déposer
  (tactile et souris), export/import JSON via une modale (import avec choix
  remplacer/fusionner).
- **Design** : thème sombre, gros contrôles tactiles, focus clavier visible sur tous les
  contrôles, respecte `prefers-reduced-motion`.

## Sauvegarde des chansons

La liste de chansons est sauvegardée automatiquement dans le `localStorage` du navigateur
(clé `downbeat.songs.v1`, gérée par `useSongs.js`) à chaque ajout, suppression ou
réordonnancement — rien à faire manuellement. Cette sauvegarde est locale à l'appareil et au
navigateur utilisés : elle ne se synchronise pas automatiquement entre plusieurs appareils.

Pour transférer la liste vers un autre appareil, ou en garder une copie de secours, utilisez
le bouton `⋮` à côté de "Ajouter une chanson" :

- **Exporter la liste en JSON** télécharge un fichier `downbeat-songs.json` avec
  l'intégralité de la liste actuelle.
- **Importer une liste JSON** relit un fichier JSON exporté précédemment ; une confirmation
  demande de choisir entre **remplacer** entièrement la liste actuelle ou la **fusionner**
  avec le fichier importé.
