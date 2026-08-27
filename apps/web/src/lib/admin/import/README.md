# Admin import

Ce dossier contient les preuves cryptographiques du parcours d’import admin.

- `dry-run-proof.ts` construit et vérifie la preuve entre dry-run et
  confirmation.
- `dry-run-proof.test.ts` couvre ce contrat sans déplacer la mutation d’import,
  qui reste dans le domaine Actions.

Ce dossier ne contient ni contrôle d’accès ni écriture de données métier.
