# Downbeat

Métronome web pour groupe : start/stop, mesures 4/4 et 3/4, tap tempo, volume, presets
(tempo + mesure) sauvegardés localement (réordonnables, exportables/importables en JSON), et
thème clair/sombre.

Fonctionne **hors ligne**, en `file://` (dossier `dist/`) ou installé comme PWA.

## Stack

Vue 3 + Vite (`vite-plugin-singlefile` pour le `file://`, `vite-plugin-pwa` pour
l'installation/l'offline), Tailwind CSS v4, icônes [MDI](https://materialdesignicons.com/)
via `@mdi/js`.

## Développement

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Génère `dist/` (versionné dans le repo, pas de rebuild nécessaire pour le récupérer tel quel).

## Icônes

```bash
npm run icons
```

Régénère `public/icons/*.png` depuis le logo source
(`scripts/icon-sources/source-icon.svg`) via [sharp](https://sharp.pixelplumbing.com/). Pour
changer de logo, éditez ce SVG (ou remplacez-le) puis relancez la commande.

## Utiliser l'app hors ligne

Ouvrez `dist/index.html` directement dans un navigateur (double-clic, ou glisser-déposer) :
tout le JS/CSS est inliné (`vite-plugin-singlefile`), aucun serveur requis. Si ça échoue sur
un appareil particulier : `npx serve dist`.

Le manifest PWA, le service worker et les icônes restent des fichiers séparés dans `dist/`
(non inlinés) : sans effet en `file://`, ils permettent l'installation en PWA une fois servis
en HTTPS (GitHub Pages).

## Installer l'app

Depuis <https://thierrydrc.github.io/DownBeat/> :

- **Chrome / Android** : bannière d'installation, ou menu **⋮** → **Installer l'application**.
- **Safari / iOS** : **Partager** → **Sur l'écran d'accueil**.

## Volume et « Boost scène »

Le slider de volume va de 0 à 100 %. La case **Boost scène** (sous le slider) amplifie le
signal au-delà de 100 % avec un limiteur anti-saturation, pour une sortie casque/ligne vers
une console. Résultat réel dépendant du plafond matériel de l'appareil — à tester en
conditions réelles. Pensez aussi à monter le volume système de l'appareil au maximum.

Tant que le métronome joue, l'app empêche l'écran de se verrouiller (Wake Lock API) et
relance automatiquement l'audio s'il a été suspendu (mise en veille, appel...) au retour au
premier plan — utile en concert, où l'écran n'est pas retouché pendant plusieurs minutes.

## Presets

Ajout via modale (nom, tempo, mesure), clic pour charger (reclic pour désélectionner),
glisser-déposer pour réordonner, export/import JSON (`⋮`). Un preset chargé masque les
contrôles tempo/mesure au profit d'un rappel + bouton **Modifier** ; **Enregistrer** met à
jour le preset. Sans preset chargé, **Enregistrer le preset** en crée un nouveau à partir du
tempo/mesure courants.

Sauvegarde automatique dans le `localStorage` du navigateur (locale à l'appareil, ne se
synchronise pas entre appareils).
