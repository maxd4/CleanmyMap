# Références SPOGOMI 2026

> Statut documentaire : `REFERENCE / SNAPSHOT`. Ces fichiers sont des supports
> d’intégration et de test synthétique ; ils ne constituent pas une source de
> vérité runtime ni un règlement officiel.

Le contrat métier durable reste [`../spogomi.md`](../spogomi.md). Les règles de
gamification restent dans [`../gamification/GAMIFICATION_ENGINE.md`](../gamification/GAMIFICATION_ENGINE.md)
et dans le runtime. Aucun futur export Excel ou parcours d’import n’est codé
par la présence de ce kit.

## Contenu intégré

Le dossier contient 16 fichiers versionnés : ce README et 15 artefacts de
référence issus du kit conservé localement.

- `CONTRATS_ET_MAPPING.md` — correspondance historique et décisions de
  modélisation du kit.
- `sources_manifest.json` — manifeste d’empreintes des sources observées,
  incluant la mention explicite que la billetterie réelle n’est pas distribuée.
- `config/` — catégories et coefficients observés, non certifiés comme
  règlement universel.
- `fixtures/` — quatre jeux de données synthétiques et anonymes.
- `schemas/` — contrat JSON du paquet de référence.
- `templates/` — cinq trames CSV d’entrée ou de projection.
- `visuels/` — modèle Excel et formulaire PDF vierges, conservés sans
  transformation.

Les fixtures utilisent uniquement des identifiants synthétiques (`PLACE-*`,
`TEAM-*`, `ORD-*`, `SLOT-*`). Les fichiers originaux de billetterie, leurs
identités, coordonnées, codes-barres et valeurs de production ne sont pas dans
ce dossier.

## Limites d’usage

Les catégories, coefficients, arrondis, pénalités, compositions et résultats
observés restent à confirmer par un règlement ou une décision certifiée. Ils
peuvent servir à tester un mapping ou une présentation, mais ne doivent pas
être importés comme données de production ni recopiés dans le contrat runtime.
