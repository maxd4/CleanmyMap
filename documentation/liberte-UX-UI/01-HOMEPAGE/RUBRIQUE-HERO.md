# Audit Rubrique : Hero Section

## Identification

**Rubrique** : Hero Section  
**Bloc parent** : Homepage  
**Fichier** : `apps/web/src/components/home/home-hero.tsx`  
**Route** : `/` (section supérieure)

---

## Contexte & Rôle

```
Ce bloc sert à capter l'attention en < 3 secondes et orienter vers 2 actions principales.
Utilisateurs cibles : Tous visiteurs (première visite, découverte).
Action principale : Cliquer sur "Voir la carte" (passif) ou "Déclarer une action" (actif).
Émotion : Inspiration, confiance, urgence douce.
Ton : Inspirant, inclusif, professionnel.
Impression recherchée : "Ce projet est sérieux et je peux contribuer facilement".
```

---

## Prompts d'Implémentation

### PROMPT 1 : Optimisation des CTA (CRITIQUE)
```
Utiliser CmmButton (apps/web/src/components/ui/cmm-button.tsx) :
- CTA 1 "Voir la carte" : CmmButton variant="primary" → bg-emerald-600 hover:bg-emerald-500, h-14, rounded-2xl, font-bold, shadow-lg shadow-emerald-900/20
- CTA 2 "Déclarer une action" : CmmButton variant="secondary" (glass) → border-slate-800/60 bg-slate-900/40 backdrop-blur-md, h-14, rounded-2xl, font-bold

Déplacer "Se connecter" dans la navigation principale (header), le retirer du Hero.

Transformer "Explorer" et "Voir l'impact" en liens texte discrets :
- Style : cmm-text-small cmm-text-muted, hover:cmm-text-primary, flex items-center gap-2
- Icône : ArrowRight size 14
```

### PROMPT 2 : Effet Parallax sur Watermark (HAUTE)
```
Ajouter un effet parallax sur le logo watermark (position absolute right-0) :
- Écouter le scroll avec useEffect + window.addEventListener('scroll')
- Calculer translateY : scrollY * 0.3
- Calculer opacity : 0.05 - (scrollY / 1000) * 0.03 (min 0.02)
- Appliquer avec style inline ou motion.div
- Performance : throttle l'event listener à 16ms (60fps)
```

### PROMPT 3 : FloatingParticles Component (HAUTE)
```
Créer un nouveau composant FloatingParticles :
- Fichier : apps/web/src/components/home/floating-particles.tsx
- Générer 15-20 divs avec position absolute
- Tailles : w-1 h-1 (petits), w-2 h-2 (moyens), w-1.5 h-1.5 (variés)
- Couleurs : bg-cyan-400/30 (60%), bg-emerald-400/30 (40%)
- Positions : random left (0-100%), top (0-100%)
- Animation : keyframes float avec translateY aléatoire (-20px à 20px), duration 3-6s, ease-in-out, infinite, alternate
- Ajouter dans le Hero après les couches de fond
```

### PROMPT 4 : Amélioration Hover CTA (HAUTE)
```
CTA primaire au hover :
- translate-y: -4px (élévation)
- shadow-[0_18px_40px_-8px_rgba(16,185,129,0.5)] (glow intensifié)
- Icône ArrowRight : translate-x 4px
- Duration : 300ms ease-out
- Active state : translate-y 0, scale 0.98

CTA secondaire au hover :
- border-opacity : 25% → 80%
- bg-opacity : 8% → 20%
- Active state : scale 0.95
```

### PROMPT 5 : Animation Titre (MOYENNE)
```
Utiliser cmm-text-h1 (font Outfit, weight 700, leading-tight) pour le titre.

Option A - Gradient animé :
- Ajouter bg-gradient-to-r from-white via-cyan-100 to-white
- Ajouter bg-clip-text text-transparent
- Créer keyframes gradient-x : background-position 0% 50% → 100% 50% → 0% 50%
- Animation : animate-gradient-x duration 3s ease infinite
- Désactiver en mode sobre (useSitePreferences)

Option B - Typing effect (Framer Motion spring) :
- Utiliser motion.span avec staggerChildren 0.05s
- Chaque lettre : opacity 0→1, y 10→0, transition type "spring" stiffness 300 damping 20
- Désactiver en mode sobre
```

### PROMPT 6 : États Loading et Error (MOYENNE)
```
État loading :
- Créer HeroSkeleton component
- Structure : même card glassmorphism (rounded-[2.5rem], bg-white/[0.06], border-white/10, backdrop-blur-xl)
- Contenu : rectangles gris animés (bg-slate-800/50) pour titre (h-16 w-3/4), slogan (h-8 w-1/2), paragraphe (h-4 w-full, 2 lignes), CTA (h-14 w-40, 2 items)
- Animation shimmer : bg-gradient-to-r from-transparent via-white/10 to-transparent, animate-shimmer (keyframes : background-position -200% 0 → 200% 0, duration 2s infinite)

État error navigation :
- Toast component : position fixed bottom-4 right-4, z-50
- Style : bg-red-950/90, border border-red-800, rounded-xl, p-4, shadow-xl
- Contenu : icône AlertCircle (lucide), message "Impossible de charger la page", bouton "Réessayer" (bg-red-600 hover:bg-red-500)
- Auto-dismiss après 5s avec setTimeout
```

### PROMPT 7 : Optimisation Responsive (MOYENNE)
```
Mobile (< 640px) :
- CTA : flex-col, w-full, gap-3
- Titre : clamp(3rem, 10vw, 4rem)
- Padding card : px-6 py-8
- Watermark logo : hidden

Tablet (640px - 1024px) :
- CTA : flex-row flex-wrap, w-auto, gap-4
- Titre : clamp(4rem, 11vw, 5.5rem)
- Padding card : px-10 py-12

Desktop (> 1024px) :
- CTA : flex-row, w-auto, gap-4
- Titre : clamp(5rem, 12vw, 7.5rem)
- Padding card : px-20 py-20
- Watermark logo : block
```

---

## Contraintes Techniques

```
[CONTRAINTE 1] Ne pas dépasser 3 animations simultanées (titre + CTA + particles = 3 max).
[CONTRAINTE 2] Toujours valider le contraste WCAG AA : titre blanc sur #0b1f3a (ratio > 15:1), CTA emerald-500 sur texte sombre (ratio > 4.5:1).
[CONTRAINTE 3] Limiter les CTA primaires à 2 maximum (Voir la carte + Déclarer).
[CONTRAINTE 4] Garder le titre et les 2 CTA visibles sans scroll sur mobile (viewport height > 600px).
[CONTRAINTE 5] Performance : FloatingParticles doit tourner à 60fps (utiliser transform au lieu de top/left, will-change: transform).
[CONTRAINTE 6] Accessibilité : tous les CTA doivent avoir un focus visible (ring-2 ring-cyan-400 ring-offset-4 ring-offset-[#0b2a52]).
```

---

## Tests de Validation

```
[TEST 1] Eye-tracking ou test utilisateur : vérifier que les 2 CTA principaux sont identifiables en < 3 secondes (objectif : 90% des utilisateurs).
[TEST 2] WebAIM Contrast Checker : valider tous les ratios de contraste (titre, slogan, paragraphe, CTA).
[TEST 3] Responsive : tester sur iPhone SE (375px), iPad (768px), MacBook (1440px), écran 4K (2560px).
[TEST 4] Lighthouse : LCP < 2.5s, CLS < 0.1, Performance > 90.
[TEST 5] Animations : tester avec prefers-reduced-motion activé (désactiver parallax, typing, particles).
[TEST 6] Keyboard navigation : Tab order logique (langue → titre → CTA1 → CTA2 → liens secondaires).
[TEST 7] Performance FloatingParticles : FPS counter (Chrome DevTools) doit afficher 60fps constant.
[TEST 8] Test A/B : mesurer le taux de clic sur CTA1 vs CTA2 (objectif : 60% CTA1, 40% CTA2).
```

---

## Composants à Créer

### FloatingParticles.tsx
```typescript
// apps/web/src/components/home/floating-particles.tsx
// Désactivé automatiquement en mode sobre via useSitePreferences()
"use client";

import { useMemo } from "react";
import { useSitePreferences } from "@/hooks/use-site-preferences";

interface Particle {
  id: number;
  size: "sm" | "md" | "lg";
  color: "cyan" | "emerald";
  left: number;
  top: number;
  duration: number;
  delay: number;
}

export function FloatingParticles() {
  const { displayMode } = useSitePreferences();
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 18 }, (_, i) => ({
      id: i,
      size: ["sm", "md", "lg"][Math.floor(Math.random() * 3)] as Particle["size"],
      color: Math.random() > 0.4 ? "cyan" : "emerald",
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 3 + Math.random() * 3,
      delay: Math.random() * 2,
    }));
  }, []);

  if (displayMode === "sobre") return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className={`absolute rounded-full ${
            p.size === "sm" ? "w-1 h-1" : p.size === "md" ? "w-1.5 h-1.5" : "w-2 h-2"
          } ${
            p.color === "cyan" ? "bg-cyan-400/30" : "bg-emerald-400/30"
          }`}
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          100% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}
```

### HeroSkeleton.tsx
```typescript
// apps/web/src/components/home/hero-skeleton.tsx
"use client";

export function HeroSkeleton() {
  return (
    <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.06] backdrop-blur-xl px-8 py-10 sm:px-14 sm:py-14 lg:px-20 lg:py-20 space-y-10">
      <div className="h-8 w-32 bg-slate-800/50 rounded-lg animate-shimmer" />
      <div className="space-y-4">
        <div className="h-16 w-3/4 bg-slate-800/50 rounded-lg animate-shimmer" />
        <div className="h-8 w-1/2 bg-slate-800/50 rounded-lg animate-shimmer" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full bg-slate-800/50 rounded animate-shimmer" />
        <div className="h-4 w-5/6 bg-slate-800/50 rounded animate-shimmer" />
      </div>
      <div className="flex gap-4">
        <div className="h-14 w-40 bg-slate-800/50 rounded-2xl animate-shimmer" />
        <div className="h-14 w-48 bg-slate-800/50 rounded-2xl animate-shimmer" />
      </div>
    </div>
  );
}
```

---

## Fichiers à Modifier

- `apps/web/src/components/home/home-hero.tsx` (principal)
- `apps/web/src/app/globals.css` (keyframes shimmer, gradient-x, float)

## Fichiers à Créer

- `apps/web/src/components/home/floating-particles.tsx`
- `apps/web/src/components/home/hero-skeleton.tsx`
