# Downbeat

Métronome web pour groupe — cercle central start/stop, mesures 4/4 et 3/4, tap tempo,
réglage du volume, et liste de presets (tempo + mesure) sauvegardée, réordonnable par
glisser-déposer, exportable/importable en JSON.

Conçu pour fonctionner **hors ligne**, directement depuis le dossier `dist/`, sur téléphone,
tablette ou ordinateur.

## Stack

- Vue 3 (Composition API)
- Vite (build en un seul fichier `dist/index.html` via `vite-plugin-singlefile`, pour
  fonctionner sans serveur en `file://`)
- `vite-plugin-pwa` : manifest + service worker (précache offline, installation sur
  téléphone/tablette) — voir [Installer l'app](#installer-lapp)
- Icônes de l'app générées en PNG depuis un SVG source via `sharp` (`npm run icons`) — voir
  [Régénérer les icônes](#régénérer-les-icônes)
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

Double-cliquez sur `dist/index.html` (ou glissez-le dans un navigateur) : l'app se lance
directement en `file://`, sans serveur ni connexion internet.

Par défaut, un build Vite charge le JavaScript via un `<script type="module">` et une
feuille de style externes — les navigateurs bloquent ce genre de requête en `file://`
(erreur CORS, écran blanc). Pour l'éviter, `vite.config.js` utilise le plugin
`vite-plugin-singlefile`, qui inline tout le JS et le CSS directement dans `index.html` :
il n'y a donc plus aucune requête réseau au chargement, et le fichier fonctionne partout,
y compris ouvert directement depuis l'explorateur de fichiers du téléphone/tablette/PC.

Si malgré tout l'ouverture directe échoue sur un navigateur ou un appareil particulier,
servez `dist/` avec un petit serveur local en repli :

```bash
npx serve dist
```

puis ouvrez l'URL affichée (`http://localhost:3000` par défaut). Alternative en IDE
(PhpStorm, WebStorm...) : clic droit sur `dist/index.html` → **Open in Browser**.

**Cas particulier développement sous WSL → test sur Windows :** si vous copiez le dossier
`dist/` depuis WSL (`\\wsl.localhost\...`) vers un dossier Windows natif (ex. Téléchargements),
Windows peut marquer les fichiers copiés comme provenant d'un « autre ordinateur » (Mark of
the Web), et Firefox refuse alors de les ouvrir (« L'accès au fichier a été refusé »). Dans ce
cas : clic droit sur `index.html` → **Propriétés** → onglet **Général** → cochez
**Débloquer** → **OK**, puis rouvrez le fichier.

**Cohabitation `vite-plugin-singlefile` / `vite-plugin-pwa` :** le manifest PWA
(`manifest.webmanifest`), le service worker (`sw.js`, `workbox-*.js`) et les icônes sont
générés comme fichiers séparés dans `dist/` — `vite-plugin-singlefile` ne les inline pas, il
n'inline que le JS/CSS de l'app elle-même dans `index.html`. En `file://`, ces fichiers
annexes ne sont pas accessibles (pas de contexte sécurisé, donc pas d'installation PWA
possible), mais ça n'empêche pas `index.html` de fonctionner en autonome puisqu'il contient
déjà tout le nécessaire. Sur GitHub Pages (HTTPS), ces mêmes fichiers permettent
l'installation en PWA — voir ci-dessous.

## Installer l'app

En plus de l'usage `file://` hors ligne, Downbeat est installable comme application (PWA)
depuis GitHub Pages : <https://thierrydrc.github.io/DownBeat/>.

- **Chrome / Android** : ouvrez le lien ci-dessus, puis utilisez la bannière d'installation
  proposée par Chrome, ou le menu **⋮** → **Installer l'application**.
- **Safari / iOS** : ouvrez le lien ci-dessus, puis **Partager** (icône carrée avec flèche)
  → **Sur l'écran d'accueil**.

Une fois installée, l'app se lance en plein écran (sans barre d'adresse) et fonctionne hors
ligne après une première visite en ligne, grâce au service worker qui précache l'app.

### Régénérer les icônes

Les icônes (`public/icons/*.png`) sont générées depuis les SVG source dans
`scripts/icon-sources/` via [sharp](https://sharp.pixelplumbing.com/). Si vous modifiez le
logo, éditez les SVG source puis régénérez :

```bash
npm run icons
```

## Volume pour un usage scène (console de mixage)

Le clic du métronome peut être amplifié numériquement au-delà du niveau « normal » (jusqu'à
400 % via le slider de volume), avec un limiteur qui évite toute saturation audible. C'est
pensé pour brancher la sortie casque/ligne d'un téléphone ou d'une tablette vers l'entrée
d'une console de mixage : même gain d'entrée poussé au maximum sur la console, le niveau
système par défaut d'un téléphone reste souvent trop faible.

Pour un niveau maximal en conditions de scène, **cumulez** :

1. le volume interne de l'app (slider, jusqu'à 400 %),
2. **et** le volume système de l'appareil (téléphone/tablette) mis au maximum.

Les deux se multiplient : l'un sans l'autre ne suffit généralement pas.

## Fonctionnalités

- **Métronome** : scheduler Web Audio "lookahead" indépendant du rendu Vue (`useMetronome.js`),
  mesures 4/4 ou 3/4, tempo 30–240 BPM (slider, boutons +/-, tap tempo), volume amplifiable
  jusqu'à 400 % avec limiteur anti-saturation (voir [Volume pour un usage
  scène](#volume-pour-un-usage-scène-console-de-mixage)), cercle central qui démarre/arrête
  le métronome et flashe à chaque temps (couleur distincte pour le premier temps).
- **Presets** : sidebar toujours visible sur tablette/PC, repliable en tiroir sur mobile.
  Ajout via une modale dédiée (nom + tempo + mesure), chargement d'un preset en un clic
  (reclic pour le désélectionner), suppression avec confirmation, réordonnancement par
  glisser-déposer (tactile et souris), export/import JSON via une modale (import avec choix
  remplacer/fusionner).
- **Chargement/édition d'un preset** : quand un preset est chargé, les contrôles de tempo et
  de mesure sont masqués au profit d'un simple rappel (`120 BPM · 4/4`) et d'un bouton
  **Modifier**. Cliquer sur **Modifier** rouvre les contrôles ; le bouton **Enregistrer** qui
  apparaît alors met à jour le preset avec les nouvelles valeurs. Quand aucun preset n'est
  chargé, un bouton **Enregistrer le preset** ouvre une modale pour nommer et sauvegarder le
  tempo/la mesure en cours comme nouveau preset.
- **Design** : thème sombre, gros contrôles tactiles, focus clavier visible sur tous les
  contrôles, respecte `prefers-reduced-motion`.

## Sauvegarde des presets

La liste de presets est sauvegardée automatiquement dans le `localStorage` du navigateur
(clé `downbeat.songs.v1`, gérée par `usePresets.js` — nom historique conservé pour ne pas
perdre les presets déjà enregistrés) à chaque ajout, modification, suppression ou
réordonnancement — rien à faire manuellement. Cette sauvegarde est locale à l'appareil et au
navigateur utilisés : elle ne se synchronise pas automatiquement entre plusieurs appareils.

Pour transférer la liste vers un autre appareil, ou en garder une copie de secours, utilisez
le bouton `⋮` à côté de "Ajouter un preset" :

- **Exporter la liste en JSON** télécharge un fichier `downbeat-presets.json` avec
  l'intégralité de la liste actuelle.
- **Importer une liste JSON** relit un fichier JSON exporté précédemment ; une confirmation
  demande de choisir entre **remplacer** entièrement la liste actuelle ou la **fusionner**
  avec le fichier importé.
