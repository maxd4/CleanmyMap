# Plan — Registre `page-families` (couleurs par type de route)

Document de référence pour piloter la transition de la charte couleur par pages. Il complète le guide d'usage [`PAGE_FAMILIES.md`](../development/PAGE_FAMILIES.md).

**Dernière mise à jour** : le plan est aligné sur les 11 types de routes inventoriés dans `documentation/pages_site`.

---

## But du plan

Le registre `page-families` sert à stabiliser la couleur, le fond, le hero et les cartes des pages qui partagent un même contexte visuel.

Une modification de palette sur une page de bloc doit se faire dans un fichier famille + exceptions nommées, puis se propager à :

1. Fond de page global (`VibrantBackground`)
2. En-tête de page (`PageHeader`, alias historique `PageHero` / `SectionShell`)
3. Cartes rubrique standard (`RubriqueCard` / `FamilyRubriqueCard`)
4. Plus tard, cartes métier spécialisées, boutons et états système

Ce plan ne remplace pas l'index `pages_site`. Il sert à rendre la migration exécutable.

---

## Taxonomie des 11 types de routes

Le dossier `documentation/pages_site` organise l'inventaire autour de 11 types. Le plan `page-families` doit rester lisible dans cette taxonomie.

| # | Type de route | Dossier canonique | Rôle vis-à-vis de `page-families` |
|---|---|---|---|
| 00 | Homepage (hors bloc) | `routes/00-homepage` | famille autonome, hors logique bloc |
| 01 | Accueil & Pilotage (bloc) | `routes/01-accueil-pilotage` | famille prioritaire, registre central pour le bloc 01 |
| 02 | Agir (bloc) | `routes/02-agir` | famille bloc métier |
| 03 | Cartographie & Impact (bloc) | `routes/03-cartographie-impact` | famille bloc visuelle et analytique |
| 04 | Réseau & Discussions (bloc) | `routes/04-reseau-discussions` | famille bloc communautaire |
| 05 | Apprendre (bloc) | `routes/05-apprendre` | famille bloc pédagogique |
| 06 | Auth & Onboarding (hors bloc) | `routes/06-auth-onboarding` | famille autonome, charte auth dédiée |
| 07 | Institutionnel & Légal (hors bloc) | `routes/07-legal` | famille autonome, sobriété prioritaire |
| 08 | Système & Utilitaires (hors bloc) | `routes/08-systeme-utilitaires` | famille autonome, pages outil, erreurs et dynamiques |
| 09 | Admin & Super-admin (hors bloc) | `routes/09-admin-superadmin` | famille autonome, accès technique |
| 10 | Print & Export (hors bloc) | `routes/10-print-export` | famille autonome, contraintes d'impression |

---

## Lecture cible

Le plan doit permettre de répondre rapidement à ces questions :

- quelle famille couleur s'applique à une route donnée ;
- quelles exceptions sont documentées ;
- quelles routes restent hors migration ;
- quel composant UI porte la vérité visuelle ;
- quand une page est considérée comme migrée.

Le point important est le suivant :

- les types 01 à 05 sont les véritables familles de bloc ;
- les types 06 à 10 sont des familles autonomes, mais doivent suivre la même discipline de documentation et de validation.

---

## Phases du plan

### Fondations du registre

| Livrable | Statut |
|---|---|
| `lib/ui/page-families/` (types, resolve, exceptions) | Fait |
| `resolveBackdropToneKey` délègue à `resolvePageFamily` | Fait |
| Familles 00–10 définies dans `defaults.ts` | Fait |
| Guide court `PAGE_FAMILIES.md` | Fait |

### Bloc 01, accueil et pilotage

| Livrable | Statut |
|---|---|
| Routes canoniques du bloc centralisées dans `lib/accueil-pilotage-routes.ts` | Fait |
| `01-accueil-pilotage.ts` | Fait |
| `PageHeader` | Fait |
| `SectionShell` résout la famille via `pathname` | Fait |
| Migration de `/dashboard` (canon), `/profil` (alias), `/pilotage`, `/profil/*`, `/sponsor-portal` | Fait |
| Exception `/explorer` | Fait |

### Cartes et ponts bloc 01

| Livrable | Statut |
|---|---|
| Type `PageFamilyCardTokens` | Fait |
| Presets carte par famille | Fait |
| Application des tokens via `family.card` | Fait |
| `FamilyRubriqueCard` | Fait |
| Migration bloc 01 de `/profil/[profile]` | Fait |
| Hook `usePageFamily()` | Fait |

### Homepage autonome, bloc 00

| Livrable | Statut |
|---|---|
| Route canonique `/` centralisée pour les usages internes | Fait |
| Alias `/accueil` conservé uniquement pour compatibilité | Fait |
| Footer et variantes liées à la homepage alignés sur le même helper | Fait |
| Documentation `pages_site` clarifiée sur la route canonique du bloc 00 | Fait |

### Blocs 02 à 05

Ce lot couvre la première vague de cohérence des blocs métier et de navigation visible. Les pages secondaires non encore alignées restent suivies dans `documentation/pages_site/INDEX.md`.

| Livrable | Statut |
|---|---|
| Affiner `hero` et `card` pour Agir, Cartographie/Impact, Réseau, Apprendre | Fait |
| Migrer des pages pilotes par bloc | Fait |
| Aligner `INDEX.md` et les fiches `pages_site` sur `PageFamilyId` | Fait |

### Familles autonomes 06 à 10

| Livrable | Statut |
|---|---|
| Auth & onboarding stabilisés comme famille autonome | À maintenir |
| Legal / institutionnel cadré sur une palette neutre | À stabiliser |
| Système & utilitaires documentés comme pages standalone, erreurs et dynamiques | À stabiliser |
| Admin & print traités comme familles autonomes | À stabiliser |

### Cartes métier et layouts composites

| Livrable | Statut |
|---|---|
| Inventaire des cartes hors `RubriqueCard` | À faire |
| Décision sur des tokens `panel` / `kpi` / `stat` | À faire |
| Migration progressive ou documentation d'un legacy local | À faire |

### Gouvernance et outillage

| Livrable | Statut |
|---|---|
| Tests unitaires sur `resolvePageFamily` et les exceptions | À faire |
| Règles de revue pour interdire les gradients de bloc en dur sur les routes migrées | À faire |
| Vérification route codée ↔ `PageFamilyId` | À faire |

---

## Critères de fin

Un bloc est considéré comme migré quand :

1. Toutes ses routes résolvent vers la bonne `PageFamilyId`, sauf exceptions documentées.
2. Chaque page migrée utilise `PageHeader` (ou l'alias `PageHero`) ou `SectionShell` sans classe hero en dur.
3. Les cartes standard passent par `FamilyRubriqueCard` ou un `pageFamily` explicite.
4. Aucun nouveau `linear-gradient` spécifique au bloc n'est ajouté dans les `page.tsx` du bloc.
5. La fiche `routes/.../README.md` et la colonne palette de `INDEX.md` sont à jour.

---

## Bénéfices attendus

- Une lecture claire des 11 types de routes et de leur niveau de traitement.
- Un fichier par bloc pour fond + hero, puis cartes standard.
- Des exceptions explicites au lieu de cas dispersés dans les pages.
- Une doc et un code alignés entre `pages_site`, la charte couleur et `resolvePageFamily`.
- Une migration incrémentale sans refonte globale.

---

## Limites connues

Ces points sont documentés pour éviter qu'ils soient oubliés. Ils ne sont pas tous traités par les phases actuelles.

### Coexistence de plusieurs systèmes couleur

Symptôme :

- `page-families`
- `block-accents`
- `RubriqueTheme`
- `BLOCK_THEME`
- classes Tailwind en dur

Piste :

- déprécier `block-accents` au profit de `PageFamilyId` + sous-variantes ;
- mapper `RubriqueTheme` vers `family.card.rubriqueTheme` pendant la transition ;
- garder `BLOCK_THEME` comme exception locale documentée.

### Cartes métier et layouts spécifiques

Symptôme :

- KPI pilotage ;
- panneaux dashboard ;
- cartes observatoire ;
- grilles admin ;
- composants encore colorés en dur.

Piste :

- ajouter `family.panel`, `family.kpi`, `family.stat` ;
- créer des wrappers dédiés ou des variants de composants existants ;
- inventorier les routes concernées dans `pages_site`.

### Boutons et liens d'action

Symptôme :

- la logique des boutons dépend encore d'autres thèmes que la famille complète.

Piste :

- étendre la définition de famille avec des tokens bouton ;
- vérifier la cohérence entre fond, carte et action principale.

### Sections dynamiques

Symptôme :

- la couleur peut dépendre du `sectionId`, pas seulement du pathname.

Piste :

- faire passer un contexte de section à `resolvePageFamily` ;
- ou documenter des sous-familles explicites.

### Dérive des exceptions

Symptôme :

- la liste des overrides peut grossir sans gouvernance.

Piste :

- limiter le nombre d'exceptions par release ;
- rattacher chaque exception à une fiche `pages_site`.

### Homepage et marketing

Symptôme :

- la homepage reste une famille séparée.

Piste :

- maintenir une séparation volontaire entre homepage et bloc 01 ;
- documenter ce choix dans l'index.

---

## Carte de migration par type

| Type | Couverture attendue | Exemples de routes | Remarque |
|---|---|---|---|
| 00 Homepage | autonome | `/`, `/accueil` | hors bloc |
| 01 Accueil & Pilotage | famille bloc | `/dashboard`, `/profil` (alias), `/pilotage`, `/profil/[profile]`, `/sponsor-portal`, `/explorer`, `/parcours` | cockpit personnel fusionné, exceptions UI et profils détaillés |
| 02 Agir | famille bloc | `/actions/new`, `/actions/history`, `/signalement`, `/missions/[id]`, `/sections/route`, `/declaration` | famille métier orientée action |
| 03 Cartographie & Impact | famille bloc | `/actions/map`, `/methodologie`, `/gamification`, `/observatoire`, `/profil/impact`, `/reports`, `/sandbox` | deux sous-teintes logiques sky / red |
| 04 Réseau & Discussions | famille bloc | `/community`, `/sections/feedback`, `/messagerie`, `/open-data`, `/partners/*` | palette indigo / pink selon les sous-espaces |
| 05 Apprendre | famille bloc | `/learn/*` | palette yellow + amber |
| 06 Auth & Onboarding | autonome | `/sign-in`, `/sign-up`, `/onboarding`, `/onboarding/localisation` | charte auth dédiée |
| 07 Institutionnel & Légal | autonome | `/contact`, `/conditions-*`, `/mentions-legales`, `/politique-*`, `/en` | sobriété prioritaire |
| 08 Système & Utilitaires | autonome | `/form-comparison`, `/preview/actions/new`, `/declaration-simple`, `/reglages`, `/error/429`, `/sections/[sectionId]` | inclut les états et dynamiques utilitaires |
| 09 Admin & Super-admin | autonome | `/admin/*` | accès restreint |
| 10 Print & Export | autonome | `/prints/report` | contraintes de lisibilité et d'impression |

---

## Fichiers clés

| Rôle | Chemin |
|---|---|
| Plan principal | `documentation/pages_site/PAGE_FAMILIES_PLAN.md` |
| Guide court | `documentation/development/PAGE_FAMILIES.md` |
| Index des routes | `documentation/pages_site/INDEX.md` |
| Charte produit | `documentation/design-system/BLOC_COLOR_SYSTEM_PREMIUM.md` |
| Registre code | `apps/web/src/lib/ui/page-families/` |
| Hero UI | `apps/web/src/components/ui/page-hero.tsx` |
| Carte UI | `apps/web/src/components/ui/family-rubrique-card.tsx` |
| Fond global | `apps/web/src/components/ui/vibrant-background.tsx` |

---

## Journal de trace

| Date | Action |
|---|---|
| Session 1 | Phases 0–1 : registre `page-families`, `PageHeader` (alias `PageHero`), `SectionShell`, migration bloc 01, exception `/explorer`. |
| Session 5 | Centralisation exhaustive des routes canoniques du bloc 01 via `lib/accueil-pilotage-routes.ts`. |
| Session 4 | Reclassification de `/methodologie` vers le bloc 03 Cartographie & Impact et alignement documentaire associé. |
| Session 2 | Phase 2 : `PageFamilyCardTokens`, `card-presets.ts`, `FamilyRubriqueCard`, migration `/profil/[profile]`. |
| Session 3 | Correction `ADMIN_CARD` dans `card-presets.ts`. Pilote phase 3 : `/signalement` → `FamilyRubriqueCard`, gradient hero retiré. |

---

## État de migration par type

| Type | État actuel | Priorité |
|---|---|---|
| 00 Homepage | documentée, indépendante | faible |
| 01 Accueil & Pilotage | famille stabilisée, dashboard canonique + alias profil | moyenne |
| 02 Agir | pilote en cours | critique |
| 03 Cartographie & Impact | plusieurs routes à valider | critique |
| 04 Réseau & Discussions | encore hétérogène | critique |
| 05 Apprendre | à homogénéiser (fond jaune, cartes amber/orange) | moyenne |
| 06 Auth & Onboarding | stable | faible |
| 07 Institutionnel & Légal | à stabiliser | moyenne |
| 08 Système & Utilitaires | à cadrer route par route | critique |
| 09 Admin & Super-admin | à cadrer | moyenne |
| 10 Print & Export | à cadrer | critique |

---

## Prochaine action recommandée

1. Valider visuellement bloc 01 et le pilote bloc 02 (`/signalement`, `/dashboard`).
2. Compléter le cadrage des familles autonomes 06 à 10.
3. Migrer `/actions/new` ou `/actions/map` comme second pilote.
4. Prioriser ensuite les cartes métier et les sections dynamiques.
