# Teintes Dominantes — Blocs et Rubriques CleanMyMap

> Comparatif entre les teintes théoriques (charte design) et les teintes réelles (implémentation code)
> **Restructuration récente** : La homepage affiche 5 blocs principaux avec **plusieurs teintes directrices par bloc**

---

## Logique Multi-Teintes

**Principe** : Chaque bloc peut avoir plusieurs teintes directrices selon le type de page/rubrique.

Exemple : Bloc "Accueil & Pilotage"
- Pages d'**accueil** → `amber` / `orange` (chaleur, reprise d'activité)
- Pages de **pilotage** → `amber` / `brun` (sérieux, gouvernance)

---

## Vue d'ensemble — 5 Blocs Homepage

| # | Bloc Homepage | Teintes directrices | Teinte carte homepage | Statut |
|---|---------------|---------------------|----------------------|--------|
| 01 | Accueil & Pilotage | `amber`/`orange` (accueil) + `amber`/`brun` (pilotage) | `amber` / `orange` | ✅ Conforme |
| 02 | Agir | `emerald` | `emerald` | ✅ Conforme |
| 03 | Cartographie & Impact | `sky` (carto) + `red`/`rose` (impact) | `sky` | ✅ Conforme |
| 04 | Réseau & Discussions | `indigo` / `violet` | `indigo` | ✅ Conforme |
| 05 | Apprendre | `yellow` | `yellow` | ✅ Conforme |

**Note** : Les blocs "Impact" (standalone), "Discussion" (`connect`) et "Piloter" existent dans le système de navigation mais ne sont PAS affichés sur la homepage.

---

## Détail par Bloc

### 01 — Bloc Accueil & Pilotage

**Teintes directrices** : 
- **Accueil** : `amber` / `orange` (chaleur, reprise d'activité)
- **Pilotage** : `amber` / `brun` (sérieux, gouvernance)

**Teinte carte homepage** : `amber` / `orange`  
**Statut** : ✅ Conforme (carte homepage) | ⚠️ À vérifier (rubriques)

**Implémentation carte homepage** :
- Fond page : `#b45309` + radial-gradient amber/orange
- Fond cartes : `#431407` (sombre teinté orange)
- Bordure : `border-orange-200/18`
- Texte titres : `text-orange-100`
- Référence code : `apps/web/src/lib/accueil/config.ts`
- Background gradient : `linear-gradient(135deg, #431407 0%, #7c2d12 52%, #a16207 100%)`

**Rubriques par type** :

#### Pages type Accueil (teinte `amber` / `orange`)

| Rubrique | Route | Teinte théorique | Teinte réelle | Statut |
|----------|-------|------------------|---------------|--------|
| Tableau de bord | `/dashboard` | `amber` / `orange` | `white` (mode clair) | ⚠️ À aligner |
| Explorer | `/explorer` | `amber` / `orange` | — | ❓ À vérifier |
| Profil & impact | `/profil` | `amber` / `orange` | — | ❓ À vérifier |
| Feedback | `/feedback` | `amber` / `orange` | — | ❓ À vérifier |

#### Pages type Pilotage (teinte `amber` / `brun`)

| Rubrique | Route | Teinte théorique | Teinte réelle | Statut |
|----------|-------|------------------|---------------|--------|
| Vue Pilotage | `/pilotage` | `amber` / `brun` | — | ❓ À vérifier |
| Administration | `/admin` | `amber` / `brun` | — | ❓ À vérifier |
| Sponsor Portal | `/sponsor-portal` | `amber` / `brun` | — | ❓ À vérifier |
| Élus | `/elus` | `amber` / `brun` | — | ❓ À vérifier |
| God Mode | `/admin/godmode` | `amber` / `brun` | — | ❓ À vérifier |

**Implémentation théorique pages Pilotage** :
- Fond page : brun-orangé dense (radial-gradient amber/stone)
- Fond cartes : `#2c1c0f` (sombre teinté brun)
- Bordure : `border-stone-400/18` hover: `border-stone-300/38`
- Texte titres : `text-orange-100`
- Référence : `BLOC_COLOR_SYSTEM_PREMIUM.md` section "09 — Bloc Piloter"

**Dette identifiée** :
- `/dashboard` utilise `bg-white/60` (mode clair) au lieu de `bg-slate-900/40 backdrop-blur-xl` (charte dark)
- Pages pilotage : vérifier si teinte brun est appliquée ou si elles utilisent amber/orange par défaut

---

### 02 — Bloc Agir

**Teinte théorique** : `emerald`  
**Teinte réelle** : `emerald`  
**Statut** : ✅ Conforme

**Implémentation** :
- Fond page : vert clair lumineux (radial-gradient emerald)
- Fond cartes : `#06261c` (sombre teinté vert)
- Bordure : `border-emerald-200/18`
- Texte titres : `text-emerald-100`
- Référence code : `apps/web/src/lib/accueil/config.ts`
- Background gradient : `linear-gradient(135deg, #06261c 0%, #0f3b2b 52%, #14532d 100%)`

**Rubriques** :

| Rubrique | Route | Teinte théorique | Teinte réelle | Statut |
|----------|-------|------------------|---------------|--------|
| Déclarer une action | `/actions/new` | `emerald` | — | ❓ À vérifier |
| Déclaration simple | `/declaration-simple` | `emerald` | — | ❓ À vérifier |
| Carte des actions | `/actions/map` | `emerald` | — | ❓ À vérifier |
| Signalement déchets | `/signalement` | `emerald` | — | ❓ À vérifier |
| Itinéraire IA | `/sections/route` | `emerald` | — | ❓ À vérifier |
| Météo | `/sections/[sectionId]` (meteo) | `emerald` | — | ❓ À vérifier |
| Historique actions | `/actions/history` | `emerald` | — | ❓ À vérifier |
| Kit terrain / guide | `/sections/[sectionId]` | `emerald` | — | ❓ À vérifier |

---

### 03 — Bloc Cartographie & Impact

**Teintes directrices** : 
- **Cartographie** : `sky` (lecture spatiale, exploration)
- **Impact** : `red` (preuve, progression, métriques)

**Teinte carte homepage** : `sky`  
**Statut** : ✅ Conforme (carte homepage) | ⚠️ À vérifier (rubriques)

**Implémentation carte homepage** :
- Fond page : bleu clair lumineux (radial-gradient sky)
- Fond cartes : `#071827` (sombre teinté bleu)
- Bordure : `border-sky-200/18`
- Texte titres : `text-sky-100`
- Référence code : `apps/web/src/lib/accueil/config.ts`
- Background gradient : `linear-gradient(135deg, #071827 0%, #0c2940 52%, #0f4c6e 100%)`

**Note importante** : Ce bloc fusionne "Cartographie" (visualize) et "Impact". Les rubriques utilisent des teintes différentes selon leur fonction.

**Rubriques par type** :

#### Pages type Cartographie (teinte `sky`)

| Rubrique | Route | Teinte théorique | Teinte réelle | Statut |
|----------|-------|------------------|---------------|--------|
| Carte des actions | `/actions/map` | `sky` | `sky` | ✅ Présent |
| Sandbox | `/sandbox` | `sky` | `sky` | ✅ Alias vers `/sections/sandbox` |

#### Pages type Impact (teinte `red`)

| Rubrique | Route | Teinte théorique | Teinte réelle | Statut |
|----------|-------|------------------|---------------|--------|
| Rapports d'impact | `/reports` | `red` | `red / rose` | ✅ Présent |
| Gamification | `/gamification` | `red` | `red / rose` | ✅ Alias vers `/sections/gamification` |

**Implémentation théorique pages Impact** :
- Fond page : rouge clair lumineux (radial-gradient red)
- Fond cartes : `#3b0a0f` (sombre teinté rouge)
- Bordure : `border-red-200/18` hover: `border-red-200/38`
- Texte titres : `text-red-100`
- Référence : `BLOC_COLOR_SYSTEM_PREMIUM.md` section "05 — Bloc Impact"

**Dette identifiée** :
- Vérifier l'unification visuelle des pages impact avec les autres surfaces `red / rose` du bloc, sans casser les exceptions de style déjà validées

---

### 04 — Bloc Réseau & Discussions

**Teinte théorique** : `indigo` / `violet`  
**Teinte réelle** : `indigo`  
**Statut** : ✅ Conforme

**Implémentation** :
- Fond page : indigo clair lumineux (radial-gradient indigo/violet)
- Fond cartes : `#04020f` (sombre teinté indigo)
- Bordure : `border-indigo-200/18`
- Texte titres : `text-indigo-100`
- Référence code : `apps/web/src/lib/accueil/config.ts`
- Background gradient : `linear-gradient(135deg, #04020f 0%, #120824 52%, #312e81 100%)`

**Rubriques** :

| Rubrique | Route | Teinte théorique | Teinte réelle | Statut |
|----------|-------|------------------|---------------|--------|
| Réseau partenaires | `/partners/network` | `indigo` / `violet` | — | ❓ À vérifier |
| Dashboard partenaire | `/partners/dashboard` | `indigo` / `violet` | — | ❓ À vérifier |
| Sponsor portal | `/sponsor-portal` | `indigo` / `violet` | — | ❓ À vérifier |
| Onboarding partenaire | `/partners/onboarding` | `indigo` / `violet` | — | ❓ À vérifier |

---

### 05 — Bloc Apprendre

**Teinte théorique** : `yellow`  
**Teinte réelle** : `yellow`  
**Statut** : ✅ Conforme

**Implémentation** :
- Fond page : jaune clair lumineux (radial-gradient yellow/amber)
- Fond cartes : `#241f00` (sombre teinté jaune)
- Bordure : `border-yellow-200/18`
- Texte titres : `text-yellow-100`
- Référence code : `apps/web/src/lib/accueil/config.ts`
- Background gradient : `linear-gradient(135deg, #241f00 0%, #4a3207 52%, #713f12 100%)`

**Rubriques** :

| Rubrique | Route | Teinte théorique | Teinte réelle | Statut |
|----------|-------|------------------|---------------|--------|
| Hub éducatif | `/learn/hub` | `yellow` | — | ❓ À vérifier |
| Comprendre | `/learn/comprendre` | `yellow` | — | ❓ À vérifier |
| S'entraîner | `/learn/sentrainer` | `yellow` | — | ❓ À vérifier |
| Bonnes pratiques | `/learn/bonnes-pratiques` | `yellow` | — | ❓ À vérifier |
| Ressources | `/learn/ressources` | `yellow` | — | ❓ À vérifier |

---

## Blocs Système (non affichés sur homepage)

### Bloc Impact (standalone)

**Teinte théorique** : `red`  
**Statut** : ⚠️ Défini dans navigation.ts mais non utilisé sur homepage

**Note** : Ce bloc existe dans le système de navigation (`navigation.ts`) mais n'a aucune rubrique assignée dans `PARCOURS_SPACE_PAGE_MAP`. Les fonctionnalités d'impact sont intégrées dans le bloc "Cartographie & Impact" (visualize).

---

### Bloc Échanges (connect)

**Teinte théorique** : `pink`  
**Statut** : ⚠️ Défini dans navigation.ts mais non utilisé

**Note** : Ce bloc existe dans le système de navigation (`navigation.ts`) mais n'a aucune rubrique assignée et n'apparaît pas sur la homepage.

---

### Bloc Piloter (pilot)

**Teinte théorique** : `amber` / `brun`  
**Statut** : ⚠️ Défini dans navigation.ts mais non utilisé sur homepage

**Note** : Ce bloc existe dans le système de navigation (`navigation.ts`) mais n'a aucune rubrique assignée. Les fonctionnalités de pilotage sont intégrées dans le bloc "Accueil & Pilotage" (home).

**Rubriques pilotage accessibles via "Accueil & Pilotage"** :
- Vue Pilotage (`/pilotage`)
- Administration (`/admin`)
- God Mode (`/admin/godmode`)
- Sponsor Portal (`/sponsor-portal`)
- Élus (`/elus`)

---

## Arborescence des teintes — 5 Blocs Homepage (Multi-Teintes)

```
CleanMyMap Homepage (/)
│
├── 01. Accueil & Pilotage (home)
│   ├── Teinte carte homepage: amber / orange ✅
│   │
│   ├── [Type Accueil] → amber / orange
│   │   ├── /dashboard → amber / orange (⚠️ actuellement white)
│   │   ├── /explorer → amber / orange ❓
│   │   ├── /profil → amber / orange ❓
│   │   └── /feedback → amber / orange ❓
│   │
│   └── [Type Pilotage] → amber / brun
│       ├── /pilotage → amber / brun ❓
│       ├── /admin → amber / brun ❓
│       ├── /sponsor-portal → amber / brun ❓
│       ├── /elus → amber / brun ❓
│       └── /admin/godmode → amber / brun ❓
│
├── 02. Agir (act)
│   ├── Teinte: emerald ✅
│   ├── /actions/new → emerald ❓
│   ├── /sections/route → emerald ❓
│   ├── /sections/weather → emerald ❓
│   ├── /sections/guide → emerald ❓
│   └── /trash-spotter → emerald ❓
│
├── 03. Cartographie & Impact (visualize)
│   ├── Teinte carte homepage: sky ✅
│   │
│   ├── [Type Cartographie] → sky
│   │   ├── /actions/map → sky ❓
│   │   └── /sandbox → sky ✅ alias `/sections/sandbox`
│   │
│   └── [Type Impact] → red / rose
│       ├── /reports → red / rose ✅
│       └── /gamification → red / rose ✅ alias `/sections/gamification`
│
├── 04. Réseau & Discussions (network)
│   ├── Teinte: indigo ✅
│   ├── /partners/network → indigo ❓
│   ├── /community → indigo ✅ alias `/sections/community`
│   ├── /messagerie → indigo ✅ alias `/sections/messagerie`
│   └── /open-data → indigo ✅ alias `/sections/open-data`
│
└── 05. Apprendre (learn)
    ├── Teinte: yellow ✅
    ├── /learn/hub → yellow ❓
    ├── /learn/comprendre → yellow ❓
    ├── /learn/sentrainer → yellow ❓
    ├── /learn/bonnes-pratiques → yellow ❓
    └── /learn/ressources → yellow ❓


Blocs système (non homepage):
├── Impact (impact) → aucune rubrique assignée (fusionné dans visualize)
├── Échanges (connect) → aucune rubrique assignée
└── Piloter (pilot) → aucune rubrique assignée (fusionné dans home)
```

---

## Synthèse des incohérences détectées

### ℹ️ Informations

2. **Restructuration confirmée** : 5 blocs sur homepage avec logique multi-teintes
   - Blocs fusionnés : "Accueil & Pilotage" = amber/orange (accueil) + amber/brun (pilotage)
   - Blocs fusionnés : "Cartographie & Impact" = sky (carto) + red (impact)
   - Blocs non utilisés : "Impact" (standalone), "Échanges", "Piloter" existent dans navigation.ts mais sans rubriques assignées

3. **Logique multi-teintes par bloc** : Normale et intentionnelle
   - Exemple : Bloc "Accueil & Pilotage" utilise 2 teintes selon le type de page
   - Pages accueil → amber/orange (chaleur, reprise)
   - Pages pilotage → amber/brun (sérieux, gouvernance)

### ❓ À vérifier

4. **Rubriques individuelles** : Teintes réelles non vérifiées (marquées ❓)
   - Action : Audit page par page pour confirmer conformité avec la teinte appropriée
   - Priorité : Vérifier que les pages pilotage utilisent bien le brun et non l'orange
   - Priorité : Vérifier que les pages impact utilisent bien le rouge et non le sky

---

## Recommandations

1. **Priorité 1** : Aligner `/dashboard` sur la charte dark avec teinte amber/orange
2. **Priorité 2** : Auditer les pages pilotage (`/pilotage`, `/admin`, `/elus`, etc.) pour vérifier teinte brun
3. **Priorité 3** : Confirmer les surfaces `red / rose` sur `/reports` et `/gamification` après le déplacement des alias
4. **Priorité 4** : Créer un tableau de mapping "rubrique → teinte" pour documenter la logique multi-teintes
5. **Priorité 5** : Mettre à jour `BLOC_COLOR_SYSTEM_PREMIUM.md` pour refléter la logique multi-teintes par bloc
6. **Priorité 6** : Nettoyer `navigation.ts` : supprimer ou documenter les blocs "impact", "connect", "pilot" non utilisés

---

## Sources

- `documentation/design-system/BLOC_COLOR_SYSTEM_PREMIUM.md` — Charte théorique
- `apps/web/src/lib/accueil/config.ts` — Configuration homepage (5 blocs)
- `apps/web/src/lib/navigation.ts` — Système de navigation (8 blocs définis)
- `apps/web/src/lib/accueil/navigation.ts` — Priorités de preview par bloc
- `apps/web/src/components/accueil/accueil-pillars.tsx` — Composant cartes homepage
- `apps/web/src/app/page.tsx` — Page homepage
- `documentation/liberte-UX-UI/*/UX-DIRECTION*.md` — Specs UX par bloc
- `documentation/product/matrice-rubriques.md` — Matrice rubriques

---

**Dernière mise à jour** : Généré automatiquement  
**Statut** : Document de référence pour audit visuel
