# BLOC_COLOR_SYSTEM_PREMIUM — Système de couleurs par bloc

> Référence visuelle : page sommaire (`/`) et `apps/web/src/components/accueil/accueil-pillars.tsx`
> Référence code : `apps/web/src/lib/accueil/config.ts`

**Logique générale :**
- Fond de page = teinte claire/lumineuse de la couleur du bloc
- Cartes et bulles = fond sombre teinté dans la même couleur, pour ressortir sur le fond
- Titres / chiffres / sous-titres = colorés dans l'accent (`text-[accent]-100`)
- Textes = blanc a 100% par defaut (`text-white`). Opacite reduite uniquement en exception justifiee (placeholder, etat desactive, hierarchie secondaire explicite)
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
| 05 | Apprendre | `yellow` | `yellow` | Toutes pages éducatives |

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

## 01 — Bloc Accueil & Pilotage · Orange + brun (combinés)

```
fond page     : canvas #edd4b0 + dégradés orange (249,115,22) et brun (120,53,15 / 92,45,12)
fond cartes   : inchangé hors scope (cartes sommaire / cartes métier conservent leurs surfaces)
titres page   : text-stone-950 + eyebrow text-orange-950/85
sous-titres   : text-stone-800/90
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
fond page     : vert clair lumineux (radial-gradient emerald)
fond cartes   : #06261c (sombre teinté vert)
bordure       : border-emerald-200/18  hover: border-emerald-200/38
ombre         : shadow-[0_34px_76px_-34px_rgba(7,44,27,0.72)]
texte titres  : text-emerald-100
texte corps   : text-white / text-white/80
dot accent    : bg-emerald-300
```

---

## 03 — Bloc Cartographie & Impact · Multi-teintes

### Pages type Cartographie · `sky`

```
fond page     : bleu clair lumineux (radial-gradient sky)
fond cartes   : #071827 (sombre teinté bleu)
bordure       : border-sky-200/18  hover: border-sky-200/38
ombre         : shadow-[0_34px_76px_-34px_rgba(7,27,44,0.72)]
texte titres  : text-sky-100
texte corps   : text-white / text-white/80
dot accent    : bg-sky-300
```

---

### Pages type Impact · `red`

```
fond page     : rouge clair lumineux (radial-gradient red)
fond cartes   : #3b0a0f (sombre teinté rouge)
bordure       : border-red-200/18  hover: border-red-200/38
ombre         : shadow-[0_34px_76px_-34px_rgba(44,7,15,0.72)]
texte titres  : text-red-100
texte corps   : text-white / text-white/80
dot accent    : bg-red-300
```

---

**Pages concernées :**
- `/reports` — Rapports d'impact
- `/sections/gamification` — Gamification (badges, progression, alias `/gamification`)

---

## 04 — Bloc Réseau & Discussions · `pink` / `indigo`

```
fond page     : rose clair lumineux (radial-gradient pink)
fond cartes   : #490b38 (sombre teinté rose)
bordure       : border-pink-200/18  hover: border-pink-200/38
ombre         : shadow-[0_34px_76px_-34px_rgba(44,7,34,0.72)]
texte titres  : text-pink-100
texte corps   : text-white / text-white/80
dot accent    : bg-pink-300
```

---

## 05 — Bloc Apprendre · `yellow`

```
fond page     : jaune clair lumineux (radial-gradient yellow/amber)
fond cartes   : #241f00 (sombre teinté jaune)
bordure       : border-yellow-200/18  hover: border-yellow-200/38
ombre         : shadow-[0_34px_76px_-34px_rgba(36,31,0,0.72)]
texte titres  : text-yellow-100
texte corps   : text-white / text-white/80
dot accent    : bg-yellow-300
```

---

---

## Blocs système (non homepage)

### Pages type Réseau / Discussion · `pink`

```
fond page     : rose clair lumineux (radial-gradient pink)
fond cartes   : #490b38 (sombre teinté rose)
bordure       : border-pink-200/18  hover: border-pink-200/38
ombre         : shadow-[0_34px_76px_-34px_rgba(44,7,34,0.72)]
texte titres  : text-pink-100
texte corps   : text-white / text-white/80
dot accent    : bg-pink-300
```

**Pages concernées :**
- `/sections/community`
- `/sections/feedback`
- `/sections/messagerie`
- `/sections/open-data`
- écrans de discussion et d'échange associés

### Pages type Partenaires · `indigo`

```
fond page     : indigo clair lumineux (radial-gradient indigo/violet)
fond cartes   : #04020f (sombre teinté indigo)
bordure       : border-indigo-200/18  hover: border-indigo-200/38
ombre         : shadow-[0_34px_76px_-34px_rgba(4,2,44,0.72)]
texte titres  : text-indigo-100
texte corps   : text-white / text-white/80
dot accent    : bg-indigo-300
```

**Pages concernées :**
- `/partners/dashboard`
- `/partners/network`
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

1. **Fond de page** : teinte claire/lumineuse de la couleur du bloc — jamais neutre ou gris
2. **Cartes** : fond sombre teinté, `backdrop-blur-xl`, bordure `[accent]-200/18`
3. **Titres / chiffres** : `text-[accent]-100`, `font-black`
4. **Textes** : `text-white` a 100% par defaut. Opacite reduite uniquement en exception justifiee (placeholder, etat desactive, hierarchie secondaire explicite).
5. **CTA primaire** : gradient ou fond solide dans l'accent, ombre portée dans la teinte
6. **CTA secondaire** : `bg-white/10 hover:bg-white/16`, texte blanc
7. **Multi-teintes** : Certains blocs ont plusieurs teintes selon le type de page — vérifier le mapping rubrique → teinte
8. **Référence** : toujours vérifier `accueil-pillars.tsx`, `navigation.ts`, `documentation/product/matrice-rubriques.md` et `documentation/architecture/traceability-matrix.md` avant d'implémenter

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
- `/actions/map`, `/sections/sandbox` → `sky`
- `/reports`, `/sections/gamification` → `red` / `rose`

### Autres blocs (teinte unique)
- Agir → `emerald`
- Réseau & Discussions → `pink` / `indigo` (réseau/discussion vs partenaires)
- Apprendre → `yellow`
