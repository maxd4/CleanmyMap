# Direction UX — Bloc Impact

## Mission

Transformer des données d'activité en lecture utile. Ce bloc sert à mesurer, comparer, valoriser et rendre les résultats crédibles. UX de **preuve et de progression**.

---

## Routes et fichiers réels

| Rubrique | Route | Fichier |
|---|---|---|
| Rapports d'impact | `/reports` | `apps/web/src/app/reports/page.tsx` |
| Profil impact | `/profil` | `apps/web/src/app/(app)/profil/page.tsx` |
| Profil impact par rôle | `/profil/[profile]` | `apps/web/src/app/(app)/profil/[profile]/page.tsx` |
| Impact personnel | `/profil/impact` | `apps/web/src/app/(app)/profil/impact/page.tsx` |
| Parcours | `/parcours` | `apps/web/src/app/(app)/parcours/page.tsx` |
| Parcours par profil | `/parcours/[profile]` | `apps/web/src/app/(app)/parcours/[profile]/page.tsx` |
| Méthodologie | `/methodologie` | `apps/web/src/app/(app)/methodologie/page.tsx` (si existant) |

> **Note :** La gamification (badges, niveaux) est gérée côté composants `gamification/` et intégrée dans `/profil` et `/parcours`.

---

## Composants clés identifiés

- `apps/web/src/components/reports/` — composants rapports
- `apps/web/src/components/profil/` — composants profil
- `apps/web/src/components/gamification/` — badges, progression, niveaux

---

## Identité visuelle (red — impact terrain)

Couleur d'accent charte : **`red`**

- Fond de bloc : `bg-[linear-gradient(180deg,rgba(67,24,29,0.95),rgba(86,27,35,0.98))]`
- Overlay glow : `from-red-500/14 via-rose-500/10 to-transparent`
- Bordure : `border-rose-300/22`
- Hover border : `hover:border-rose-300/42`
- Surface secondaire : `bg-[rgba(102,38,46,0.82)]`
- Ombre : `shadow-[0_24px_56px_-32px_rgba(244,63,94,0.28)]`
- Texte secondaire : `text-white/80`
- Chips / badges : `bg-red-500/14 text-red-100 border-red-200/18`

> Règle absolue : aucun blanc ni noir sur surfaces/bordures/overlays — réservé au texte uniquement.

---

## Direction UX

- L'information doit être plus importante que l'effet graphique
- Les chiffres doivent être contextualisés, comparables et explicites — **jamais affichés seuls**
- Toute donnée chiffrable → SVG animé, D3, jauge ou sparkline
- Les badges et la progression sont des leviers de motivation, pas du décor
- La page Méthodologie prend le relais pour la preuve complète

---

## Rubriques à auditer (par priorité)

| Priorité | Rubrique | Route | Note |
|---|---|---|---|
| [CRITIQUE] | Profil & impact | `/profil` | Vue personnelle, KPI, progression |
| [CRITIQUE] | Rapports d'impact | `/reports` | Export, synthèse, crédibilité |
| [HAUTE] | Impact personnel | `/profil/impact` | Sous-vue dédiée aux métriques |
| [HAUTE] | Progression & badges | `/parcours` | Gamification, motivation |
| [HAUTE] | Parcours par profil | `/parcours/[profile]` | Personnalisation selon rôle |
| [MOYENNE] | Profil par rôle | `/profil/[profile]` | Vue profil public |
| [BASSE] | Méthodologie | `/methodologie` | Preuve scientifique, audiences expertes |

---

## Points de dette suspectés

- Couleur d'accent à corriger (rouge/rose → emerald) si elle a été implémentée
- `reports/` : vérifier si les exports PDF utilisent `rubrique-pdf-export-button.tsx`
- Gamification : vérifier que les animations badges respectent `prefers-reduced-motion`
- Chiffres bruts sans visualisation : à auditer dans `/profil/impact`

---

## Règles d'interface

- Mettre en avant les KPI, tendances et variations
- Ajouter du contexte autour des chiffres : période, source, sens, évolution
- Utiliser les badges et la progression comme leviers de motivation, pas comme décor
- Garder des exports, comparaisons et synthèses faciles à repérer

---

## Signaux de réussite

- L'utilisateur comprend ce qui progresse ou recule
- Les données paraissent fiables et interprétables
- Les éléments de gamification soutiennent l'engagement sans prendre le dessus

---

## À éviter

- Visualisations spectaculaires mais opaques
- Chiffres sans unité ou sans période
- Empilement de cartes KPI sans priorisation
- Gamification infantilisante
