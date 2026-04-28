# Audit UX/UI : Homepage

## Identification

**Bloc** : Homepage (Page d'accueil publique)
**Route** : `/`
**Fichier principal** : `apps/web/src/app/page.tsx`
**Composants** :
- `HomeHero` → `apps/web/src/components/home/home-hero.tsx`
- `HomeImpactSummary` → `apps/web/src/components/home/home-impact-summary.tsx`
- `HomePillars` → `apps/web/src/components/home/home-pillars.tsx`
- `HomeBenefits` → `apps/web/src/components/home/home-benefits.tsx`
- `HomeCommunityActivity` → `apps/web/src/components/home/home-community-activity.tsx`
- `OriginCredibility` → `apps/web/src/components/home/OriginCredibility.tsx`
- `HomeFooter` → `apps/web/src/components/home/home-footer.tsx`

---

## Prompts de Cadrage — À envoyer à l'agent avant toute rubrique

Ces prompts établissent la logique UX/UI choisie pour l'ensemble de la Homepage. Les envoyer en premier, avant les prompts de chaque `RUBRIQUE-*.md`.

---

### PROMPT 1 : Contexte et mission du bloc
```
Tu vas travailler sur la Homepage de CleanMyMap (route `/`, fichier `apps/web/src/app/page.tsx`).

Cette page est la vitrine publique du projet. Elle s'adresse à tous les visiteurs, en première visite.
Son rôle est de convaincre en moins de 10 secondes que le projet est sérieux, utile, et que contribuer est simple.

La page est composée de 7 sections dans cet ordre :
1. Hero — capter l'attention, orienter vers 2 actions
2. Impact Summary — prouver l'impact par des données
3. Pillars — présenter les 7 blocs de la plateforme
4. Benefits — expliquer la valeur concrète
5. Community Activity — montrer la preuve sociale
6. Credibility — rassurer sur l'origine académique
7. Footer — navigation et contact

Chaque section a une identité visuelle propre mais toutes partagent le même écrin sombre.
Ne touche à aucune logique métier, route API, schéma de données ou permission.
```

---

### PROMPT 2 : Direction artistique de la Homepage
```
La Homepage suit le Pattern A "Vitrine premium" de la charte UI CleanMyMap.

Règles à appliquer sur toutes les sections sans exception :

FOND & SURFACES
- Fond global : slate-950 uniquement. Aucun fond blanc ou clair.
- Surfaces : bg-slate-900/40 à bg-slate-900/80 + backdrop-blur-xl + border-white/5
- Glassmorphism autorisé uniquement sur les fonds décoratifs, jamais sur les conteneurs de texte principal.

TYPOGRAPHIE
- Polices : Outfit (titres) + Inter (corps), chargées via next/font.
- Classes obligatoires : cmm-text-h1 à cmm-text-caption pour tous les titres et textes.
- Tokens couleur obligatoires : cmm-text-primary, cmm-text-secondary, cmm-text-muted.
- Poids autorisés : 400, 500, 600, 700. Jamais font-extrabold (800+).
- Jamais de tailles arbitraires text-[Xpx].

COMPOSANTS
- Boutons : CmmButton uniquement (apps/web/src/components/ui/cmm-button.tsx).
- Cards : CmmCard uniquement (apps/web/src/components/ui/cmm-card.tsx).
- CTA primaire : bg-emerald-600 hover:bg-emerald-500, h-14, rounded-2xl, font-bold, shadow-lg shadow-emerald-900/20.
- CTA secondaire : border-slate-800/60 bg-slate-900/40 backdrop-blur-md, h-14, rounded-2xl.
- Maximum 1 CTA primaire + 1 CTA secondaire par section.

ANIMATIONS
- Micro-interactions : Framer Motion spring (stiffness 400, damping 10) exclusivement.
- Maximum 3 animations simultanées par section.
- Toujours gérer prefers-reduced-motion.
- Toujours prévoir un fallback statique pour le mode "sobre" via useSitePreferences().

VISUAL STORYTELLING
- Toute donnée chiffrable doit être visualisée : SVG animé, D3, jauge, sparkline.
- Interdiction d'afficher un chiffre brut sans représentation visuelle associée.
```

---

### PROMPT 3 : Identité visuelle par section
```
Chaque section de la Homepage a une couleur d'accent propre. Respecter cette attribution :

- Hero : emerald-500 + cyan-400 (double accent, section d'entrée)
- Impact Summary : emerald-500 (métrique principale), sky-400 (secondaire), amber-500 (économique)
- Pillars : chaque pilier a sa couleur — Agir amber, Visualiser sky, Impact emerald, Réseau violet, Apprendre rose, Piloter indigo
- Benefits : emerald-500 + cyan-400 (cohérence avec le Hero)
- Community Activity : indigo-500 (communauté, appartenance)
- Credibility : emerald-500 (cohérence marque, sobre)
- Footer : slate-300 hover:cyan-400 (utilitaire, discret)

Règle : une section = une couleur dominante + neutres slate. Pas de mélange d'accents dans une même section.
```

---

### PROMPT 4 : Contraintes techniques globales
```
Ces contraintes s'appliquent à toutes les sections de la Homepage sans exception.

[CONTRAINTE 1] Ne jamais modifier la logique métier : routes API, schémas, payloads, permissions, authz.
[CONTRAINTE 2] Utiliser uniquement CmmButton et CmmCard. Jamais de bouton ou card custom from scratch.
[CONTRAINTE 3] Utiliser uniquement les tokens cmm-text-* et les couleurs sémantiques. Jamais de classes arbitraires.
[CONTRAINTE 4] Chaque composant animé doit retourner null ou un rendu statique en mode "sobre".
[CONTRAINTE 5] Max 3 animations simultanées par section. prefers-reduced-motion doit désactiver toutes les animations.
[CONTRAINTE 6] Contraste WCAG AA minimum (4.5:1) sur tous les textes. Valider sur WebAIM Contrast Checker.
[CONTRAINTE 7] Images : format WebP, max 500KB, attribut loading="lazy" obligatoire.
[CONTRAINTE 8] Lighthouse cible : Performance > 90, LCP < 2.5s, CLS < 0.1 sur mobile et desktop.
```

---

### PROMPT 5 : Ordre d'exécution des rubriques
```
Traiter les rubriques dans cet ordre de priorité. Chaque rubrique a son propre fichier de prompts détaillés.

1. [CRITIQUE] Hero Section → prompts dans RUBRIQUE-HERO.md
2. [HAUTE]    Impact Summary → prompts dans RUBRIQUE-IMPACT-SUMMARY.md
3. [HAUTE]    Pillars → prompts dans RUBRIQUE-PILLARS.md
4. [MOYENNE]  Benefits → prompts dans RUBRIQUE-BENEFITS.md
5. [MOYENNE]  Community Activity → prompts dans RUBRIQUE-COMMUNITY-ACTIVITY.md
6. [BASSE]    Credibility & Footer → prompts dans RUBRIQUE-CREDIBILITY-FOOTER.md

Avant chaque rubrique : lire le fichier composant concerné pour connaître l'état actuel du code.
Ne pas enchaîner deux rubriques sans valider les tests de la précédente.
```
