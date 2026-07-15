# Downbeat

Métronome web pour groupe — start/stop, mesures 4/4 et 3/4, tap tempo, réglage du volume,
et liste de chansons avec tempo/mesure sauvegardés.

Conçu pour fonctionner **hors ligne**, directement depuis le dossier `dist/`, sur téléphone,
tablette ou ordinateur.

## Stack

- Vue 3 (Composition API)
- Vite
- Tailwind CSS

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

Ça génère le dossier `dist/`, qui contient l'application complète et autonome.

## Utiliser l'app hors ligne

<!-- À compléter après test : garde la méthode qui fonctionne vraiment -->

- **Option A — double-clic direct :** ouvre `dist/index.html` dans un navigateur.
- **Option B — si l'option A ne fonctionne pas** (écran blanc, erreurs CORS liées aux modules) :
  sers le dossier `dist/` avec un petit serveur local, par exemple :

```bash
  npx serve dist
```

ou via PhpStorm : clic droit sur `dist/index.html` → **Open in Browser**.

## Sauvegarde des chansons

La liste de chansons est sauvegardée