# Références SPOGOMI 2026

> Statut documentaire : `REFERENCE / SNAPSHOT`. Ces fichiers sont des supports
> d’intégration et de test synthétique ; ils ne constituent pas une source de
> vérité runtime ni un règlement officiel.

Le contrat métier durable reste [`../spogomi.md`](../spogomi.md). Les règles de
gamification restent dans [`../gamification/GAMIFICATION_ENGINE.md`](../gamification/GAMIFICATION_ENGINE.md)
et dans le runtime. Aucun futur export Excel ou parcours d’import n’est codé
par la présence de ce kit.

## Contenu intégré

Le dossier contient 17 fichiers versionnés : ce README et 16 artefacts de
référence issus du kit conservé localement.

- `CONTRATS_ET_MAPPING.md` — correspondance historique et décisions de
  modélisation du kit.
- `sources_manifest.json` — manifeste d’empreintes des sources observées,
  incluant la mention explicite que la billetterie réelle n’est pas distribuée.
- `config/` — catégories et coefficients observés, non certifiés comme
  règlement universel.
- `fixtures/` — cinq jeux de données synthétiques et anonymes.
- `fixtures/scenario_cachan_cleanmymap_mixed.json` — manifeste déterministe
  d'une démonstration mixed à une action parent et deux divisions, qui référence
  les 37 places existantes sans les recopier.
- `schemas/` — contrat JSON du paquet de référence.
- `templates/` — cinq trames CSV d’entrée ou de projection.
- `visuels/` — modèle Excel et formulaire PDF vierges, conservés sans
  transformation.

Les fixtures utilisent uniquement des identifiants synthétiques (`PLACE-*`,
`TEAM-*`, `ORD-*`, `SLOT-*`). Les fichiers originaux de billetterie, leurs
identités, coordonnées, codes-barres et valeurs de production ne sont pas dans
ce dossier.

## Scénario mixed — démonstration CleanMyMap

`scenario_cachan_cleanmymap_mixed.json` est le manifeste canonique du scénario
synthétique **SPOGOMI Cachan, démonstration CleanMyMap**. Il conserve une seule
action parent, deux divisions et une partition complète des références
`PLACE-001..037` du CSV existant : 18 places en six trios World Cup et 19 places
en quatre équipes Casual de quatre membres plus une équipe de trois.

Les deux règlements sont explicitement fictifs et non officiels. Les catégories,
coefficients, arrondis `half_up` à deux décimales, obligation de mesure de toutes
les catégories et départage par masse sont des paramètres de simulation du
manifeste ; ils ne valident aucun barème réel. Les mesures restent en grammes,
`null` représente une absence de mesure et `0` une mesure zéro explicitement
constatée. Les références de provenance aux lignes Casual documentées sont
conservées sans intégrer le classeur brut.

Le manifeste conserve également, sans les résoudre, les divergences historiques
de décompte `37/47/50` participants et de totaux `13925.3/14000.3/14001/14002`
points. Le test de contrat
`apps/web/src/lib/spogomi/reference-fixtures.contract.test.ts` vérifie la
partition des places, les effectifs, les catégories, les coefficients, les
scores attendus et l'absence de PII.

### Intégration exécutable sur Supabase éphémère

`e2e/spogomi-cachan-integration.mjs` exécute le scénario par les routes et
services SPOGOMI réels : création idempotente de l'édition parent, règlements
des deux divisions, import des 37 places, composition, présences, opérations
terrain, sessions d'équipe, soumissions et correction auditée, arbitrage,
clôture, consolidation, classements, export XLSX et projection publique. Le
runner vérifie aussi les séparations de divisions, les scores de référence,
`null` contre zéro, les masses contre les nombres de mégots, la révocation de
session et le refus d'une capacité terrain absente.

Cette intégration est volontairement exécutable uniquement dans le job GitHub
Actions `e2e-supabase-ephemeral`. Elle exige
`CMM_SUPABASE_TEST_ENVIRONMENT=ephemeral` et
`CMM_SUPABASE_EPHEMERAL_TEST_AUTHORIZATION=I_UNDERSTAND_EPHEMERAL_ONLY`,
refuse toute URL Supabase distante, démarre deux serveurs Next locaux avec des
clés Clerk Development et ne crée aucun projet Supabase payant. La date
opérationnelle est paramétrable avec `SPOGOMI_OPERATIONAL_DATE` ; sa valeur par
défaut est `2030-06-01`. Le runner interprète les horaires annoncés dans
`Europe/Paris` via les règles IANA, convertit les instants UTC envoyés aux
routes et refuse une date civile invalide, une heure inexistante ou une heure
ambiguë lors d'un changement d'heure. Les clés d'idempotence des soumissions
sont déterministes, uniques par équipe et version, et respectent la longueur
minimale de l'API. Une exécution réussie imprime un résultat par étape et le
marqueur `EXECUTED_SPOGOMI_INTEGRATION`.

## Limites d’usage

Les catégories, coefficients, arrondis, pénalités, compositions et résultats
observés restent à confirmer par un règlement ou une décision certifiée. Ils
peuvent servir à tester un mapping ou une présentation, mais ne doivent pas
être importés comme données de production ni recopiés dans le contrat runtime.
