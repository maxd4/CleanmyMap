# AI Developer Guide — CleanMyMap

Ce guide complète les fichiers de gouvernance à la racine du dépôt. Ils restent
les sources canoniques pour les règles transversales d'exécution, de sécurité,
de Git, de validation et de collaboration. Ce document ne les duplique pas ;
il fournit uniquement les repères propres au développement de CleanMyMap.

## 1. Vocabulaire métier canonique

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
