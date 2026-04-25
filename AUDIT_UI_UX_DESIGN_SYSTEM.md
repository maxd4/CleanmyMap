# Audit UI/UX & Design System — CleanMyMap (sans modification)

Date : 2026-04-25  
Portée : repo CleanMyMap (runtime principal : `apps/web`)  
Contraintes respectées : **aucune modification** de logique métier / routes / dépendances pendant l’audit.

---

## 1) Diagnostic général UI/UX (projet)

CleanMyMap a déjà une direction “premium pro / moderne / futuriste”, mais elle n’est pas encore **canonique** : plusieurs mini-design-systems cohabitent.

- **Système A — Tailwind “inline” page par page**
  - De nombreuses pages/composants écrivent directement leurs styles (radius, ombres, bg, gradients) via classes utilitaires et `shadow-[...]`.
  - Résultat : rendu riche, mais **variabilité** et maintenance plus difficile.

- **Système B — Tokens CSS globaux (Tailwind v4 CSS-first)**
  - `globals.css` définit des variables (`--background`, `--foreground`, `--accent-*`, `--glass-*`, `--shadow-*`) et des utilitaires (`.premium-card`, `.punchy-title`).
  - Base saine, mais peu “enforced” : le code réel continue de dupliquer des patterns.

- **Système C — Overrides globaux agressifs**
  - `globals.css` contient des règles globales `!important` (dark mode, display modes) qui réécrivent des classes génériques (`bg-white`, `rounded-*`, `shadow-*`).
  - Risques :
    - incohérences visuelles,
    - surprises locales,
    - difficulté à stabiliser une grammaire de profondeur.

- **Système D — Identité par bloc vs identité par profil**
  - Le ruban applique une identité par **bloc** (slate/amber/sky/emerald/violet/rose/indigo).
  - `globals.css` remappe aussi globalement des classes emerald vers un accent par **profil** (`--profile-primary`, via `!important`).
  - Tension : le “vert émeraude” n’est pas toujours émeraude, et la lecture “bloc = couleur” peut être brouillée.

---

## 2) Inventaire des fichiers design / styles trouvés

### Documentation design
- `documentation/design/charte-ui-pro-moderne-futuriste.md`
- `documentation/design/theme-visibility-rules.md`

### Source de vérité styles/tokens (runtime)
- `apps/web/src/app/globals.css` (pivot : tokens, overrides, modes, dark-mode, Leaflet, print)
- `apps/web/postcss.config.mjs` (Tailwind v4 via `@tailwindcss/postcss`)
- Absence de `tailwind.config.*` → approche **CSS-first** (normal en Tailwind v4)

### Layouts & background global
- `apps/web/src/app/layout.tsx` (header public + `VibrantBackground`)
- `apps/web/src/app/(app)/layout.tsx` (app shell, `data-display-mode`, `data-user-profile`)
- `apps/web/src/components/ui/vibrant-background.tsx` (mesh + grain + grid)

### Navigation / patterns UI partagés
- `apps/web/src/components/navigation/app-navigation-ribbon.tsx` (ruban : accents par bloc)
- `apps/web/src/components/ui/site-preferences-controls.tsx` (réglages)
- `apps/web/src/components/account/account-identity-chip.tsx` (menu rôle)
- `apps/web/src/components/ui/navigation-grid.tsx` (cartes “premium” sombres)

### Templates / shells de rubriques
- `apps/web/src/components/ui/page-reading-template.tsx`
- `apps/web/src/components/ui/decision-page-header.tsx`
- `apps/web/src/components/sections/rubriques/shared.tsx` (SectionShell + RubriqueBlock)

### Pages “étalon” / sensibles au style
- `apps/web/src/app/page.tsx` (homepage premium)
- `apps/web/src/app/explorer/page.tsx` (plan du site premium utilitaire)
- `apps/web/src/app/error.tsx`, `apps/web/src/app/not-found.tsx` (premium-card)
- `apps/web/src/components/actions/actions-map-canvas.tsx` (Leaflet + tooltips/popup “glass”)

---

## 3) Évaluation de la cohérence actuelle

- La direction premium est réelle (homepage / ruban / explorer / erreurs).
- Mais la cohérence “produit unique” est fragilisée par :
  - overrides globaux `!important` (dark mode + display modes + profil),
  - patterns concurrents de cartes (au moins 3 variantes majeures),
  - templates qui ne partagent pas exactement la même grammaire (CTA/pills/radius/ombres),
  - style inline non factorisé (shadows arbitraires, background layers),
  - tension bloc-accent vs profil-accent.

---

## 4) Problèmes prioritaires (haut impact)

### P0 (structurels)
- **Overrides globaux `!important`** (dark + display modes + profil) = source n°1 d’incohérence.
  - Exemples : `html.dark .bg-white { ... !important }`, `[data-display-mode="sobre"] .rounded-2xl { ... !important }`.
- **`VibrantBackground` dépend d’un asset externe** (grain via URL).
  - Risque perf/offline/CSP, et incohérences si l’asset ne charge pas.
- **`NavigationGrid` génère des classes Tailwind dynamiques** (`grid-cols-${...}`).
  - Risque de non-génération de classes en build (selon pipeline), donc UI fragile.

### P1 (homogénéisation)
- Templates utilitaires encore trop “admin UI” (cards blanches simples) vs zones premium.
- Multiplication de `shadow-[...]` dispersés.
- CTA/boutons : plusieurs styles coexistent (rayons/tons/hauteurs).

### P2 (identité par bloc)
- Le ruban est bon, mais le reste de l’app n’exploite pas assez un accent par bloc contrôlé.
- Le thème par profil peut parasiter la lecture par bloc.

### P3 (polish)
- Focus/hover, densité mobile, retours à la ligne, largeur de texte, cohérence clair/sombre.

---

## 5) Styles à conserver (bons standards)

- Ruban : `apps/web/src/components/navigation/app-navigation-ribbon.tsx`
- Explorer premium utilitaire : `apps/web/src/app/explorer/page.tsx`
- Charte UI : `documentation/design/charte-ui-pro-moderne-futuriste.md`
- Base tokens : `apps/web/src/app/globals.css` (à rendre plus canonique et moins destructive)

---

## 6) Styles à supprimer / fusionner (cibles)

- Réduire fortement les overrides globaux destructifs (`html.dark .bg-white !important`, etc.).
  - Remplacer par tokens sémantiques + classes canoniques de surfaces/boutons.
- Repenser `[data-display-mode="sobre"]` qui cible des classes génériques (`.rounded-*` etc.).
  - Cibler 2–3 classes canoniques, pas des primitives globales.
- Clarifier le remap “profil” de classes emerald (éviter d’écraser la grammaire “bloc”).

---

## 7) Direction design canonique (applicable)

### 7.1 Tokens sémantiques (clair + sombre)
Créer/renforcer des tokens orientés **sens** (surfaces/texte/actions) plutôt que des couleurs “brutes” :

- Surfaces : `--bg-canvas`, `--bg-elevated`, `--bg-muted`
- Texte : `--text-primary`, `--text-secondary`, `--text-muted`, `--text-inverse`
- Bordures : `--border-default`, `--border-strong`
- Actions : `--action-primary-bg`, `--action-primary-text`, `--action-primary-hover`, etc.
- Focus : `--focus-ring`

Puis exposer 4–6 **classes canoniques** (surface, panel, button primary/secondary, pill, focus ring).

### 7.2 Palette : émeraude dominant, bleu en soutien
- Émeraude = action / succès / impact / brand primary
- Bleu = soutien (fonds/profondeur/information), pas la dominante CTA

### 7.3 Profondeur : 3 niveaux max
- `shadow-soft` (utilitaire/listes)
- `shadow-elevated` (cards)
- `shadow-hero` (hero / panneaux majeurs)

### 7.4 Anti-retours à la ligne inutiles
- Titres : `text-balance`, `max-w-*` cohérents, limiter les `uppercase` longs
- Pills/CTA courts : `whitespace-nowrap`, descriptions clampées

### 7.5 Accessibilité
Aligner l’exécution sur `documentation/design/theme-visibility-rules.md` :
focus visible partout, contraste stable en clair/sombre/hover/disabled, ne pas dépendre uniquement de la couleur.

---

## 8) Système d’accents par bloc (grammaire commune)

Réutiliser la table existante :
- Accueil: slate
- Agir: amber
- Visualiser: sky
- Impact: emerald
- Réseau: violet
- Apprendre: rose
- Piloter: indigo

**Grammaire + limites**
- Accent = 1 des 4 éléments max :
  - dot (pills),
  - barre latérale (cards),
  - ring léger (focus/hover),
  - gradient subtil (5–10% max).
- Interdit : glow permanent, blur sur texte, gradients saturés partout.

---

## 9) Recommandations par type de page / composant

- Vitrine (Homepage) : autoriser “hero depth” + mesh + glow, mais contenir au-dessus de la ligne de flottaison.
- Utilitaire (Explorer, Admin, Reports, Dashboard) : surfaces élevées + accents contrôlés + densité mobile.
- Rubriques (templates/shells) : 1 layout canonique réutilisable (CTA/cards/pills identiques).
- Formulaires : 1 style input canonique (border/radius/focus), limiter les variantes.
- Tableaux : en-têtes cohérents, densité stable, surfaces légèrement teintées.
- Modales/menus : même “glass panel” (comme Réglages), éviter les variantes.

---

## 10) Plan d’implémentation priorisé (P0→P3)

### P0 — Structure
- Remplacer overrides globaux trop larges par tokens + classes canoniques.
- Internaliser le grain du background (supprimer dépendance externe).
- Corriger `NavigationGrid` (classes dynamiques) via mapping statique de colonnes.

### P1 — Homogénéisation
- Unifier les variantes de cards (2–3 max).
- Aligner `DecisionPageHeader`, `PageReadingTemplate`, `SectionShell` sur le canon.
- Standardiser CTA primaires/secondaires/tertiaires + pills + focus.

### P2 — Personnalisation par bloc
- Introduire un set d’accents réutilisables par bloc (dot/bar/ring/gradient léger) sur headers/cadres.
- Clarifier la règle bloc vs profil (où l’accent profil s’applique réellement).

### P3 — Polish
- Passe accessibilité, clamp, densité mobile, largeur texte, cohérence clair/sombre + print.
- Vérifications : `typecheck`, `build`, et checks UI ciblés.

---

## 11) Liste des fichiers probablement concernés (périmètre)

### P0/P1 (cœur design system)
- `apps/web/src/app/globals.css`
- `apps/web/src/components/ui/vibrant-background.tsx`
- `apps/web/src/components/ui/navigation-grid.tsx`
- `apps/web/src/components/ui/page-reading-template.tsx`
- `apps/web/src/components/ui/decision-page-header.tsx`
- `apps/web/src/components/sections/rubriques/shared.tsx`
- `apps/web/src/components/navigation/app-navigation-ribbon.tsx`
- `apps/web/src/components/ui/site-preferences-controls.tsx`
- `apps/web/src/components/account/account-identity-chip.tsx`

### Alignement progressif (P1→P3, selon écarts réels)
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/explorer/page.tsx`
- `apps/web/src/app/reports/page.tsx`
- `apps/web/src/app/(app)/dashboard/page.tsx`
- `apps/web/src/app/(app)/actions/map/page.tsx`
- `apps/web/src/components/actions/actions-map-canvas.tsx`
- `apps/web/src/components/reports/web-document/*`
- `apps/web/src/components/sections/rubriques/*`

---

## 12) Prompt d’implémentation (à exécuter après validation explicite)

Voir le prompt “P0→P3” dans la conversation associée : il est destiné à être copié tel quel dans une demande d’implémentation après validation.

