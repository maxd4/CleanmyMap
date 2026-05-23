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
- Exemple : "Accueil & Pilotage" = amber/orange (accueil) + amber/brun (pilotage)

---

## Récapitulatif rapide — 5 Blocs Homepage

| # | Bloc Homepage | Teintes directrices | Carte homepage | Usage |
|---|---------------|---------------------|----------------|-------|
| 01 | Accueil & Pilotage | `amber`/`orange` + `amber`/`brun` | `amber`/`orange` | Pages accueil → orange, Pages pilotage → brun |
| 02 | Agir | `emerald` | `emerald` | Toutes pages terrain |
| 03 | Cartographie & Impact | `sky` + `red` | `sky` | Pages carto → sky, Pages impact → red |
| 04 | Réseau & Discussions | `indigo` + `pink` | `indigo` | Pages réseau → indigo, Pages discussion → pink |
| 05 | Apprendre | `yellow` | `yellow` | Toutes pages éducatives |

**Blocs système (non homepage) :**
- Impact (standalone) : `red` — fusionné dans "Cartographie & Impact"
- Discussion : `pink` — bloc discussion associé à `connect`
- Piloter : `amber`/`brun` — fusionné dans "Accueil & Pilotage"

---

## 01 — Bloc Accueil & Pilotage · Multi-teintes

### Pages type Accueil · `amber` / `orange`

```
fond page     : background #b45309 + radial-gradient amber/orange/jaune
fond cartes   : #431407 (sombre teinté orange)
bordure       : border-orange-200/18  hover: border-orange-200/38
ombre         : shadow-[0_24px_60px_-20px_rgba(124,45,18,0.50)]
barre top     : bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400
glow interne  : bg-orange-500/15 blur-3xl
texte titres  : text-orange-100
texte corps   : text-white / text-white/80
CTA primaire  : bg-gradient-to-r from-orange-500 to-amber-400
CTA secondaire: bg-white/10 hover:bg-white/16
```

---

### Pages type Pilotage · `amber` / `brun`

```
fond page     : brun-orangé dense (radial-gradient amber/stone)
fond cartes   : #2c1c0f (sombre teinté brun)
bordure       : border-stone-400/18  hover: border-stone-300/38
ombre         : shadow-[0_24px_56px_-32px_rgba(69,45,28,0.18)]
texte titres  : text-orange-100
texte corps   : text-white / text-white/80
dot accent    : bg-orange-300
```

**Pages concernées :**
- `/pilotage` — Vue pilotage
- `/admin` — Administration
- `/sponsor-portal` — Portail sponsor
- `/elus` — Élus
- `/admin/godmode` — God Mode

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
- `/gamification` — Gamification (badges, progression)

---

## 04 — Bloc Réseau & Discussions · `indigo` / `pink`

```
fond page     : indigo clair lumineux (radial-gradient indigo/violet)
fond cartes   : #04020f (sombre teinté indigo)
bordure       : border-indigo-200/18  hover: border-indigo-200/38
ombre         : shadow-[0_34px_76px_-34px_rgba(4,2,44,0.72)]
texte titres  : text-indigo-100
texte corps   : text-white / text-white/80
dot accent    : bg-indigo-300
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

### Pages type Discussion · `pink`

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
- écrans de discussion et d'échange associés

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
8. **Référence** : toujours vérifier `accueil-pillars.tsx`, `navigation.ts` et `TEINTES_BLOCS_RUBRIQUES.md` avant d'implémenter

---

## Mapping Rubrique → Teinte

### Bloc "Accueil & Pilotage"
- `/dashboard`, `/explorer`, `/profil`, `/feedback` → `amber`/`orange`
- `/pilotage`, `/admin`, `/sponsor-portal`, `/elus`, `/admin/godmode` → `amber`/`brun`

### Bloc "Cartographie & Impact"
- `/actions/map`, `/sandbox` → `sky`
- `/reports`, `/gamification` → `red`

### Autres blocs (teinte unique)
- Agir → `emerald`
- Réseau & Discussions → `indigo` / `pink`
- Apprendre → `yellow`
