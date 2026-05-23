# Mapping Rubrique → Teinte

> Référence rapide pour agents IA : quelle teinte utiliser pour quelle page

---

## Structure (5 Blocs + Homepage)

```
01. Accueil & Pilotage → amber/orange (accueil) + amber/brun (pilotage)
02. Agir → emerald
03. Cartographie & Impact → sky (carto) + red (impact)
04. Réseau & Discussions → indigo (reseau) + pink (discussion)
05. Apprendre → yellow
```

---

## Bloc 01 — Accueil & Pilotage

### Pages type Accueil → `amber` / `orange`

| Route | Teinte | Fond page | Fond cartes | Texte titres |
|-------|--------|-----------|-------------|--------------|
| `/dashboard` | `amber`/`orange` | `#b45309` + radial amber/orange | `#431407` | `text-orange-100` |
| `/explorer` | `amber`/`orange` | `#b45309` + radial amber/orange | `#431407` | `text-orange-100` |
| `/profil` | `amber`/`orange` | `#b45309` + radial amber/orange | `#431407` | `text-orange-100` |
| `/feedback` | `amber`/`orange` | `#b45309` + radial amber/orange | `#431407` | `text-orange-100` |

### Pages type Pilotage → `amber` / `brun`

| Route | Teinte | Fond page | Fond cartes | Texte titres |
|-------|--------|-----------|-------------|--------------|
| `/pilotage` | `amber`/`brun` | brun-orangé dense (radial amber/stone) | `#2c1c0f` | `text-orange-100` |
| `/admin` | `amber`/`brun` | brun-orangé dense (radial amber/stone) | `#2c1c0f` | `text-orange-100` |
| `/sponsor-portal` | `amber`/`brun` | brun-orangé dense (radial amber/stone) | `#2c1c0f` | `text-orange-100` |
| `/elus` | `amber`/`brun` | brun-orangé dense (radial amber/stone) | `#2c1c0f` | `text-orange-100` |
| `/admin/godmode` | `amber`/`brun` | brun-orangé dense (radial amber/stone) | `#2c1c0f` | `text-orange-100` |

---

## Bloc 02 — Agir

### Toutes pages → `emerald`

| Route | Teinte | Fond page | Fond cartes | Texte titres |
|-------|--------|-----------|-------------|--------------|
| `/actions/new` | `emerald` | vert clair lumineux (radial emerald) | `#06261c` | `text-emerald-100` |
| `/sections/route` | `emerald` | vert clair lumineux (radial emerald) | `#06261c` | `text-emerald-100` |
| `/sections/weather` | `emerald` | vert clair lumineux (radial emerald) | `#06261c` | `text-emerald-100` |
| `/sections/guide` | `emerald` | vert clair lumineux (radial emerald) | `#06261c` | `text-emerald-100` |
| `/trash-spotter` | `emerald` | vert clair lumineux (radial emerald) | `#06261c` | `text-emerald-100` |

---

## Bloc 03 — Cartographie & Impact

### Pages type Cartographie → `sky`

| Route | Teinte | Fond page | Fond cartes | Texte titres |
|-------|--------|-----------|-------------|--------------|
| `/actions/map` | `sky` | bleu clair lumineux (radial sky) | `#071827` | `text-sky-100` |
| `/sandbox` | `sky` | bleu clair lumineux (radial sky) | `#071827` | `text-sky-100` |

### Pages type Impact → `red` / `rose`

| Route | Teinte | Fond page | Fond cartes | Texte titres |
|-------|--------|-----------|-------------|--------------|
| `/reports` | `red` | rouge clair lumineux (radial red) | `#3b0a0f` | `text-red-100` |
| `/gamification` | `red` | rouge clair lumineux (radial red) | `#3b0a0f` | `text-red-100` |

---

## Bloc 04 — Réseau & Discussions

### Toutes pages → `indigo`

| Route | Teinte | Fond page | Fond cartes | Texte titres |
|-------|--------|-----------|-------------|--------------|
| `/partners/network` | `indigo` | indigo clair lumineux (radial indigo/violet) | `#04020f` | `text-indigo-100` |
| `/community` | `indigo` | indigo clair lumineux (radial indigo/violet) | `#04020f` | `text-indigo-100` |
| `/messagerie` | `indigo` | indigo clair lumineux (radial indigo/violet) | `#04020f` | `text-indigo-100` |
| `/open-data` | `indigo` | indigo clair lumineux (radial indigo/violet) | `#04020f` | `text-indigo-100` |

---

## Bloc 05 — Apprendre

### Toutes pages → `yellow`

| Route | Teinte | Fond page | Fond cartes | Texte titres |
|-------|--------|-----------|-------------|--------------|
| `/learn/hub` | `yellow` | jaune clair lumineux (radial yellow/amber) | `#241f00` | `text-yellow-100` |
| `/learn/comprendre` | `yellow` | jaune clair lumineux (radial yellow/amber) | `#241f00` | `text-yellow-100` |
| `/learn/sentrainer` | `yellow` | jaune clair lumineux (radial yellow/amber) | `#241f00` | `text-yellow-100` |
| `/learn/bonnes-pratiques` | `yellow` | jaune clair lumineux (radial yellow/amber) | `#241f00` | `text-yellow-100` |
| `/learn/ressources` | `yellow` | jaune clair lumineux (radial yellow/amber) | `#241f00` | `text-yellow-100` |

---

## Règles d'application

1. **Une page = une teinte dominante** : Ne pas mélanger orange ET brun, ou sky ET red sur la même page
2. **Bordures** : `border-[accent]-200/18` hover: `border-[accent]-200/38`
3. **Ombres** : Adapter selon la teinte (voir `BLOC_COLOR_SYSTEM_PREMIUM.md`)
4. **Texte corps** : `text-white` par défaut, `text-white/80` pour secondaire
5. **Dots/accents** : `bg-[accent]-300`

---

## Référence complète

`documentation/design-system/BLOC_COLOR_SYSTEM_PREMIUM.md`
