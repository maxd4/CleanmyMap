# BLOC_COLOR_SYSTEM_PREMIUM — Système de couleurs par bloc

> Source de vérité : `apps/web/src/lib/ui/block-accents.ts`
> Fond global : `slate-950` (#020617). Accents dominants globaux : `emerald-400` + `cyan-400`.
>
> **Règle 60/30/10** appliquée sur chaque bloc :
> - 60% → fond profond teinté (quasi-noir avec teinte de l'accent)
> - 30% → surface mid-tone (rgba de l'accent à faible opacité)
> - 10% → accent pur (bordures, dots, glows, highlights)
>
> **Dégradés** : toujours `180deg` (top → bottom), 3 stops progressifs.
> **Glows** : double couche — focal (proche, fort) + ambient (large, doux).
> **Règle absolue** : aucun blanc ni noir sur surfaces/bordures/overlays.

---

## Récapitulatif rapide

| # | Bloc | Accent | Fond 60% | Surface 30% | Highlight 10% |
|---|---|---|---|---|---|
| 01 | Homepage | `emerald` + `cyan` | `slate-950` | `emerald-950/8` | `emerald-400` |
| 02 | Accueil | `amber` | `#0f0800` | `rgba(30,16,0,0.75)` | `amber-400` |
| 03 | Agir | `emerald` | `#000f08` | `rgba(0,18,10,0.78)` | `emerald-400` |
| 04 | Visualiser | `sky` | `#00080f` | `rgba(0,18,32,0.78)` | `sky-400` |
| 05 | Impact | `red`/`rose` | `#0f0004` | `rgba(22,0,8,0.78)` | `rose-400` |
| 06 | Réseau | `indigo` | `#04020f` | `rgba(8,4,24,0.78)` | `indigo-400` |
| 07 | Échanges | `pink` | `#0f0008` | `rgba(22,0,12,0.78)` | `pink-400` |
| 08 | Apprendre | `yellow` | `#0c0b00` | `rgba(20,18,0,0.78)` | `yellow-400` |
| 09 | Piloter | `amber` | `#0f0800` | `rgba(30,16,0,0.75)` | `amber-400` |

---

## 02 — Bloc Accueil · `amber`

```
gradientDeep : from-[#0f0800] via-[#1e1000] to-[#2d1800]   ← 180deg
surface      : bg-[rgba(30,16,0,0.75)] backdrop-blur-xl
surfaceMuted : bg-[rgba(20,10,0,0.55)] backdrop-blur-md
border       : border-amber-400/18
borderStrong : border-amber-400/38
shadow       : 0_32px_72px_-16px_rgba(245,158,11,0.22) + 0_8px_24px_-8px_rgba(0,0,0,0.55)
glow focal   : 0_0_48px_-12px_rgba(245,158,11,0.38)
glow ambient : 0_0_96px_-32px_rgba(251,191,36,0.18)
dot / accent : amber-400
```

---

## 03 — Bloc Agir · `emerald`

```
gradientDeep : from-[#000f08] via-[#001a0e] to-[#002818]   ← 180deg
surface      : bg-[rgba(0,18,10,0.78)] backdrop-blur-xl
surfaceMuted : bg-[rgba(0,12,6,0.55)] backdrop-blur-md
border       : border-emerald-400/18
borderStrong : border-emerald-400/38
shadow       : 0_32px_72px_-16px_rgba(16,185,129,0.22) + 0_8px_24px_-8px_rgba(0,0,0,0.55)
glow focal   : 0_0_48px_-12px_rgba(16,185,129,0.38)
glow ambient : 0_0_96px_-32px_rgba(52,211,153,0.18)
dot / accent : emerald-400
```

---

## 04 — Bloc Visualiser · `sky`

```
gradientDeep : from-[#00080f] via-[#001422] to-[#001e32]   ← 180deg
surface      : bg-[rgba(0,18,32,0.78)] backdrop-blur-xl
surfaceMuted : bg-[rgba(0,12,22,0.55)] backdrop-blur-md
border       : border-sky-400/18
borderStrong : border-sky-400/38
shadow       : 0_32px_72px_-16px_rgba(14,165,233,0.22) + 0_8px_24px_-8px_rgba(0,0,0,0.55)
glow focal   : 0_0_48px_-12px_rgba(14,165,233,0.38)
glow ambient : 0_0_96px_-32px_rgba(56,189,248,0.18)
dot / accent : sky-400
```

---

## 05 — Bloc Impact · `red`/`rose`

```
gradientDeep : from-[#0f0004] via-[#1c0008] to-[#2a000e]   ← 180deg
surface      : bg-[rgba(22,0,8,0.78)] backdrop-blur-xl
surfaceMuted : bg-[rgba(14,0,5,0.55)] backdrop-blur-md
border       : border-rose-400/18
borderStrong : border-rose-400/38
shadow       : 0_32px_72px_-16px_rgba(244,63,94,0.22) + 0_8px_24px_-8px_rgba(0,0,0,0.55)
glow focal   : 0_0_48px_-12px_rgba(244,63,94,0.38)
glow ambient : 0_0_96px_-32px_rgba(251,113,133,0.18)
dot / accent : rose-400
```

---

## 06 — Bloc Réseau · `indigo`

```
gradientDeep : from-[#04020f] via-[#08041e] to-[#0e082e]   ← 180deg
surface      : bg-[rgba(8,4,24,0.78)] backdrop-blur-xl
surfaceMuted : bg-[rgba(5,2,16,0.55)] backdrop-blur-md
border       : border-indigo-400/18
borderStrong : border-indigo-400/38
shadow       : 0_32px_72px_-16px_rgba(99,102,241,0.22) + 0_8px_24px_-8px_rgba(0,0,0,0.55)
glow focal   : 0_0_48px_-12px_rgba(99,102,241,0.38)
glow ambient : 0_0_96px_-32px_rgba(139,92,246,0.18)
dot / accent : indigo-400
```

---

## 07 — Bloc Échanges · `pink`

```
gradientDeep : from-[#0f0008] via-[#1c0012] to-[#2a001c]   ← 180deg
surface      : bg-[rgba(22,0,12,0.78)] backdrop-blur-xl
surfaceMuted : bg-[rgba(14,0,8,0.55)] backdrop-blur-md
border       : border-pink-400/18
borderStrong : border-pink-400/38
shadow       : 0_32px_72px_-16px_rgba(236,72,153,0.22) + 0_8px_24px_-8px_rgba(0,0,0,0.55)
glow focal   : 0_0_48px_-12px_rgba(236,72,153,0.38)
glow ambient : 0_0_96px_-32px_rgba(232,121,249,0.18)
dot / accent : pink-400
```

---

## 08 — Bloc Apprendre · `yellow`

```
gradientDeep : from-[#0c0b00] via-[#181500] to-[#241f00]   ← 180deg
surface      : bg-[rgba(20,18,0,0.78)] backdrop-blur-xl
surfaceMuted : bg-[rgba(14,12,0,0.55)] backdrop-blur-md
border       : border-yellow-400/18
borderStrong : border-yellow-400/38
shadow       : 0_32px_72px_-16px_rgba(234,179,8,0.22) + 0_8px_24px_-8px_rgba(0,0,0,0.55)
glow focal   : 0_0_48px_-12px_rgba(234,179,8,0.38)
glow ambient : 0_0_96px_-32px_rgba(253,224,71,0.18)
dot / accent : yellow-400
```

---

## 09 — Bloc Piloter · `amber` (shade sombre)

> Même accent que Accueil mais contexte décisionnel — surfaces plus opaques, glow plus retenu.

```
gradientDeep : from-[#0f0800] via-[#1e1000] to-[#2d1800]   ← 180deg
surface      : bg-[rgba(30,16,0,0.75)] backdrop-blur-xl
border       : border-amber-400/18  (hover → /38)
glow focal   : 0_0_48px_-12px_rgba(245,158,11,0.38)
dot / accent : amber-400
```

---

## Tokens partagés (tous blocs)

```css
/* Typographie */
text-slate-50        /* titres */
text-slate-300       /* corps */
text-slate-500       /* légendes uppercase */

/* Arrondis */
rounded-[2.5rem]     /* hero / grosses cards */
rounded-2xl          /* cards standard */
rounded-full         /* pills / dots */

/* Backdrop */
backdrop-blur-xl     /* surfaces principales */
backdrop-blur-md     /* surfaces secondaires */

/* Ligne de séparation top */
bg-gradient-to-r from-transparent via-[accent]/30 to-transparent  /* 1px */
```

---

## Principes de construction (règles pour agents IA)

1. **60% fond** : noir teinté de l'accent (`#0x0x0x` avec trace de la couleur)
2. **30% surface** : `rgba(r,g,b,0.75-0.78)` — la teinte de l'accent à ~8-12% de luminosité
3. **10% accent pur** : bordures `/18` au repos, `/38` au hover, dots et glows
4. **Dégradé fond** : toujours `180deg`, 3 stops, progression douce (×1.5 entre chaque stop)
5. **Glow double couche** : focal `48px -12px` à 38% + ambient `96px -32px` à 18%
6. **Shadow** : toujours double — profondeur `72px -16px` + base `24px -8px` noir à 55%
7. **Jamais** : `bg-white`, `bg-black`, opacités > 40% sur les glows permanents
