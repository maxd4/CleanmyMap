# Direction UX — Bloc Accueil (espace personnel)

> **Attention** : ce bloc n'est pas la page publique `/` (voir `01-ACCUEIL`).
> C'est l'espace **personnel et contextualisé** de l'utilisateur connecté.

---

## Routes et fichiers

| Rubrique | Route | Fichier |
|---|---|---|
| Page Accueil perso | `/accueil` | `apps/web/src/app/accueil/page.tsx` |
| Tableau de bord | `/dashboard` | `apps/web/src/app/(app)/dashboard/page.tsx` |
| Profil & impact | `/profil` | `apps/web/src/app/(app)/profil/page.tsx` |

---

## Mission du bloc

Orienter rapidement l'utilisateur dans son espace de travail personnel. Ce n'est pas un hub marketing. C'est un **point d'entrée de pilotage**, de reprise d'activité et de contexte utile.

- `/accueil` : reprise de session — "où j'en suis, quoi faire ensuite"
- `/dashboard` : cockpit quotidien — alertes, déclaration d'action, accès rapides par rôle
- `/profil` : repères personnels — progression, badges, impact

---

## Identité visuelle (orange/ambre)

Observée directement dans `apps/web/src/app/accueil/page.tsx` :

- Fond global : `bg-[linear-gradient(180deg,rgba(58,36,18,0.94),rgba(72,45,20,0.98))]`
- Overlay glow gauche : `bg-amber-400/12 blur-3xl`
- Overlay glow droite : `bg-orange-500/10 blur-3xl`
- Card principale : `bg-[rgba(97,61,29,0.78)] border-orange-300/22`
- Cards secondaires : `bg-[rgba(120,78,34,0.62)] border-orange-200/16`
- Ombre : `shadow-[0_24px_56px_-32px_rgba(249,115,22,0.30)]`
- Texte secondaire : `text-white/78`
- Badge/chip : `bg-[rgba(120,78,34,0.72)] border-orange-200/18 text-orange-50/92`
- Accent label : `text-orange-100/60` à `text-orange-100/72`
- Règle absolue : **aucun blanc ni noir sur surfaces/bordures/overlays** — réservé au texte uniquement

**Couleur accent** : `orange` / `amber` — chaleur immédiate, reprise d'activité, sans marketing.

> **Dashboard** (`/dashboard`) : utilise un registre visuel différent — surfaces `bg-white/60 backdrop-blur-md border-white/40` et tokens `cmm-text-primary/secondary`. À aligner sur la charte dark lors de l'audit.

---

## Composants réels identifiés

### `/accueil` (`accueil/page.tsx`)
- Pas de composants séparés — tout est inline dans la page
- `HomepageStatsWidget` → `apps/web/src/components/sections/rubriques/homepage-stats-widget.tsx`
- CTA via `<Link>` custom (pas de `CmmButton`) — **à migrer lors de l'audit**
- Grid 2 colonnes : `grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]`

### `/dashboard` (`(app)/dashboard/page.tsx`)
- `IdentityProfileBanner` → `apps/web/src/components/ui/identity-profile-banner.tsx`
- `DashboardOverviewSection` → `apps/web/src/components/dashboard/dashboard-overview-section.tsx`
- `ActionDeclarationForm` → `apps/web/src/components/actions/action-declaration-form.tsx`
- `RolePrimaryActions` → `apps/web/src/components/navigation/role-primary-actions.tsx`
- `ClerkRequiredGate` → gate d'auth pour non-connectés

---

## Structure de `/accueil` (état actuel)

**Colonne gauche (large) :**
1. Header : label "Bloc Accueil" + titre "Où j'en suis" + accroche
2. Carte "Reprise de session" — 3 sous-cartes : Statut, Profil, Progression
3. Bloc "Prochaine étape" — texte conditionnel connecté/non connecté
4. Boutons CTA : `Tableau de bord`, `Profil & impact`, `Se connecter` (si non connecté)

**Colonne droite (étroite) :**
1. Carte "Lecture rapide" — nom de l'utilisateur + phrase d'usage
2. `HomepageStatsWidget`
3. Carte "Périmètre" — description Tableau de bord + Profil & impact, mention "Explorer exclu volontairement"

---

## Structure de `/dashboard` (état actuel)

1. `IdentityProfileBanner` — bannière profil/rôle
2. Header "Cockpit quotidien" — titre i18n + description + profil actif
3. `DashboardOverviewSection` (Suspense) — aperçu 30 jours (stats Supabase)
4. Section "Action prioritaire" — `ActionDeclarationForm` en mode `quick`
5. `RolePrimaryActions` — accès rapides selon le rôle

---

## Direction UX

- Priorité à la **reprise de contexte** : "où j'en suis", "quoi faire ensuite", "quel est mon périmètre"
- Lecture immédiate sans surcharge visuelle ni grands effets décoratifs
- Les informations principales doivent être visibles **sans scroller sur desktop**
- Explorer est **volontairement exclu** de cet écran — déjà énoncé dans le code
- Le Dashboard est le seul endroit où l'utilisateur peut **déclarer une action directement**

---

## Rubriques à auditer (par priorité)

| Priorité | Rubrique | Route | Note |
|---|---|---|---|
| [CRITIQUE] | Reprise de session | `/accueil` | Above the fold, primera impression |
| [CRITIQUE] | Cockpit quotidien | `/dashboard` | CTA action + stats pilotage |
| [HAUTE] | HomepageStatsWidget | `/accueil` (sidebar) | Données temps réel, état inconnu |
| [HAUTE] | DashboardOverviewSection | `/dashboard` | Suspense/Supabase, skeleton visible |
| [MOYENNE] | RolePrimaryActions | `/dashboard` | Accès rapides par rôle |
| [BASSE] | État non connecté `/accueil` | `/accueil` | Fallback visiteur |
| [BASSE] | ClerkRequiredGate `/dashboard` | `/dashboard` | Preview floue locked |

---

## Points de dette identifiés

- `/accueil` : CTA via `<Link>` custom → à migrer vers `CmmButton`
- `/dashboard` : surfaces `bg-white/60` (mode clair) → à aligner sur `bg-slate-900/40 backdrop-blur-xl` (charte dark)
- `/accueil` : composants 100% inline dans la page, aucun composant isolé → pas testable, pas réutilisable
- `HomepageStatsWidget` : composant non documenté, état inconnu

---

## Signaux de réussite

- L'utilisateur comprend son statut en moins de 5 secondes
- Les prochaines actions sont visibles sans scroller
- Le bloc sert d'entrée utile, pas de page de présentation
- Le Dashboard permet de déclarer une action sans quitter la page

---

## À éviter

- Hero marketing
- Cartes décoratives surdimensionnées
- Tunnels d'onboarding inutiles
- Répétition de la navigation déjà visible dans le header
- Surfaces claires (`bg-white`) dans l'espace personnel — réservées au mode clair système uniquement
