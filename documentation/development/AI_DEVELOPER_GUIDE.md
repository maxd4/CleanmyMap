# Repères Codex : développement CleanMyMap

Statut : `CURRENT` (orientation spécialisée, non normative pour Git, tests ou AuthZ).
Pour le contrat d’exécution : les sources de gouvernance racine et scoped. Pour le contrat
documentaire : `documentation/development/DOCUMENTATION_POLICY.md`.
Ne lire que les sections pertinentes à la tâche.

## 1. Vocabulaire métier canonique

Le vocabulaire produit transversal est défini dans
[`documentation/product/ubiquitous-language.md`](../product/ubiquitous-language.md).

Le vocabulaire d'autorisation est défini par
`apps/web/src/lib/domain-language.ts` et `apps/web/src/lib/profiles.ts`.

- **Role** : `benevole`, `coordinateur`, `scientifique`, `entreprise`, `elu`,
  `admin`, `max`.
- **SessionRole** : un `Role` ou l'état de session non connecté `anonymous`.
- **Parcours** : la projection de navigation d'un `Role` ; actuellement
  `Parcours = Role`.

`anonymous` est un état de session, pas un rôle métier. Ne modifie pas ces
contrats sans vérifier leurs consommateurs et les règles canoniques du dépôt.

## 2. Architecture actuelle

CleanMyMap est un monorepo avec deux applications déployables :

- `apps/web` : application web Next.js avec App Router ;
- `apps/mobile` : application Expo / React Native du même produit.

Les deux applications partagent les contrats nécessaires, Clerk et Supabase,
mais restent des surfaces déployables distinctes. Les versions exactes sont
définies par les manifestes du dépôt.

Dans `apps/web` :

- `src/app/` contient les pages, layouts et routes API ;
- `src/components/` contient l'UI ;
- `src/lib/` contient le domaine, les services et les contrats ;
- `src/lib/sections-registry/config.ts` est le registre canonique des rubriques.

Clerk reste l'identité principale. Supabase fournit la persistance et les
services de données ; les frontières serveur/client et les droits effectifs
restent ceux du code courant.

## 3. Documentation spécialisée à consulter

Consulte uniquement la documentation réellement concernée par le changement :

- [Architecture](../architecture/README.md) pour les décisions et frontières ;
- [Gouvernance des données](../architecture/data-governance.md) pour les
  contrats de données et l'ingestion ;
- [Standard API](./api-standard.md) pour les contrats HTTP, les erreurs et les
  invariants AuthN/AuthZ ;
- [Testing](./TESTING.md) pour les validations de développement ;
- [Règles de qualité](./repo-quality-rules.md) pour les invariants qualité
  transversaux ;
- [TypeScript Precision Policy](./typescript-precision-policy.md) pour les
  frontières non fiables, casts et types ;
- [Lint & Static Analysis Refactor Playbook](./lint-refactor-playbook.md) pour
  les diagnostics statiques ;
- [Design system](../design-system/README.md) pour une modification UI.

Ne crée pas de copie locale d'une règle déjà portée par la gouvernance ou une
source documentaire spécialisée. Si deux documents semblent prescrire des
règles différentes, vérifie le code et les sources canoniques avant de modifier
l'un d'eux.

## 4. Localisation et texte visible

CleanMyMap possède des surfaces bilingues FR/EN. Une modification d'une surface
qui supporte déjà les deux langues doit préserver ce contrat dans le même lot.

Règles :

- conserver une équivalence de sens entre les variantes FR et EN ;
- réutiliser le mécanisme de locale déjà présent dans la zone concernée ;
- pour un texte partagé, préférer les ressources de locale existantes lorsqu'un
  emplacement canonique couvre le besoin ;
- pour une copie strictement locale à un composant, conserver le pattern local
  existant plutôt que créer un second système de traduction ;
- ne pas déduire qu'un log serveur, un identifiant technique ou une donnée
  interne doit être bilingue si le contrat utilisateur ne l'exige pas ;
- ne pas coder un nombre de clés, de lignes ou de traductions comme invariant
  documentaire : vérifier les fichiers actuels.

Les sources runtime de localisation font foi. Une documentation ne doit pas
recopier un catalogue de textes destiné à évoluer avec l'interface.

## 5. Qualité des états et interactions UI

Les règles visuelles et interactives ne vivent pas dans un guide qualité
générique. Utiliser les contrats spécialisés du design system :

- `ACTIONS_BUTTONS.md` pour les actions standard et `CmmButton` ;
- `FORMS_CONTROLS.md` pour les champs et erreurs associées ;
- `STATES_FEEDBACK.md` pour `SystemState`, `CmmFeedback` et `CmmSkeleton` ;
- `INDICATORS_BADGES.md` pour les indicateurs compacts ;
- `OVERLAYS_DIALOGS.md` pour les dialogs et overlays ;
- `PAGE_HEADER.md` et `LAYOUT_SPACING.md` pour la structure de page.

Pour une interaction asynchrone, préserver selon le besoin réel :

- l'état pending/loading ;
- la prévention des doubles soumissions ;
- l'erreur au bon niveau de l'interface ;
- une confirmation observable ;
- la navigation clavier et le focus ;
- un nom accessible pour les contrôles sans libellé visible.

Les messages utilisateur doivent rester compréhensibles et actionnables sans
exposer inutilement les détails techniques. Les réponses API suivent
[`api-standard.md`](./api-standard.md) et les helpers runtime existants.

Ne pas imposer une recette UI issue d'un ancien exemple si la primitive
canonique actuelle porte déjà le comportement.

## 6. Repères de développement

Pour une tâche donnée :

1. identifier le contrat ou le module réellement concerné ;
2. vérifier ses consommateurs et sa source canonique ;
3. préserver les contrats publics sauf décision distincte ;
4. corriger la cause racine ;
5. appliquer les validations proportionnées définies par la gouvernance et
   `TESTING.md`.

Les scripts Python de maintenance vivent sous `maintenance/python/` et restent
hors du runtime web. Toute modification de cette zone doit rester explicitement
dans son propre périmètre.

## 7. Découverte technique ciblée

Cet index oriente vers les sources réelles ; il ne définit pas leurs contrats
et ne prouve pas l'exhaustivité des consommateurs.

1. Identifier le workspace, le contrat, le parcours et les risques. Lire
   intégralement les règles racine et scoped applicables. Partir de
   [l'index lib Web](../../apps/web/src/lib/README.md) ou du
   [README Mobile](../../apps/mobile/README.md).
2. Ouvrir le README du domaine lorsqu'il existe, puis rechercher les symboles
   propriétaires, leurs dépendances, callers et consommateurs.
3. Réutiliser le graphe d'imports existant et son sélecteur borné :
   `npm run audit:architecture-import-graph -- --ref <SHA> --source git --output artifacts/architecture-import-graph.json`
   puis `npm run query:architecture-import-graph -- artifacts/architecture-import-graph.json <chemin-ou-dossier> <SHA> 20`.
   Le sélecteur exige un SHA complet (40 hex) et une provenance Git vérifiée,
   borne les listes et exclut les arêtes internes d'un dossier. Limite : arêtes
   statiques directes uniquement (hors appels HTTP/RPC par chaîne littérale).
4. Compléter les imports statiques par la recherche des routes HTTP, RPC,
   tables, clés de stockage, jobs, imports dynamiques et références littérales.
   QMD et GitNexus restent des aides facultatives selon TESTING.md.
5. Lire les tests pertinents et les contrats CURRENT propriétaires. La
   découverte ciblée ne dispense ni des lectures intégrales exigées en revue
   de commits, ni des validations de frontières sensibles.

### Carte de découverte Web

| Domaine (nom de dossier) | Point d'entrée | Orientation existante |
|---|---|---|
| actions | [Dossier](../../apps/web/src/lib/actions/) | [README local](../../apps/web/src/lib/actions/README.md) (cycle pré-action/post-action, publication, annulation, signalement) |
| community | [Dossier](../../apps/web/src/lib/community/) | [README local](../../apps/web/src/lib/community/README.md) |
| gamification | [Dossier](../../apps/web/src/lib/gamification/) | [README local](../../apps/web/src/lib/gamification/README.md) |
| spogomi | [Dossier](../../apps/web/src/lib/spogomi/) | [README local](../../apps/web/src/lib/spogomi/README.md) (admissions, équipes, résultats, lifecycle) |
| reports | [Dossier](../../apps/web/src/lib/reports/) | [README local](../../apps/web/src/lib/reports/README.md) (génération, historique, publication publique) |
| route | [Dossier](../../apps/web/src/lib/route/) | [README local](../../apps/web/src/lib/route/README.md) |
| learning | [Dossier](../../apps/web/src/lib/learning/) | [README local](../../apps/web/src/lib/learning/README.md) |
| chat | [Dossier](../../apps/web/src/lib/chat/) | [README local](../../apps/web/src/lib/chat/README.md) (discussions d'action, canaux, sondages, DM) |
| auth | [Dossier](../../apps/web/src/lib/auth/) | [README local](../../apps/web/src/lib/auth/README.md) |
| supabase | [Dossier](../../apps/web/src/lib/supabase/) | [README local](../../apps/web/src/lib/supabase/README.md) |
| geo | [Dossier](../../apps/web/src/lib/geo/) | [README local](../../apps/web/src/lib/geo/README.md) |
| partners | [Dossier](../../apps/web/src/lib/partners/) | [README local](../../apps/web/src/lib/partners/README.md) (annuaire partenaires, onboarding) |
| environmental-impact-estimator | [Dossier](../../apps/web/src/lib/environmental-impact-estimator/) | [README local](../../apps/web/src/lib/environmental-impact-estimator/README.md) |
| impact | [Dossier](../../apps/web/src/lib/impact/) | Indicateurs d'impact et facteurs scientifiques (`../scientific-indicators/` et `apps/web/src/lib/impact/`) |
| missions | [Dossier](../../apps/web/src/lib/missions/) | [README local](../../apps/web/src/lib/missions/README.md) (relai web `mission-access.ts`, owner mobile dans `apps/mobile/README.md`) |
| notifications | [Dossier](../../apps/web/src/lib/notifications/) | Préférences et cibles de notifications in-app (`app_notifications`) |
| pilotage | [Dossier](../../apps/web/src/lib/pilotage/) | Projections de pilotage et synthèse territoriale |
| funding | [Dossier](../../apps/web/src/lib/funding/) | Suivi des contributions et transparence financière (`funding_contributions`) |
| services | [Dossier](../../apps/web/src/lib/services/) | Adaptateurs de services externes (emails, webhooks) |
| validation | [Dossier](../../apps/web/src/lib/validation/) | Schémas de validation partagés aux frontières HTTP |
| http | [Dossier](../../apps/web/src/lib/http/) | Helpers HTTP, en-têtes cache/sécurité et réponses API |
| persistence | [Dossier](../../apps/web/src/lib/persistence/) | Stores serveur/locaux (`runtime-store.ts`, `local-record-store.ts`) |
| storage | [Dossier](../../apps/web/src/lib/storage/) | Contrats de stockage client/serveur |
| time | [Dossier](../../apps/web/src/lib/time/) | Conversions UTC / `Europe/Paris` et fuseaux IANA |
| waste | [Dossier](../../apps/web/src/lib/waste/) | Référentiel des catégories et facteurs de déchets |
| maps | [Dossier](../../apps/web/src/lib/maps/) | Utilitaires cartographiques Leaflet et tuiles |
| pdf-export | [Dossier](../../apps/web/src/lib/pdf-export/) | Génération PDF bas niveau (`simple-pdf.ts`) consommée par `reports/` |
| admin | [Dossier](../../apps/web/src/lib/admin/) | [README local](../../apps/web/src/lib/admin/README.md) (modération, creator-inbox, audit) |
| account | [Dossier](../../apps/web/src/lib/account/) | Profils, rôles actifs, preuves d'engagement et suppression de compte |
| data | [Dossier](../../apps/web/src/lib/data/) | Synchronisation locale et reprise de données historiques |

Les autres domaines restent accessibles depuis l'index lib Web. Un README
absent ne justifie pas automatiquement une nouvelle fiche. Enrichir l'owner
documentaire si une ambiguïté réelle ne peut être levée par l'inventaire
généré. Pour les données, partir de [Database](../database/README.md) ; pour
les chaînes d'usage, de [la matrice de traçabilité](../architecture/traceability-matrix.md).
