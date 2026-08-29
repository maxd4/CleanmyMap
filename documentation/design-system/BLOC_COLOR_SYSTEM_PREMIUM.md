# BLOC_COLOR_SYSTEM_PREMIUM — Système de couleurs par bloc

> Référence visuelle : page sommaire (`/`) et `apps/web/src/components/accueil/accueil-pillars.tsx`
> Référence code : `apps/web/src/lib/accueil/config.ts`
> Typographie et géométrie du titre de page : [`PAGE_HEADER.md`](./PAGE_HEADER.md)

**Logique générale :**
- Fond de page = teinte claire/lumineuse de la couleur du bloc
- Cartes et bulles = surfaces à contraste élevé dérivées de la couleur canonique du bloc, pour ressortir nettement sur le fond
- Le **titre et le sous-titre de page** conservent toujours la typographie canonique `PageHeader`; ce document ne fait varier que leur couleur par famille
- Les titres / chiffres **internes aux cartes sombres** peuvent employer la teinte d'accent adaptée au bloc
- Texte réellement conçu comme blanc = blanc exact `#FFFFFF` / `text-white`; une opacité réduite n'est permise que pour une exception sémantique explicite (placeholder, disabled, hiérarchie secondaire réellement voulue)
- Texte réellement conçu comme noir = noir exact `#000000` / `text-black`; une teinte `slate` ou `stone` reste autorisée lorsqu'elle constitue intentionnellement une couleur de famille et non un substitut au noir
- Bordures cartes = `border-[accent]-200/18`, hover `border-[accent]-200/38`

**⚠️ NOUVELLE STRUCTURE (5 blocs homepage) :**
- Certains blocs ont **plusieurs teintes directrices** selon le type de page
- Exemple : "Cartographie & Impact" = sky (carto) + red/rose (impact)
- **Bloc 01 Accueil & Pilotage** : palette **orange + brun combinés** sur chaque page (fond + titre/sous-titre). Ce n'est pas un choix « orange OU brun » par route.

---

## Récapitulatif rapide — 5 Blocs Homepage

| # | Bloc Homepage | Teintes directrices | Carte homepage | Usage |
|---|---------------|---------------------|----------------|-------|
| 01 | Accueil & Pilotage | `amber` / `orange` / `brun` (combinés) | `amber`/`orange` | Fond et titres de page en orange+brun ; cartes du sommaire `/explorer` inchangées |
| 02 | Agir | `emerald` | `emerald` | Toutes pages terrain |
| 03 | Cartographie & Impact | `sky` + `red` / `rose` | `sky` | Pages carto → sky, Pages impact → red / rose, `/methodologie` → rouge d'impact |
| 04 | Réseau & Discussions | `pink` + `indigo` | `pink` | Pages réseau / discussion → pink, Pages partenaires → indigo |
| 05 | Apprendre | `yellow` | `yellow` / `amber` | Toutes pages éducatives, fond jaune et cartes orange/ambre |

**Blocs système (non homepage) :**
- Impact (standalone) : `red` — fusionné dans "Cartographie & Impact"
- Discussion : `pink` — bloc discussion associé à `connect`
- Piloter : `amber`/`brun` — fusionné dans "Accueil & Pilotage"

**Familles autonomes hors 5 blocs :**
- Homepage autonome : `/`, `/accueil`
- Auth & Onboarding : `/sign-in`, `/sign-up`, `/onboarding`, `/onboarding/localisation`
  - fond lavande clair vers vert menthe clair
  - carte Clerk violet nuit / indigo foncé
  - accents verts uniquement pour validation
  - boutons inchangés, régis par la charte bouton existante
- Institutionnel & Légal : `/contact`, `/conditions-*`, `/mentions-legales`, `/politique-*`, `/en`
  - palette slate / gris clair / blanc
  - pas d esthétique marketing blocks
  - `LegalSection` comme brique commune possible
- Système & Utilitaires : `/reglages`, `/form-comparison`, `/declaration-simple`, `/preview/actions/new`, `/error/429`
  - mood layer autonome par usage, jamais couleur de bloc
- Admin & Super-admin : `/admin`, `/admin/forms`, `/admin/services`, `/admin/godmode`
- Print & Export : `/prints/report`
  - ambiance documentaire autonome
- États système:
  - erreur critique -> `red`
  - quota / limite / attention -> `amber`
  - loading -> `slate`
  - empty state -> `slate` doux
  - access refused -> `slate` + léger `red` / `orange`
  - architecture commune: `SystemStateLayout`, `SystemStateIcon`, `SystemStateTitle`, `SystemStateDescription`, `SystemStateAction`, `SystemStateMeta`

---

## En-tête canonique des pages

La source de vérité de la **structure, de la taille, de la graisse, du line-height, du tracking, de la largeur et du comportement responsive** du titre / sous-titre est exclusivement :

```txt
documentation/design-system/PAGE_HEADER.md
```

Ce document de couleurs ne doit pas redéfinir ces métriques.

**Règle obligatoire :**
- tout titre principal de page visible utilise `PageHeader`, sauf shell système explicitement documenté ;
- toutes les pages partagent exactement la même typographie titre / sous-titre ;
- seules la **couleur** et la **position** peuvent varier ;
- couleur → `family`, ou `tone` / `contrast` pour une surface autonome ;
- position → `align="left"` ou `align="center"` ;
- aucune famille ne peut introduire sa propre taille, graisse, tracking, line-height ou largeur de H1 ;
- `PageHeader` est l'unique composant runtime pour les titres principaux de page ;
- `eyebrow`, `badge` et `badges` ne font plus partie du contrat runtime.

**Tons disponibles dans `PageHeader`**

| Tone | Usage canonique |
|---|---|
| `emerald` | pages Agir |
| `sky` | pages Cartographie |
| `red` | pages Impact |
| `pink` | pages Réseau / discussion |
| `indigo` | pages partenaires / surfaces relationnelles |
| `yellow` | pages Apprendre |
| `slate` | surfaces système, légales ou neutres |
| `stone` | fallback neutre par défaut |

**Couleurs par bloc**

| Bloc / famille | Couleur canonique à lire via `family` | Remarque |
|---|---|---|
| Accueil & Pilotage | `amber` / `orange` pour l'accueil, `amber` / `brun` pour le pilotage | utiliser `family` plutôt que `tone` |
| Agir | `emerald` | blocs terrain |
| Cartographie & Impact | `sky` pour la cartographie, `red` / `rose` pour l'impact | `/methodologie` reste rattachée à l'impact |
| Réseau & Discussions | `pink` / `indigo` | `pink` pour discussion, `indigo` pour partenaires |
| Apprendre | `yellow` / `amber` | fond jaune, cartes soleil/ambre |
| Institutionnel & Légal | `slate` | palette juridique neutre |
| Familles autonomes | `slate`, `stone` ou palette dédiée | auth, system, admin, print |

**Règle de position**
- `left` par défaut ;
- `center` uniquement si la fiche canonique de page ou `UI_EXCEPTION_PAGES.md` le documente ;
- titre et sous-titre se déplacent ensemble ;
- aucun positionnement ne modifie leur typographie.

---

## 01 — Bloc Accueil & Pilotage · Orange + brun (combinés)

```
fond page     : canvas #edd4b0 + dégradés orange (249,115,22) et brun (120,53,15 / 92,45,12)
fond cartes   : inchangé hors scope (cartes sommaire / cartes métier conservent leurs surfaces)
PageHeader    : couleurs issues de la famille accueil-pilotage, typographie canonique inchangée
accents       : halos orange + brun simultanés (pas de bascule exclusive par route)
```

**Pages concernées (fond + titre/sous-titre unifiés) :**
- `/dashboard`, `/profil`, `/profil/[profile]`, `/parcours`, `/parcours/[profile]`
- `/pilotage`, `/sponsor-portal`, `/elus`

**Exceptions :**
- `/explorer` — Sommaire : fond `yellow` ; **cartes du sommaire non modifiées**
- `/methodologie` — Rouge d'impact

---

## 02 — Bloc Agir · `emerald`

```
fond page                 : vert clair lumineux (radial-gradient emerald)
fond cartes               : #06261c (sombre teinté vert)
bordure                    : border-emerald-200/18  hover: border-emerald-200/38
ombre                      : shadow-[0_34px_76px_-34px_rgba(7,44,27,0.72)]
PageHeader                 : couleurs `agir`, typographie canonique inchangée
titres / chiffres de carte: text-emerald-100
texte blanc de carte      : text-white
point accent               : bg-emerald-300
```

---

## 03 — Bloc Cartographie & Impact · Multi-teintes

### Pages type Cartographie · `sky`

```
fond page                 : bleu clair lumineux (radial-gradient sky)
fond cartes               : #071827 (sombre teinté bleu)
bordure                    : border-sky-200/18  hover: border-sky-200/38
ombre                      : shadow-[0_34px_76px_-34px_rgba(7,27,44,0.72)]
PageHeader                 : couleurs cartographie `sky`, typographie canonique inchangée
titres / chiffres de carte: text-sky-100
texte blanc de carte      : text-white
point accent               : bg-sky-300
```

---

### Pages type Impact · `red`

```
fond page                 : rouge clair lumineux (radial-gradient red)
fond cartes               : #3b0a0f (sombre teinté rouge)
bordure                    : border-red-200/18  hover: border-red-200/38
ombre                      : shadow-[0_34px_76px_-34px_rgba(44,7,15,0.72)]
PageHeader                 : couleurs impact `red` / `rose`, typographie canonique inchangée
titres / chiffres de carte: text-red-100
texte blanc de carte      : text-white
point accent               : bg-red-300
```

---

**Pages concernées :**
- `/reports` — Rapports d'impact
- `/sections/gamification` — Gamification (badges, progression, alias `/gamification`)

---

## 04 — Bloc Réseau & Discussions · `pink` / `indigo`

```
fond page                 : rose clair lumineux (radial-gradient pink)
fond cartes               : #490b38 (sombre teinté rose)
bordure                    : border-pink-200/18  hover: border-pink-200/38
ombre                      : shadow-[0_34px_76px_-34px_rgba(44,7,34,0.72)]
PageHeader                 : couleurs réseau `pink` ou partenaires `indigo`, typographie canonique inchangée
titres / chiffres de carte: text-pink-100
texte blanc de carte      : text-white
point accent               : bg-pink-300
```

---

## 05 — Bloc Apprendre · `yellow` / `amber`

```
fond page                 : jaune clair lumineux (radial-gradient yellow/amber)
fond cartes               : ambre/orange solaire sur blanc cassé
bordure                    : border-amber-200/18  hover: border-amber-200/38
ombre                      : shadow-[0_34px_76px_-34px_rgba(249,115,22,0.24)]
PageHeader                 : couleurs apprendre `yellow` / `amber`, typographie canonique inchangée
titres / chiffres de carte: text-amber-100 sur surface sombre appropriée
texte blanc de carte      : text-white uniquement lorsque la surface exige un texte blanc
point accent               : bg-amber-300
```

---

## Blocs système (non homepage)

### Pages type Réseau / Discussion · `pink`

```
fond page                 : rose clair lumineux (radial-gradient pink)
fond cartes               : #490b38 (sombre teinté rose)
bordure                    : border-pink-200/18  hover: border-pink-200/38
ombre                      : shadow-[0_34px_76px_-34px_rgba(44,7,34,0.72)]
PageHeader                 : couleurs réseau `pink`, typographie canonique inchangée
titres / chiffres de carte: text-pink-100
texte blanc de carte      : text-white
point accent               : bg-pink-300
```

**Pages concernées :**
- `/sections/community`
- `/sections/feedback`
- `/sections/messagerie`
- `/sections/open-data`
- écrans de discussion et d'échange associés

### Pages type Partenaires · `indigo`

```
fond page                 : indigo clair lumineux (radial-gradient indigo/violet)
fond cartes               : #04020f (sombre teinté indigo)
bordure                    : border-indigo-200/18  hover: border-indigo-200/38
ombre                      : shadow-[0_34px_76px_-34px_rgba(4,2,44,0.72)]
PageHeader                 : couleurs partenaires `indigo`, typographie canonique inchangée
titres / chiffres de carte: text-indigo-100
texte blanc de carte      : text-white
point accent               : bg-indigo-300
```

**Pages concernées :**
- `/partners/dashboard`
- `/sections/community`
- `/partners/onboarding`

---

## Tokens partagés (tous blocs)

```css
/* Arrondis */
rounded-[2rem]       /* hero / grosses cards */
rounded-2xl          /* cards standard */
rounded-full         /* pills / dots */

/* Backdrop */
backdrop-blur-xl     /* cartes sur fond lumineux */

/* Barre de couleur top */
bg-gradient-to-r from-[accent-500] via-[accent-400] to-[accent-300]  /* 3px */
```

---

## Règles pour agents IA

1. **En-tête canonique** : utiliser `PageHeader`; sa typographie et sa géométrie sont gouvernées uniquement par `PAGE_HEADER.md`.
2. **Variation du header** : seules la couleur (`family` / `tone` / `contrast`) et la position (`align`) peuvent varier entre pages.
3. **Fond de page** : teinte claire/lumineuse de la couleur du bloc, sauf famille autonome documentée.
4. **Cartes** : utiliser la surface canonique du bloc et éviter les styles isolés.
5. **Titres / chiffres internes** : les accents `text-[accent]-100` concernent les titres/chiffres de cartes ou de surfaces sombres, jamais une nouvelle variante de H1 de page.
6. **Texte blanc** : lorsqu'un texte est sémantiquement blanc, utiliser `text-white` à 100 %. Toute opacité réduite doit correspondre à un état ou niveau de hiérarchie explicitement voulu.
7. **Texte noir** : lorsqu'un texte est sémantiquement noir, utiliser `text-black` à 100 %. Les `slate` / `stone` restent des couleurs intentionnelles de design et ne doivent pas être converties arbitrairement en noir.
8. **CTA primaire** : utiliser `CmmButton tone="primary"` et laisser le thème du bloc injecter les couleurs.
9. **CTA secondaire** : utiliser `CmmButton tone="secondary"` pour le CTA de soutien principal du bloc.
10. **CTA tertiaire** : utiliser `CmmButton tone="tertiary"` pour les actions de bas de hiérarchie ou les liens contextuels.
11. **Multi-teintes** : certains blocs ont plusieurs teintes selon le type de page ; vérifier le mapping rubrique → teinte.
12. **Référence** : vérifier `PAGE_HEADER.md`, `accueil-pillars.tsx`, `navigation.ts`, `documentation/product/matrice-rubriques.md` et `documentation/architecture/traceability-matrix.md` avant d'implémenter une évolution de palette ou de header.

---

## Mapping Rubrique → Teinte

### Bloc "Accueil & Pilotage"
- `/dashboard`, `/profil` → `amber`/`orange`
- `/pilotage`, `/sponsor-portal`, `/elus` → `amber`/`brun`
- `/explorer` → exception validée, palette Sommaire conservée
- `/methodologie` → exception validée, palette rouge d'impact conservée

### Familles autonomes
- Auth & Onboarding (`/sign-in`, `/sign-up`, `/onboarding`, `/onboarding/localisation`) → `auth`
- Institutionnel & Légal (`/contact`, `/conditions-*`, `/mentions-legales`, `/politique-*`, `/en`) → `legal`
- Système & Utilitaires (`/reglages`, `/form-comparison`, `/declaration-simple`, `/preview/actions/new`, `/error/429`) → `system` avec mood layer autonome par usage
- Admin & Super-admin (`/admin`, `/admin/forms`, `/admin/services`, `/admin/godmode`) → `admin`
- Print & Export (`/prints/report`) → `print` documentaire autonome

### Bloc "Cartographie & Impact"
- `/actions/map` → `sky`
- `/reports`, `/sections/gamification` → `red` / `rose`

### Autres blocs (teinte unique)
- Agir → `emerald`
- Réseau & Discussions → `pink` / `indigo` (réseau/discussion vs partenaires)
- Apprendre → `yellow` / `amber` (`/learn/bonnes-pratiques`, `/learn/comprendre`, `/learn/sentrainer`, `/learn/ecole`)
