# Direction UX — Bloc Piloter

## Mission

Servir la supervision, la coordination et la décision. S'adresse aux profils avec vue transverse : arbitrages, gouvernance, administration. UX de **contrôle opérationnel**.

---

## Routes et fichiers réels

| Rubrique | Route | Fichier |
|---|---|---|
| Pilotage (vue principal) | `/pilotage` | `apps/web/src/app/(app)/pilotage/page.tsx` |
| Administration | `/admin` | `apps/web/src/app/(app)/admin/page.tsx` |
| God Mode | `/admin/godmode` | `apps/web/src/app/(app)/admin/godmode/page.tsx` |
| Admin forms | `/admin/forms` | `apps/web/src/app/(app)/admin/forms/` |
| Admin services | `/admin/services` | `apps/web/src/app/(app)/admin/services/` |
| Sponsor portal | `/sponsor-portal` | `apps/web/src/app/(app)/sponsor-portal/page.tsx` |

> **Note :** L'ancien doc mentionnait `/sections/elus` (Gouvernance) — **route non trouvée**. Le pilotage réel est `/pilotage`. Le Sponsor Portal sert aussi de Portail Décideur.

---

## Composants clés identifiés

- `apps/web/src/components/pilotage/` — composants pilotage
- `apps/web/src/components/admin/` — composants administration
- `DashboardOverviewSection` → aussi utilisé dans `/dashboard`

---

## Identité visuelle (brun — pilotage)

Couleur d'accent charte : **`brun`**

- Fond de bloc : `bg-[linear-gradient(180deg,rgba(44,28,15,0.96),rgba(52,34,18,0.99))]`
- Overlay glow : `from-orange-900/10 via-stone-800/08 to-transparent`
- Bordure : `border-stone-400/18` / hover : `hover:border-stone-300/34`
- Surface secondaire : `bg-[rgba(65,42,25,0.84)]`
- Ombre : `shadow-[0_24px_56px_-32px_rgba(69,45,28,0.18)]`
- Chips / badges : `bg-orange-900/12 text-orange-100 border-stone-200/16`

---

## Direction UX

- Vues stables, denses et fiables — pas de décoration superflue
- Toujours distinguer observation, décision et exécution
- Les permissions et niveaux de criticité doivent être visibles
- Les actions irréversibles ou sensibles doivent être clairement confirmées
- God Mode : accès maximum, aucune ambiguïté sur les conséquences

---

## Rubriques à auditer

| Priorité | Rubrique | Route | Note |
|---|---|---|---|
| [CRITIQUE] | Vue Pilotage | `/pilotage` | Tableau de bord supervision, KPI transverses |
| [CRITIQUE] | Administration | `/admin` | Workflows admin, file d'attente, validations |
| [HAUTE] | God Mode | `/admin/godmode` | Accès total — confirmation irréversible obligatoire |
| [HAUTE] | Sponsor Portal | `/sponsor-portal` | Décideur externe, UX institutionnelle |
| [MOYENNE] | Admin forms | `/admin/forms` | Formulaires d'administration |
| [BASSE] | Admin services | `/admin/services` | Config services internes |

---

## Points de dette

- Palette teal/cyan à remplacer par indigo si déjà implémentée
- `/sections/elus` mentionné dans l'ancien doc — route non trouvée, à archiver ou créer
- God Mode : vérifier double confirmation + log d'audit pour actions irréversibles
- Sponsor Portal partagé avec Réseau — vérifier positionnement UX unique

---

## Règles d'interface

- Favoriser tableaux, synthèses, files d'attente, statuts et alertes actionnables
- Permissions et niveaux de criticité toujours visibles
- Actions sensibles : confirmation explicite obligatoire

## À éviter

- Présentation trop grand public
- Sur-décoration visuelle
- Actions admin mélangées avec du contenu secondaire
- Interfaces ambiguës sur les permissions ou les conséquences
