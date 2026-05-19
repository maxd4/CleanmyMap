# Direction UX — Bloc Agir

## Mission

Permettre de passer à l'action vite et sans friction. Ce bloc sert l'exécution terrain : déclarer, localiser, prioriser, valider. C'est le **bloc opérationnel central** du produit.

---

## Routes et fichiers réels

| Rubrique | Route | Fichier |
|---|---|---|
| Déclarer une action | `/actions/new` | `apps/web/src/app/(app)/actions/new/page.tsx` |
| Carte des actions | `/actions/map` | `apps/web/src/app/(app)/actions/map/page.tsx` |
| Historique actions | `/actions/history` | `apps/web/src/app/(app)/actions/history/page.tsx` |
| Itinéraire IA | `/sections/route` | `apps/web/src/app/(app)/sections/route/page.tsx` |
| Section dynamique | `/sections/[sectionId]` | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| Signalement déchets | `/signalement` | `apps/web/src/app/(app)/signalement/page.tsx` |
| Déclaration rapide | `/declaration` | `apps/web/src/app/declaration/page.tsx` |
| Déclaration simple | `/declaration-simple` | `apps/web/src/app/declaration-simple/page.tsx` |

> **Note :** `/sections/[sectionId]` est une route dynamique qui couvre plusieurs rubriques (météo, kit terrain, guide…) selon l'ID.

---

## Composants clés identifiés

- `ActionDeclarationForm` → `apps/web/src/components/actions/action-declaration-form.tsx`
- `SimpleActionForm` → `apps/web/src/components/actions/simple-action-form.tsx`
- Map Leaflet → `apps/web/src/components/map/`
- `WeatherWarningBar` → `apps/web/src/components/ui/weather-warning-bar.tsx`

---

## Identité visuelle (emerald — terrain)

Couleur d'accent charte : **`emerald`**

- Fond de bloc : `bg-[linear-gradient(180deg,rgba(20,54,40,0.95),rgba(22,68,48,0.98))]`
- Overlay glow : `from-emerald-400/16 via-emerald-500/10 to-transparent`
- Bordure : `border-emerald-300/20`
- Hover border : `hover:border-emerald-300/40`
- Surface secondaire : `bg-[rgba(30,90,60,0.82)]`
- Ombre : `shadow-[0_24px_56px_-32px_rgba(52,211,153,0.28)]`
- Texte secondaire : `text-white/80`
- Chips / badges : `bg-emerald-500/14 text-emerald-100 border-emerald-200/18`

> Règle absolue : aucun blanc ni noir sur surfaces/bordures/overlays — réservé au texte uniquement.

---

## Direction UX

- Logique orientée terrain, **mobile-first** et tactile
- Chaque écran doit réduire l'effort de décision
- Interfaces de saisie guidée, contexte local, confirmation claire
- La météo sert à caler le moment, le risque et le matériel avant de sortir
- Tolérance forte aux interruptions et reprises sur mobile
- `SimpleActionForm` est la version allégée de `ActionDeclarationForm` — même workflow, moins de champs

---

## Rubriques à auditer (par priorité)

| Priorité | Rubrique | Route | Note |
|---|---|---|---|
| [CRITIQUE] | Déclaration d'action | `/actions/new` | CTA principal du produit, formulaire multi-étapes |
| [CRITIQUE] | Déclaration simple | `/declaration-simple` | Version allégée, entrée directe sans navigation |
| [HAUTE] | Carte des actions | `/actions/map` | Vue spatiale, Leaflet — performances critiques |
| [HAUTE] | Signalement déchets | `/signalement` | Saisie terrain, GPS, photo |
| [HAUTE] | Itinéraire IA | `/sections/route` | Suggestions IA, mobile-first |
| [MOYENNE] | Météo | `/sections/[sectionId]` (meteo) | Widget météo avant sortie terrain |
| [MOYENNE] | Historique actions | `/actions/history` | Consultation post-action |
| [BASSE] | Kit terrain / guide | `/sections/[sectionId]` | Contenu statique, informatif |

---

## Points de dette suspectés

- `SimpleActionForm` et `ActionDeclarationForm` : vérifier la duplication de logique
- `WeatherWarningBar` : composant UI transverse — vérifier si le style suit la charte amber ou reste générique
- Carte Leaflet : performances à vérifier sur mobile (LCP, CLS)
- Routes `/declaration` et `/declaration-simple` : deux points d'entrée distincts à clarifier dans la navigation

---

## Règles d'interface

- CTA dominants et explicites
- Étapes courtes, progressives, avec retour visible après action
- Priorité aux composants de saisie, cartes utiles, statuts et confirmations
- Tolérance forte aux interruptions et reprises sur mobile

---

## Signaux de réussite

- L'utilisateur sait quoi faire maintenant
- La déclaration peut être terminée en moins de 2 minutes
- Les erreurs sont compréhensibles et récupérables
- La météo et le kit terrain sont consultables avant de partir

---

## À éviter

- Écrans trop analytiques
- Densité visuelle inutile
- Vocabulaire abstrait
- Actions principales noyées dans des blocs secondaires
