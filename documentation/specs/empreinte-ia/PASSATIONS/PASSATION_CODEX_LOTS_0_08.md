# Passation de pré-intégration CleanMyMap : lots 0 à 4 et complément 08

**Statut : PLAN / CODE CANDIDAT.** Date : 20 novembre 2026. **Aucune modification de GitHub, du checkout utilisateur, de Supabase, de Clerk ou de Vercel.** Ces fichiers ont été construits hors dépôt, en lecture seule de `maxd4/CleanmyMap` sur `main`. Ils ne constituent pas une preuve de fonctionnement dans Next.js ni un lot Codex terminé.

## Autorité et ordre

1. Réexaminer `main` au moment de l'intégration. Les sources gouvernantes sont `CHATGPT.md`, les instructions racine et scoped applicables, la documentation scientifique et les propriétaires métier actuels.
2. Les pièces `SPECIFICATIONS_PLAN/00` et `01` sont les dernières versions récupérées du chantier IA, et `02` à `08` sont les spécifications conservées. `ERRATA_CONTRATS_0_08.md` tranche les anciennes formulations obsolètes. **Ne pas prendre l'ancien nombre de « cleanwalks équivalentes » pour un contrat actif.**
3. Ordre d'intégration conservé : **lot 0 + complément 08 → lot 1 → lot 2 → lot 3 → lot 4**. Les lots 09 et suivants restent indépendants et futurs.
4. Ces candidats cherchent la convergence vers l'owner `apps/web/src/lib/environmental-impact-estimator/`, pas la création d'un second estimateur public. Chaque helper doit être fusionné, consommé ou internalisé lorsqu'un owner équivalent existe déjà.

## Résultat livré, par lot

| Lot | Fichiers candidates fournis | Réellement livré hors checkout | Réservé à l'intégration |
|---|---|---|---|
| **0** Science | `ai-cleanwalk-science.ts`, `.test.ts` ; `ai-energy-scenario-card.tsx` | Frontières IT_FULL, FACILITY et LOCAL_WALL, PUE sans double application, énergie locale charge/vide, facteur candidat RTE France 2025, eau directe/indirecte séparées, sensibilité 1M tokens et carte pédagogique sans compensation | Modifier l'owner existant `personal-ai-estimator.ts` et `scientific-registry.ts` sans altérer ses contrats historiques ; intégration de la carte dans la route Méthodologie réellement trouvée sur `main` ; tests officiels et navigateur |
| **08** Double seuil | `ai-cleanwalk-goal-solver.ts`, `.test.ts`, `ai-cleanwalk-goal-explorer.tsx` | 101 positions, statuts explicites, borne volontaire, recyclage BNR par matériau réellement réincorporé, deux voies d'eau exclusives, zéro vs NA, plafonds et arrondis, contrôle 15 milliards tokens | Câbler aux vrais résultats IA, aux choix du curseur utilisateur et aux composants existants ; aucune conversion en dette carbone, ni KPI terrain ni XP |
| **1** Saisie/stockage | `ai-personal-usage-normalization.ts`, tests associés ; SQL candidat | Contrat temporel UTC `[début,fin[`, tokens/cache/raisonnement cohérents, mode `API / SUBSCRIPTION / LOCAL_OWNED`, plateforme/forfait optionnels sans prétendre connaître les droits ; DDL et RLS owner-scoped proposés | Route `/learn/empreinte-ia` absente de `main` lu, calcul anonyme, CRUD privées, suppression, véritable migration forward-only et owner A/B exécuté, sécurité de la persistance et des snapshots |
| **2** Imports | `ai-personal-usage-import.ts`, `ai-personal-csv.ts`, `ai-personal-import-preview.ts` et tests | Parsing conservateur OpenAI, Anthropic Analytics 2026, Gemini et Codex rollout, CSV à colonnes explicitement mappées ; pagination/fraîcheur et aperçus de doublons/révisions/conflits | Import PDF textuel, limites des pièces au point d'entrée, traitement fichiers et refus contenu privé, source de vérité Codex pour la reconstruction, hash stable, transaction atomique et réconciliation persistante |
| **3** Budget/historique | `ai-personal-monthly.ts`, tests | Agrégats mensuels UTC bornés, détection de chevauchement, compteurs partiels non confondus avec total complet, budget facultatif, coût par devise séparé | Rattachement au stockage owner-scoped, calendrier privé, filtres, conflits et révisions scientifiques, contrôle des caches utilisateur |
| **4** Clôture UX | Deux composants React proposés et leurs fonctions pures | Contrôles du curseur, états de faisabilité et avertissements scientifiques, scénarios de référence sans stockage ni gamification | Véritable page unique, navigation et design system, locale, modes d'affichage, recherche publique d'Actions existante, tests responsive, intégration bout en bout des lots précédents |

## Faits observés sur `main` pendant la préparation

- `apps/web/src/lib/environmental-impact-estimator/personal-ai-estimator.ts` **existe**, possède `estimatePersonalAiFootprint`, et son entrée `measuredEnergyKwh` représente aujourd'hui des kWh IT ; cette valeur reçoit ensuite un PUE. Ajouter une frontière FACILITY et LOCAL_WALL **dans cet owner**, pas en parallèle.
- `scientific-registry.ts` contient déjà le proxy de 2024 `electricity-fr-rte-2024` = `0.0217 kgCO₂e/kWh` et le proxy États-Unis 2024 = `0.35`. RTE France consommation directe 2025 `0.0200 kgCO₂e/kWh` est une **nouvelle version candidate** et ne doit pas réécrire 2024.
- Le catalogue `model-catalog.ts` sépare déjà éditeur, hébergeur, poids open-weight et environnement `cloud_api/local_device`. Aucun fournisseur ni pays de traitement réel n'est inventé.
- Le mécanisme Codex de cumul/réinitialisation existe dans `scripts/data/summarize-jsonl-tokens.mjs`. **Ne pas conserver deux propriétaires parallèles du même algorithme** après intégration.
- `/learn/empreinte-ia` et le solveur 08 sont absents de l'état `main` examiné. L'emplacement de la page Méthodologie n'était pas `apps/web/src/app/methodologie/page.tsx`; découvrir le consommateur/routage réel au moment de l'intégration.
- Les migrations Supabase éditables sont sous `apps/web/supabase/migrations/`. La dernière migration vue lors du relevé était `20261120000002_spogomi_certificate_advisory_lock_restore.sql`. **L'identifiant du SQL proposé n'est pas réservé.**
- Les RLS owner-scoped existantes utilisent le `sub` du JWT Clerk via `auth.jwt()`. Le candidat SQL emprunte cette frontière, sans proposer de `service_role` côté client.

## Invariants à ne pas changer

- Source IA personnelle `PERSONAL_AI_USAGE` séparée de `CLEANMYMAP_PRODUCTION` et des snapshots du projet. Aucun cumul public, quota Codex admin, XP, badge, donnée de partenaire ni dette de compensation.
- Région d'inférence vérifiée ou simulation explicitement déclarée. Électricité locale de l'utilisateur ≠ localisation de l'éditeur du modèle.
- Pas de facture brute, prompt, transcript, nom de compte fournisseur, clé API ou PDF binaire dans les enregistrements normalisés ni les logs. Identité d'import et contenu normalisé hachés séparément. Les empreintes SHA-256 ne rendent pas les données sensibles anonymes à elles seules.
- `NA` reste différent de zéro ; un relevé partiel, un chevauchement, un traitement incinération ou une donnée ACV non sourcée ne peut pas devenir un bénéfice physique certifié.
- Le **proxy** de comparaison `C_scenario / 1,2 kgCO₂e/kg` reste facultatif et clairement fictif. **Aucun ratio du type `R_cw` en nombre de cleanwalks de 5 kg** ne doit être restauré en douce.
- `RISQUE_CONVENTIONNEL` (500 L potentiellement pollués par mégot) et `EAU_CONSOMMEE_ACV` (litres d'eau consommée nette) sont des grandeurs **non interchangeables**, jamais additionnées.
- Abonnement/API et plateforme sont des **déclarations utilisateur**, pas des preuves de tarifs, droits au modèle, forfait, nombre de requêtes, coût énergétique ou qualité de code.

## SQL : candidat non applicable tel quel

Le dossier `SQL_CANDIDATE_NOT_APPLIED/` est **hors de l'arbre migrations** intentionnellement. Il propose trois tables privées : déclarations, budgets mensuels, révisions immuables. Les tables sont sous RLS owner Clerk ; aucune policy de mutation des révisions pour `authenticated`, seulement lecture ; les révisions sont écrites via serveur autorisé après calcul réel et vérification Clerk. Le contenu et l'identité source sont contraints à des digest SHA-256 hexadécimaux.

Ce SQL **ne dispose pas** de preuve PostgreSQL, d'une route API, ni d'un RPC d'import atomique. Avant intégration : réexaminer `main` et le schéma, identifier la migration numérotée disponible, vérifier AuthN/AuthZ côté serveur, transaction d'import, conflits/versionnage, retour d'erreur, restrictions d'accès, et exécuter les scénarios SQL A/B dans un environnement autorisé. Pas de Docker, WSL ni Supabase local. Respecter le préflight lié et les règles scoped. Si indisponible : `DB_SEMANTICS_NOT_EXECUTED`, ne pas appliquer en production.

## Prévalidation déjà exécutée ici

- Compilation **TypeScript stricte isolée** des modules métier et des composants TSX avec déclarations de remplacement pour React et Vitest : `PASS`.
- **47 tests synthétiques en Node**, au moyen d'un shim `describe/it/expect` exécutant les fichiers compilés : **47/47 PASS**. Les tests contiennent des fixtures explicites, jamais des mesures fournisseurs réelles. Le shim n'est pas livré comme une dépendance du produit.
- Pas de Vitest officiel, lint officiel, Next.js build, browser, coverage instrumentée, véritable SQL, CI, Clerk, Vercel, Supabase ni démonstration de fonctionnement production. La carte et le solveur sont uniquement des **candidats**.

## Actions restantes pour Codex, clairement bornées

1. **Lot 0 + 08 :** fusionner les calculs candidats dans les propriétaires existants, exposer le facteur RTE 2025 en scénario versionné, intégrer la carte Méthodologie et le curseur avec les véritables résultats IA. Conserver l'ancienne sémantique pour les consommateurs historiques et vérifier tous les tests de frontière, ACV, eau, arrondis et cas impossible. STOP : noyau et carte réellement exécutés, documentés, sans faux crédit.
2. **Lot 1 :** intégrer le normaliseur, page publique anonyme, API privées, migration owner-scoped adaptée, CRUD et preuve A/B, puis documentation de données. STOP : calcul public fonctionnel et mutations accessibles au seul propriétaire, y compris suppression.
3. **Lot 2 :** adapter les parseurs aux fixtures officielles présentes dans `02`, compléter le PDF **texte seulement**, raccord données et source historique Codex, faire prévisualiser avant confirmation, et effectuer chaque confirmation en transaction idempotente. STOP : imports vérifiés et sans doublon/fuite.
4. **Lot 3 :** raccorder agrégation mensuelle et budgets aux lignes privées, réconciliation, préférences, versions et révisions immuables ; valider les bornes de mois et la couverture. STOP : données historiques correctes, privées et avec inconnues visibles.
5. **Lot 4 :** composer la page unique avec les composants métier, navigation de la rubrique Apprendre et les modes d'affichage ; relier Actions sans inventer d'endpoint `commune`. STOP : parcours complet réellement utilisable sur mobile et desktop, sans modification des KPI, sans gamification anticipée.

Tout travail dans le checkout doit suivre les instructions applicables du dépôt : contrôle `main`, préservation des changements étrangers, mutations autorisées et validations proportionnées. Ne jamais annoncer ces STOP sur la seule présence de fichiers, de tests unitaires isolés ou de SQL statique.
