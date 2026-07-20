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

Régénère `public/icons/*.png` et `public/favicon.ico` depuis le logo source
(`scripts/icon-sources/source-icon.png`, idéalement carré et en haute résolution) via
[sharp](https://sharp.pixelplumbing.com/) et [png-to-ico](https://www.npmjs.com/package/png-to-ico).
Pour changer de logo, remplacez ce PNG puis relancez la commande.

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
- **iPhone / iPad** : uniquement via **Safari** (contrainte Apple : tous les navigateurs iOS,
  y compris Chrome, utilisent le moteur de Safari mais seul Safari a accès à l'installation
  de PWA). Ouvrir le lien dans Safari, puis **Partager** → **Sur l'écran d'accueil**.

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
tempo/mesure courants. Les flèches ‹ › autour du preset chargé passent au précédent/suivant
de la liste sans rouvrir le tiroir.

Sauvegarde automatique dans le `localStorage` du navigateur (locale à l'appareil, ne se
synchronise pas entre appareils).

## Raccourcis clavier

Espace : start/stop. Flèches haut/droite : +1 BPM. Flèches bas/gauche : -1 BPM. Échap : ferme
le tiroir des presets. Inactifs pendant la saisie dans un champ texte.

## Mises à jour (PWA)

Le service worker installe les mises à jour en arrière-plan ; un bandeau "Nouvelle version
disponible" apparaît quand une nouvelle version est prête, avec un bouton pour recharger et
l'activer immédiatement.

## Licence

[MIT](LICENSE)
