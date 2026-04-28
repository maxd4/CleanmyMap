# Audit des Blocs et Rubriques — Guide de Production

## Ce que produit ce système

Pour chaque bloc, on produit deux fichiers de prompts à envoyer à un agent IA dans cet ordre :

1. **`AUDIT-[BLOC].md`** — 5 prompts de cadrage. L'agent les reçoit en premier. Ils posent la logique UX/UI choisie pour le bloc, la direction artistique, les contraintes globales et l'ordre d'exécution.
2. **`RUBRIQUE-[NOM].md`** — prompts d'implémentation détaillés, un fichier par rubrique. L'agent les reçoit après le cadrage, rubrique par rubrique.

**Séquence d'utilisation :**
→ Envoyer les 5 prompts de `AUDIT-[BLOC].md`
→ Puis envoyer les prompts de `RUBRIQUE-[NOM].md` dans l'ordre de priorité indiqué

---

## Principes de rédaction (valables pour les deux niveaux)

- ✅ Concret : `bg-emerald-600 hover:bg-emerald-500 rounded-2xl h-14 px-8 font-bold shadow-lg shadow-emerald-900/20`
- ❌ Vague : "Améliorer le bouton"
- ✅ Aligné charte : `CmmButton`, `cmm-text-h1`, `cmm-text-primary`, `useSitePreferences()`
- ❌ Hors charte : `text-[32px]`, `font-extrabold`, fonds blancs, boutons custom from scratch
- ✅ Visual Storytelling : "SVG sparkline animé (stroke-dasharray) pour la tendance des métriques"
- ❌ Texte brut : "Afficher '+5% ce mois'"
- ✅ Mesurable : "LCP < 2.5s sur Lighthouse mobile, contraste WCAG AA (4.5:1) sur WebAIM"
- ❌ Subjectif : "Améliorer la lisibilité"

---

## Direction artistique globale (à intégrer dans chaque AUDIT-[BLOC].md)

Lire avant tout audit :
- `documentation/design-system/charte-ui-pro-moderne-futuriste.md`
- `documentation/design-system/VISUAL_STORYTELLING.md`
- `documentation/design-system/TYPOGRAPHY_SYSTEM.md`
- `documentation/design-system/display-modes-chartes.md`

Règles non négociables à reprendre dans le PROMPT 2 de chaque audit :
- Fond `slate-950` exclusivement. Aucun fond blanc sur les surfaces.
- Surfaces : `bg-slate-900/40–80` + `backdrop-blur-xl` + `border-white/5`. Glassmorphism jamais sur les conteneurs de texte.
- Polices : Outfit (titres) + Inter (corps). Classes `cmm-text-h1` à `cmm-text-caption`. Poids 400–700 uniquement. Jamais `font-extrabold`.
- Tokens couleur : `cmm-text-primary`, `cmm-text-secondary`, `cmm-text-muted`. Jamais de couleurs arbitraires.
- Composants : `CmmButton` et `CmmCard` uniquement. Max 1 CTA primaire + 1 secondaire par section.
- Animations : Framer Motion `spring` (stiffness 400, damping 10). Max 3 simultanées par section. `prefers-reduced-motion` toujours géré.
- Mode sobre : fallback statique obligatoire via `useSitePreferences()`.
- Toute donnée chiffrable → SVG animé, D3, jauge ou sparkline. Jamais de chiffre brut seul.

Accents par bloc (identité visuelle) :
- Agir : `amber`
- Visualiser : `sky`
- Impact : `emerald`
- Réseau : `violet`
- Apprendre : `rose`
- Piloter : `indigo`
- Homepage : `emerald-500` + `cyan-400` (double accent, vitrine)

---

## Template — AUDIT-[BLOC].md

Produire exactement 5 prompts. Chaque prompt est un bloc de texte délimité par des backticks triples, prêt à être copié-collé vers un agent.

```markdown
# Audit UX/UI : [Nom du Bloc]

## Identification

**Bloc** : [Nom complet]
**Route** : `/route`
**Fichier principal** : `apps/web/src/app/[route]/page.tsx`
**Composants** :
- `[NomComposant]` → `apps/web/src/components/[bloc]/[fichier].tsx`
- [répéter pour chaque composant du bloc]

---

## Prompts de Cadrage — À envoyer à l'agent avant toute rubrique

Ces prompts établissent la logique UX/UI choisie pour l'ensemble du bloc [Nom].
Les envoyer en premier, avant les prompts de chaque `RUBRIQUE-*.md`.

---

### PROMPT 1 : Contexte et mission du bloc
\`\`\`
Tu vas travailler sur [Nom du bloc] de CleanMyMap (route `[route]`, fichier `[fichier principal]`).

[Décrire en 3-5 phrases : à qui s'adresse ce bloc, quel est son rôle dans le parcours utilisateur,
quel objectif il doit atteindre en combien de secondes/interactions, quelle est l'émotion principale.]

Le bloc est composé de [N] sections dans cet ordre :
1. [Nom section] — [rôle en 5 mots]
2. [Nom section] — [rôle en 5 mots]
[...]

Ne touche à aucune logique métier, route API, schéma de données ou permission.
\`\`\`

---

### PROMPT 2 : Direction artistique du bloc
\`\`\`
Le bloc [Nom] suit le Pattern [A/B/autre] "[Nom du pattern]" de la charte UI CleanMyMap.
[Décrire en 1 phrase pourquoi ce pattern est adapté à ce bloc.]

Règles à appliquer sur toutes les sections sans exception :

FOND & SURFACES
- Fond global : slate-950 uniquement. Aucun fond blanc ou clair.
- Surfaces : bg-slate-900/40 à bg-slate-900/80 + backdrop-blur-xl + border-white/5
- Glassmorphism autorisé uniquement sur les fonds décoratifs, jamais sur les conteneurs de texte principal.
[Ajouter toute règle de surface spécifique à ce bloc.]

TYPOGRAPHIE
- Polices : Outfit (titres) + Inter (corps), chargées via next/font.
- Classes obligatoires : cmm-text-h1 à cmm-text-caption pour tous les titres et textes.
- Tokens couleur obligatoires : cmm-text-primary, cmm-text-secondary, cmm-text-muted.
- Poids autorisés : 400, 500, 600, 700. Jamais font-extrabold (800+).
- Jamais de tailles arbitraires text-[Xpx].
[Ajouter toute règle typo spécifique à ce bloc : densité mobile, line-clamp, etc.]

COMPOSANTS
- Boutons : CmmButton uniquement (apps/web/src/components/ui/cmm-button.tsx).
- Cards : CmmCard uniquement (apps/web/src/components/ui/cmm-card.tsx).
- CTA primaire : bg-[couleur-accent]-600 hover:bg-[couleur-accent]-500, h-14, rounded-2xl, font-bold, shadow-lg.
- CTA secondaire : border-slate-800/60 bg-slate-900/40 backdrop-blur-md, h-14, rounded-2xl.
- Maximum 1 CTA primaire + 1 CTA secondaire par section.
[Ajouter tout composant spécifique à ce bloc.]

ANIMATIONS
- Micro-interactions : Framer Motion spring (stiffness 400, damping 10) exclusivement.
- Maximum 3 animations simultanées par section.
- Toujours gérer prefers-reduced-motion.
- Toujours prévoir un fallback statique pour le mode "sobre" via useSitePreferences().
[Ajouter toute règle d'animation spécifique : parallax, count-up, stagger, etc.]

VISUAL STORYTELLING
- Toute donnée chiffrable doit être visualisée : SVG animé, D3, jauge, sparkline.
- Interdiction d'afficher un chiffre brut sans représentation visuelle associée.
[Ajouter les types de visualisation attendus pour ce bloc.]
\`\`\`

---

### PROMPT 3 : Identité visuelle par section
\`\`\`
Chaque section du bloc [Nom] a une couleur d'accent propre. Respecter cette attribution :

- [Section 1] : [couleur] ([justification émotionnelle courte])
- [Section 2] : [couleur] ([justification])
[...]

Règle : une section = une couleur dominante + neutres slate. Pas de mélange d'accents dans une même section.
\`\`\`

---

### PROMPT 4 : Contraintes techniques globales
\`\`\`
Ces contraintes s'appliquent à toutes les sections du bloc [Nom] sans exception.

[CONTRAINTE 1] Ne jamais modifier la logique métier : routes API, schémas, payloads, permissions, authz.
[CONTRAINTE 2] Utiliser uniquement CmmButton et CmmCard. Jamais de bouton ou card custom from scratch.
[CONTRAINTE 3] Utiliser uniquement les tokens cmm-text-* et les couleurs sémantiques. Jamais de classes arbitraires.
[CONTRAINTE 4] Chaque composant animé doit retourner null ou un rendu statique en mode "sobre".
[CONTRAINTE 5] Max 3 animations simultanées par section. prefers-reduced-motion doit désactiver toutes les animations.
[CONTRAINTE 6] Contraste WCAG AA minimum (4.5:1) sur tous les textes. Valider sur WebAIM Contrast Checker.
[CONTRAINTE 7] Images : format WebP, max 500KB, attribut loading="lazy" obligatoire.
[CONTRAINTE 8] Lighthouse cible : Performance > 90, LCP < 2.5s, CLS < 0.1 sur mobile et desktop.
[Ajouter toute contrainte spécifique au bloc : données temps réel, permissions, états vides, etc.]
\`\`\`

---

### PROMPT 5 : Ordre d'exécution des rubriques
\`\`\`
Traiter les rubriques dans cet ordre de priorité. Chaque rubrique a son propre fichier de prompts détaillés.

1. [CRITIQUE] [Nom rubrique] → prompts dans RUBRIQUE-[NOM].md
2. [HAUTE]    [Nom rubrique] → prompts dans RUBRIQUE-[NOM].md
3. [MOYENNE]  [Nom rubrique] → prompts dans RUBRIQUE-[NOM].md
4. [BASSE]    [Nom rubrique] → prompts dans RUBRIQUE-[NOM].md

Avant chaque rubrique : lire le fichier composant concerné pour connaître l'état actuel du code.
Ne pas enchaîner deux rubriques sans valider les tests de la précédente.
\`\`\`
```

---

## Template — RUBRIQUE-[NOM].md

Produire autant de prompts que nécessaire, classés par priorité décroissante. Chaque prompt est un bloc délimité par des backticks triples.

```markdown
# Audit Rubrique : [Nom]

## Identification

**Rubrique** : [Nom]
**Bloc parent** : [Nom du bloc]
**Fichier** : `apps/web/src/components/[bloc]/[fichier].tsx`
**Route** : `/route`

---

## Contexte & Rôle

\`\`\`
Ce bloc sert à [utilité précise].
Utilisateurs cibles : [profils].
Action principale : [action attendue].
Émotion : [émotion]. Ton : [ton].
Impression recherchée : "[phrase du point de vue utilisateur]".
\`\`\`

---

## Prompts d'Implémentation

### PROMPT 1 : [Titre] (CRITIQUE)
\`\`\`
[Specs techniques précises : noms de composants, classes Tailwind exactes, comportements,
valeurs numériques, structure JSX si nécessaire.]
\`\`\`

### PROMPT 2 : [Titre] (HAUTE)
\`\`\`
[...]
\`\`\`

### PROMPT N : [Titre] (MOYENNE/BASSE)
\`\`\`
[...]
\`\`\`

---

## Contraintes Techniques

\`\`\`
[CONTRAINTE 1] [Action interdite ou obligatoire + raison.]
[CONTRAINTE N] [...]
\`\`\`

---

## Tests de Validation

\`\`\`
[TEST 1] [Critère mesurable sur contexte précis : outil, seuil, condition.]
[TEST N] [...]
\`\`\`

---

## Composants à Créer

[Si un nouveau composant est nécessaire, inclure le code TypeScript complet.]

\`\`\`typescript
// apps/web/src/components/[bloc]/[fichier].tsx
[code]
\`\`\`

---

## Fichiers à Modifier

- `[chemin]` ([ce qui change])

## Fichiers à Créer

- `[chemin]`
```

---

## Ressources

- `documentation/design-system/charte-ui-pro-moderne-futuriste.md`
- `documentation/design-system/VISUAL_STORYTELLING.md`
- `documentation/design-system/TYPOGRAPHY_SYSTEM.md`
- `documentation/design-system/display-modes-chartes.md`
- `apps/web/src/components/ui/` — composants canoniques
- `apps/web/tailwind.config.ts` — palette
