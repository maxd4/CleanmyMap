# Direction UX — Bloc Visualiser

## Mission

Rendre le terrain lisible. Ce bloc sert à comprendre l'état d'une zone, repérer, filtrer, comparer et vérifier avant d'agir. UX d'**exploration spatiale**, pas de formulaire.

---

## Routes et fichiers réels

| Rubrique | Route | Fichier |
|---|---|---|
| Carte des actions | `/actions/map` | `apps/web/src/app/(app)/actions/map/page.tsx` |
| Observatoire public | `/observatoire` | `apps/web/src/app/(app)/observatoire/page.tsx` |
| Explorer | `/explorer` | `apps/web/src/app/explorer/page.tsx` |

> **Note :** `/actions/map` est partagé avec le bloc Agir — il sert les deux missions (visualiser ET localiser avant action).
> L'Observatoire est la vue publique des données agrégées (open data).

---

## Composants clés identifiés

- Map Leaflet → `apps/web/src/components/map/`
- Section carte publique → composants dans `apps/web/src/components/sections/`
- Explorer page → `apps/web/src/app/explorer/`

---

## Identité visuelle (sky — lecture spatiale)

Couleur d'accent charte : **`sky`**

- Fond de bloc : `bg-[linear-gradient(180deg,rgba(22,46,74,0.95),rgba(18,58,90,0.98))]`
- Overlay glow : `from-sky-400/15 via-cyan-400/10 to-transparent`
- Bordure : `border-sky-300/20`
- Hover border : `hover:border-sky-300/42`
- Surface secondaire : `bg-[rgba(32,78,115,0.80)]`
- Ombre : `shadow-[0_24px_56px_-32px_rgba(56,189,248,0.28)]`
- Texte secondaire : `text-white/80`
- Chips / badges : `bg-sky-400/14 text-sky-100 border-sky-200/18`

> Règle absolue : aucun blanc ni noir sur surfaces/bordures/overlays — réservé au texte uniquement.

---

## Direction UX

- La carte et les filtres restent les pièces centrales du bloc
- Lecture spatiale : couches d'information et changements d'état immédiatement perceptibles
- Les contrôles doivent être compacts et robustes
- L'Observatoire public est accessible **sans connexion** — UX distincte de la carte privée
- Explorer est une vue large, immersive, carte en plein écran

---

## Rubriques à auditer (par priorité)

| Priorité | Rubrique | Route | Note |
|---|---|---|---|
| [CRITIQUE] | Carte des actions | `/actions/map` | Vue principale, Leaflet, filtres, perf mobile |
| [CRITIQUE] | Explorer | `/explorer` | Plein écran, point d'entrée public |
| [HAUTE] | Observatoire public | `/observatoire` | Open data, accessible sans connexion |
| [MOYENNE] | Filtres et contrôles carte | `/actions/map` | Toolbar carte, groupes de filtres |
| [BASSE] | Légende et panneaux détail | `/actions/map` | Panneaux secondaires, modales |

---

## Points de dette suspectés

- Carte Leaflet : vérifier LCP < 2.5s, CLS < 0.1 sur mobile
- Explorer : route à la racine (`/explorer`) sans layout `(app)` — vérifier l'authz
- Observatoire : données Supabase publiques — vérifier RLS et temps de réponse
- Toolbar carte : risque d'overlays trop envahissants sur mobile

---

## Règles d'interface

- Barre d'outils courte, stable, sans chevauchement
- Filtres regroupés par familles compréhensibles
- Toujours distinguer : vue, filtre, légende, détails
- Les panneaux secondaires ne doivent pas masquer la carte plus que nécessaire
- Le hero de la page carte doit rester compact: titre et sous-titre idéalement sur une ligne chacun sur desktop, sans retours à la ligne décoratifs.
- Si un texte d'accroche déborde, réduire d'abord la taille, le tracking ou la largeur utile avant d'imposer des coupures manuelles.
- Préférer une réorganisation responsive du bloc sur mobile plutôt qu'un empilement de lignes forcées.

---

## Signaux de réussite

- L'utilisateur comprend rapidement ce qu'il regarde
- Les filtres modifient la vue sans ambiguïté
- Le bloc aide à préparer l'action et vérifier l'état du terrain

---

## À éviter

- Overlays trop envahissants
- Outils cachés derrière plusieurs clics
- Surcharge d'indicateurs simultanés
- Texte long dans des zones de contrôle
