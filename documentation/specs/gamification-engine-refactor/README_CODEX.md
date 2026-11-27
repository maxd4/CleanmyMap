# Refonte du moteur de gamification (hors refonte UI)

**Statut : CANDIDATE / réception requise.** Référence factuelle : 2acc756a6e2994ed012965c23fe41bdc10ffda6f. Les fichiers complets ci-dessous ne sont pas le runtime CURRENT. Ne pas imposer ce SHA au checkout.

## Objectif et décision

RESTRUCTURE_FIRST : trois séparations fondées sur les responsabilités réelles, sans nouvelle économie XP ni réécriture SQL. Le chantier GAME de l'interface à cinq onglets demeure indépendant ; préserver les changements UI concurrents.

1. Registre : extraire catalogue et classification hors des utilitaires d'actions ; migrer les consommateurs purs principaux identifiés (règles, catalogue, summary, jalons, terrain, projection des statistiques et classement). Les exports existants restent une compatibilité pour les consommateurs historiques et tests.
2. Réconciliation : séparer contrat du reçu, construction pure et stockage des notifications. Conserver le chemin public existant et ses mocks ; les opérations scientifiques, les erreurs, les filtres propriétaire, l'identité du reçu, la finalisation conditionnelle et la relecture du gagnant restent inchangés.
3. Légendes : isoler fenêtre civile, rangs, projection publique et chargement des faits. Le loader orchestre actions admissibles, participations confirmées, consentements, éligibilité Clerk et profils. Préserver le point d'entrée engine.ts, la pagination, les égalités, le périmètre privé du propriétaire et les preuves de récompenses.
4. Documentation : intégrer les six fichiers documentaires candidats avec le code uniquement ; maintenir la spec route-first et les règles produit existantes (aucune modification fonctionnelle de page). Ne pas recréer une source métier concurrente.

## Intégration

BASE_FILES.json inventorie chaque fichier et son blob de base. Le contenu sous candidates/ suit exactement le chemin destination. Intégrer les deltas après comparaison avec le checkout courant ; ne pas écraser les changements concurrents. Conserver les mocks au chemin de façade tant que les consommateurs le nécessitent. Les tests territoriaux et de persistance de reçu existants visent directement les owners extraits ; le registre possède une assertion de conservation d'identité des exports historiques.

## Invariants

- Aucune nouvelle table, migration, dépendance, API, révision de règles, clé d'événement ou écriture directe client ; pas de changement de permissions, seuil, ordre des rangs, public/private, attribution, dates ni erreurs.
- progression_events demeure le ledger XP, progression_profiles sa projection ; RPC atomiques, RLS/grants, états LEGACY et règles d'idempotence intacts. Le mobile consomme le même contrat HTTP.
- Préserver les imports directs et dynamiques, les scripts, les tests statiques et le registre documentaire. Ne pas modifier les consommateurs UI sauf incompatibilité démontrée et coordonnée.
- Cette extraction ne démontre pas à elle seule que tout le domaine est optimal : examiner les autres cibles sur preuves de couplage, complexité ou duplication ; ne pas déplacer des modules uniquement pour changer l'arborescence. Ne pas étendre ce candidat par un refactor fonctionnel non demandé.

## Preuves

Lecture des sources et tests pertinents au SHA de base ; extraction de sections existantes, comparaison des ancres et inventaire des fichiers. Aucune exécution du runtime, du typecheck, du lint, de Vitest ou des checks qualité dans ChatGPT : accès réseau au conteneur indisponible, dépendances du checkout non accessibles (HOOK_NOT_AVAILABLE / NOT_RUN / NOT_MEASURED). Aucune preuve PostgreSQL ou production revendiquée. Vérifier explicitement les imports, mocks et consommateurs non exhaustivement inventoriés.

## Réception

Exécuter les tests de progression, réconciliation, territorial-legends, frontières du domaine, routes API gamification, profils/dashboard et UI gamification touchés par les imports. Vérifier scripts de réconciliation et backfill, typecheck, lint, garde-fous de cycles/duplication/complexité/top-heavy pertinents, couverture Web des modules concernés, contrôles documentaires. Prouver les scénarios existants : XP validée/pending, règles de non-gamification, classifications, reçu sans delta, reprise scientifique et conflit, action admissible, consentement révoqué, Clerk indisponible, propriétaire privé et égalités. Ne pas modifier les baselines pour passer les contrôles. Aucun SQL distant ni déploiement requis.

STOP CONDITION : les trois séparations sont intégrées au checkout courant, tests et contrôles ciblés passent, contrats et docs CURRENT cohérents, publication sur main vérifiée ; retirer les candidats consommés et documenter tout reliquat démontré sans le présenter comme terminé.
