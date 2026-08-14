// Table de référence : le jeu de clés de ce fichier fait foi pour toutes les
// autres locales (une clé manquante ailleurs retombe silencieusement sur le
// français). Les   sont des espaces insécables (typographie française
// avant « ? ») : les entités HTML ne fonctionnent pas dans {{ }}.
export default {
  'common.close': 'Fermer',
  'common.save': 'Enregistrer',
  'common.presetNamePlaceholder': 'Nom du preset',

  'theme.switchToLight': 'Passer en mode clair',
  'theme.switchToDark': 'Passer en mode sombre',

  'language.open': 'Choisir la langue',
  'language.title': 'Langue',

  'presets.open': 'Ouvrir la liste des presets',
  'presets.closeList': 'Fermer la liste des presets',
  'presets.title': 'Presets ({count})',
  'presets.previous': 'Preset précédent',
  'presets.next': 'Preset suivant',
  'presets.deselect': 'Désélectionner le preset',
  'presets.loadedPosition': 'Preset chargé · {n} sur {total}',
  'presets.saveNew': 'Enregistrer le preset',
  'presets.edit': 'Modifier',
  'presets.add': 'Ajouter un preset',
  'presets.addSubmit': 'Ajouter',
  'presets.tempoPlaceholder': 'Tempo',
  'presets.exportImportOptions': "Options d'export et d'import",
  'presets.exportImportTitle': 'Exporter / Importer',
  'presets.exportJson': 'Exporter la liste en JSON',
  'presets.importJson': 'Importer une liste JSON',
  'presets.reorder': 'Réordonner le preset',
  'presets.remove': 'Supprimer le preset',
  'presets.empty': 'Aucun preset enregistré.',
  'presets.confirmRemove': 'Supprimer "{name}" de la liste ?',
  'presets.confirmImportReplace':
    'Remplacer la liste actuelle par le fichier importé ?\nOK = remplacer\nAnnuler = fusionner avec la liste existante',
  'presets.importInvalid': 'Fichier JSON invalide.',

  'controls.tempo': 'Tempo',
  'controls.decreaseTempo': 'Diminuer le tempo',
  'controls.increaseTempo': 'Augmenter le tempo',
  'controls.measure': 'Mesure',

  'display.toggle': 'Démarrer ou arrêter le métronome',
  'display.beatPosition': 'Position dans la mesure',

  'wakeLock.label': "Garder l'écran allumé",
  'wakeLock.denied': "Maintien d'écran refusé par le système (mode économie d'énergie ?).",

  'footer.github': 'Voir le projet sur GitHub',
}
