---
name: cleanmymap-import-export
description: "Imports CSV/JSON, backups, restauration, exports PDF/CSV, rapports et fichiers Storage CleanMyMap. Utiliser pour les contrats de données entrantes et sortantes."
category: repository
risk: high
source: local
tags: "[import, export]"
---

# Imports, exports et artefacts métier

## Déclenchement

Activer pour ingestion CSV/JSON, import historique, sauvegarde, restauration, exports PDF/CSV/JSON, fichiers Storage, partage de rapports ou publication de données.

## Sources

Lire `documentation/architecture/data-governance.md`, l'owner d'import/export du domaine, `documentation/operations/data-import/README.md` si import, et les règles d'AuthN/AuthZ, données et Storage directement concernées.

## Méthode

1. Distinguer **import métier**, **migration historique**, **backup/restauration** et **export/projection** : ils n'ont ni le même contrat ni les mêmes privilèges.
2. Inventorier la source, version de format, délimiteur/encodage/unités, champs requis/optionnels, provenance, identifiant d'idempotence et politique des doublons.
3. Définir la validation serveur : tailles et types bornés, erreurs par ligne, conflits, permission sur chaque ressource et absence de données privées dans une projection publique.
4. Pour une mutation, prévoir atomicité/reprise ou rapport partiel explicite. Un re-run ne doit pas dupliquer silencieusement les données.
5. Pour un export, figer colonnes, ordre, unités, format, nom MIME, disposition des valeurs inconnues, droits d'accès, durée de conservation et révocation éventuelle.
6. Ne jamais utiliser les scripts de restauration comme voie d'import généraliste ; contrôler l'ownership exact des scripts et tables.

## Validation

Tester entrée valide, incomplète, malformée, volumineuse, doublonnée et interdite ; vérifier round-trip uniquement si le contrat l'exige. Contrôler absence de secrets/PII dans exemples et artefacts et traçabilité des pertes de données. Distinguer test de sérialisation, contrat SQL statique et preuve PostgreSQL réellement exécutée.
