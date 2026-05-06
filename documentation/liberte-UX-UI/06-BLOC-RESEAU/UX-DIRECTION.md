# Direction UX — Bloc Réseau

## Mission

Rendre l'écosystème local lisible et activable. Ce bloc sert à voir qui fait quoi, rejoindre des dynamiques collectives et connecter les acteurs utiles. UX de **mise en relation et coordination**.

---

## Routes et fichiers réels

| Rubrique | Route | Fichier |
|---|---|---|
| Réseau partenaires | `/partners/network` | `apps/web/src/app/(app)/partners/network/page.tsx` |
| Dashboard partenaire | `/partners/dashboard` | `apps/web/src/app/(app)/partners/dashboard/page.tsx` |
| Onboarding partenaire | `/partners/onboarding` | `apps/web/src/app/(app)/partners/onboarding/page.tsx` |
| Sponsor portal | `/sponsor-portal` | `apps/web/src/app/(app)/sponsor-portal/page.tsx` |

> **Note :** Les rubriques "Opérations collectives" et "Observatoire public" mentionnées dans l'ancien fichier (`/sections/community`, `/sections/open-data`) **n'existent pas** sous ces routes. L'observatoire public est à `/observatoire` (bloc Visualiser).

---

## Composants clés identifiés

- `apps/web/src/components/partners/` — composants réseau partenaires
- `apps/web/src/components/pilotage/` — composants pilotage partenaires (si overlap)

---

## Identité visuelle (violet — réseau)

Couleur d'accent charte : **`violet`**

- Fond de bloc : `bg-[linear-gradient(180deg,rgba(36,33,76,0.95),rgba(52,39,98,0.98))]`
- Overlay glow : `from-violet-500/15 via-indigo-500/10 to-transparent`
- Bordure : `border-violet-300/22`
- Hover border : `hover:border-violet-300/42`
- Surface secondaire : `bg-[rgba(61,54,118,0.82)]`
- Ombre : `shadow-[0_24px_56px_-32px_rgba(139,92,246,0.28)]`
- Texte secondaire : `text-white/80`
- Chips / badges : `bg-violet-500/14 text-violet-100 border-violet-200/18`

> Règle absolue : aucun blanc ni noir sur surfaces/bordures/overlays — réservé au texte uniquement.

---

## Direction UX

- L'utilisateur doit pouvoir identifier rapidement les personnes, structures et dynamiques pertinentes
- Le bloc doit favoriser la confiance, la lisibilité des rôles et la capacité à se coordonner
- Le Sponsor Portal cible un profil distinct (financeurs, décideurs) — UX plus institutionnelle
- L'onboarding partenaire est une séquence guidée, distincte de la navigation principale

---

## Rubriques à auditer (par priorité)

| Priorité | Rubrique | Route | Note |
|---|---|---|---|
| [CRITIQUE] | Réseau partenaires | `/partners/network` | Annuaire activable, fiches acteurs |
| [HAUTE] | Dashboard partenaire | `/partners/dashboard` | Cockpit partenaire, KPI réseau |
| [HAUTE] | Sponsor portal | `/sponsor-portal` | Profil institutionnel, UX décideur |
| [MOYENNE] | Onboarding partenaire | `/partners/onboarding` | Séquence guidée, premier contact |

---

## Points de dette suspectés

- Routes communautaires (`/sections/community`) mentionnées dans l'ancien doc **non trouvées** — à confirmer si supprimées ou renommées
- Sponsor portal : vérifier permissions et authz (accès réservé)
- Partners network : vérifier si les fiches acteurs utilisent `CmmCard` ou un composant custom

---

## Règles d'interface

- Distinguer clairement acteurs, structures et ressources
- Privilégier les vues comparables, filtres utilitaires et fiches lisibles
- Les informations relationnelles doivent être scannables : rôle, zone, contribution, disponibilité
- Les vues communautaires doivent favoriser la participation plus que la contemplation

---

## Signaux de réussite

- L'utilisateur repère facilement les bons interlocuteurs
- Les dynamiques collectives sont visibles et compréhensibles
- Le bloc donne envie de rejoindre ou de coordonner une action

---

## À éviter

- Annuaire plat difficile à parcourir
- Cartes acteur sur-décorées
- Manque de distinction entre données publiques et interaction communautaire
- Interfaces sociales trop proches d'un réseau grand public
