# Direction UX — Pages Standalone

## Mission

Regrouper les pages transverses qui ne s'inscrivent pas dans un bloc produit. Point d'entrée, réglage ou consultation autonomes — UX immédiate et auto-suffisante.

---

## Routes et fichiers réels

| Page | Route | Fichier | Accès |
|---|---|---|---|
| Page publique (vitrine) | `/` | `apps/web/src/app/page.tsx` | Public |
| Accueil personnel | `/accueil` | `apps/web/src/app/accueil/page.tsx` | Connecté |
| Explorer | `/explorer` | `apps/web/src/app/explorer/page.tsx` | Public/Semi |
| Onboarding | `/onboarding` | `apps/web/src/app/onboarding/page.tsx` | Connecté |
| Mentions légales | `/mentions-legales` | `apps/web/src/app/mentions-legales/` | Public |
| CGU | `/conditions-generales-utilisation` | `apps/web/src/app/conditions-generales-utilisation/` | Public |
| Politique cookies | `/politique-cookies` | `apps/web/src/app/politique-cookies/` | Public |
| Politique confidentialité | `/politique-confidentialite` | `apps/web/src/app/politique-confidentialite/` | Public |
| Sign-in | `/sign-in` | `apps/web/src/app/sign-in/` | Public |
| Sign-up | `/sign-up` | `apps/web/src/app/sign-up/` | Public |

> **Note :** L'ancien doc listait `/accueil` et `/reglages`. `/reglages` **n'a pas été trouvée** dans la structure actuelle.
> La page vitrine `/` est traitée en détail dans `01-ACCUEIL`.
> `/accueil` est traitée en détail dans `02-BLOC-ACCUEIL`.

---

## Composants clés identifiés

- Page vitrine → `apps/web/src/components/accueil/` (HomeHero, HomePillars, etc.)
- Onboarding → `apps/web/src/app/onboarding/`
- Sign-in/Sign-up → Clerk (composants external)

---

## Identité visuelle

Ces pages utilisent des palettes **propres à leur rôle** :

- `/` (vitrine) : bleu-vert `from-[#1e4a5f] via-[#275566] to-[#376b74]` — voir `01-ACCUEIL`
- `/accueil` (personnel) : orange/ambre — voir `02-BLOC-ACCUEIL`
- `/explorer` : à vérifier — plein écran carte
- Pages légales : fond clair probable (`bg-white` ou `bg-slate-50`) — **exception admise** pour ces pages utilitaires

---

## Rubriques à auditer

| Priorité | Page | Route | Note |
|---|---|---|---|
| [CRITIQUE] | Explorer | `/explorer` | Carte plein écran, entrée publique majeure |
| [HAUTE] | Onboarding | `/onboarding` | Première expérience utilisateur connecté |
| [HAUTE] | Sign-in / Sign-up | `/sign-in`, `/sign-up` | Friction d'entrée — Clerk, personnalisation limitée |
| [MOYENNE] | Pages légales | `/mentions-legales`, `/cgu`, etc. | Lisibilité, accessibilité |
| [BASSE] | Réglages | `/reglages` | **Route non trouvée** — à créer ou confirmer suppression |

---

## Points de dette

- `/reglages` mentionné dans l'ancien doc : **non trouvé** — feature planifiée ou supprimée ?
- `/explorer` hors layout `(app)/` — authz à vérifier
- Pages légales : vérifier accessibilité WCAG (contraste, heading hierarchy)
- Onboarding : vérifier si flux complet ou squelette

---

## Règles d'interface

- Chaque page doit pouvoir être comprise sans contexte fort de bloc
- Hiérarchie simple : intention → action → repère → confirmation
- Actions principales visibles rapidement sur desktop comme mobile
- Pages de préférence : minimiser charge cognitive et allers-retours

## À éviter

- Recycler mécaniquement les codes d'un bloc produit pour une page transversale
- Interfaces trop denses pour des pages d'entrée ou de réglage
- Effets décoratifs qui concurrencent la compréhension immédiate
