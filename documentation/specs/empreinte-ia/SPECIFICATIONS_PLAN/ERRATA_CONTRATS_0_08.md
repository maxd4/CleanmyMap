# Arbitrages de cohérence avant intégration, lots 0 à 4 + complément 08

**Statut : PLAN, 20 novembre 2026.** Annexe corrective des anciens prompts, sans réécriture de la documentation CURRENT du dépôt.

## Priorités scientifiques

1. `01_DECISIONS_SCIENTIFIQUES_ET_CALCULS.md`, version actualisée du pack précédent, est prioritaire sur les demandes obsolètes des fichiers `03`, `06` et `07` : le **nombre de « cleanwalks équivalentes » de 5 kg, cinq personnes, une heure est ABANDONNÉ**. Aucun ratio `R_cw` ne doit être publié comme unité d'impact ou d'effort. La correspondance `C_scenario / IMPACT_PROXY_CONFIG.factors.co2KgPerWasteKg` peut rester une **masse de référence de proxy**, explicitement fictive, jamais une économie de CO2 réelle.
2. Le lot 0 et le complément 08 sont un seul noyau de calcul scientifique, sans moteur distinct d'objectifs ni double comptage. La voie `RISQUE_CONVENTIONNEL` compare une consommation d'eau IA à un volume potentiel de contamination; les impacts hydriques ne sont pas physiquement neutralisés. Pour `EAU_CONSOMMEE_ACV`, les facteurs nets sont signés ou inconnus.
3. Le paramètre régional 2025 français est un **scénario opt-in** et doit rejoindre le registre canonique `scientific-registry.ts` lors de l'intégration. Ne jamais remplacer implicitement le facteur historique 2024 et ne pas calculer un CO2 attribuable si la région physique est inconnue.
4. `+30%` de surcoût carbone ACV partiel est une sensibilité historique isolée, pas une vraie ACV générale ; ne pas l'appliquer deux fois sur EcoLogits.
5. Un relevé `bucket` n'est pas une requête EcoLogits artificielle. Seules de véritables données de requête suffisamment renseignées peuvent alimenter EcoLogits par requête ; sinon les scénarios non calibrés doivent garder `PROXY_SCENARIO`.
6. Le moteur V1 n'apporte **aucune reconnaissance de collecte, aucune participation validée, aucun XP, aucun badge**. Le formulaire lot 4 ne persiste aucun objectif.

## Écarts volontairement non intégrés dans les candidats livrés

- `personal-ai-estimator.ts`, actuellement sans frontière `energy_facility`/`energy_local_wall`, devra être adapté dans le checkout réel, ainsi que ses consommateurs et tests, pour éviter le double PUE et la confusion local/IT. Le module candidat `ai-cleanwalk-science.ts` sert de calcul pur validé, pas de deuxième moteur exposé.
- La route `/learn/empreinte-ia` est absente de `main` à la lecture de cette préparation. Elle est créée au lot 1 et enrichie aux lots suivants. Aucune interface isolée de la route ne prouve son existence runtime.
- Aucun schéma fournisseur CSV universel ni OCR de facture n'est inventé. Les outils purement locaux de prévisualisation n'écrivent pas de données privées.
- Les modèles d'import Codex reflètent les règles de `scripts/data/summarize-jsonl-tokens.mjs`, mais la responsabilité de reconstruction cumulative doit être **partagée ou réutilisée** lors de l'intégration, pas dupliquée de façon permanente.
- Le SQL est **candidat non appliqué**, isolé dans `SQL_CANDIDATE_NOT_APPLIED/`. Il réserve les révisions scientifiques à une écriture serveur autorisée, les clients ne disposent que de leur lecture owner-scoped. Avant toute migration, aligner la version, les types, les droits, le checkout courant, les appels, l'idempotence, la transaction de confirmation et les tests PostgreSQL owner A/B. Le SQL de test fourni n'est pas un test passé.

## Pont entre lot 1 et lot 21

La déclaration normalisée peut conserver `access.billingMode` (`API`, `SUBSCRIPTION`, `LOCAL_OWNED`) avec, pour `SUBSCRIPTION`, la plateforme de code et le forfait déclarés. Ces champs n'impliquent jamais une consommation électrique réelle, une facturation par requête, ni des quotas vérifiés ; ils nourrissent seulement le comparateur du lot 21 quand des preuves indépendantes existent.

## STOP

Ne pas déclarer le lot 0, 1, 2, 3 ou 4 terminé sur la seule base de ces fichiers. Les livrables autonomes sont des candidats testés hors workspace, non des preuves d'intégration ni de production. Codex doit vérifier le `main` effectivement publié et appliquer les validations de son propre environnement.
