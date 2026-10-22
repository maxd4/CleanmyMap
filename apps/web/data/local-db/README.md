# Local DB — stores de compatibilité

**Statut : COMPATIBILITY / LOCAL**, pas source de vérité publique de CleanMyMap ni preuve d'une sauvegarde complète et restaurable. La persistance métier et les projections effectives relèvent du runtime et de Supabase selon [data-governance.md](../../../../documentation/architecture/data-governance.md).

## Fichiers versionnés observés dans ce dossier

| Fichier | Sens du nom, sans attestation sur son contenu |
|---|---|
| `real_records.json` | Store local historique de données externes ; provenance et statut de confidentialité à vérifier avant réutilisation |
| `validated_records.json` | Projection locale de validation, pas autorité sur l'état Supabase |

`test_records.json` a existé dans l'ancien contrat mais n'est **pas présent dans l'arbre Git examiné**. Ne pas le recréer comme prérequis du runtime. Tout fichier local ou ignoré doit être inventorié avant utilisation ; ne jamais publier un dump réel ou des données personnelles par commodité.

Contrat historique des enregistrements, à vérifier sur le producteur actuel : `version`, `updatedAt`, `records[]` avec identité, type (`action`, `clean_place`, `other`), statut (`test`, `pending`, `validated`, `rejected`), provenance, localisation, métriques, drapeaux cartographiques et trace d'import.

## Outils existants

- `npm run data:test:build -w apps/web` : générateur de store de test ; inspecter ses entrées et sorties avant exécution.
- `npm run data:validated:sync -w apps/web` : synchronisation locale ; déterminer si elle écrit des données et vérifier la cible, le scope et les droits avant lancement.

Les anciens flux Google Sheets `data:real:sync` n'appartiennent plus au contrat CURRENT. Aucune opération de restauration métier ou de migration Supabase n'est autorisée par ce README.
