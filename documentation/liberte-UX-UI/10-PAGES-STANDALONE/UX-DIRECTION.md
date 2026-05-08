# Direction UX — Pages Standalone

## Mission

Regrouper les pages transverses qui ne s'inscrivent pas dans un bloc produit. Point d'entrée, réglage ou consultation autonomes — UX immédiate et auto-suffisante.

---

## Routes et fichiers réels

| Page | Route | Fichier | Accès | Statut |
|---|---|---|---|---|
| Page publique (vitrine) | `/` | `apps/web/src/app/page.tsx` | Public | ✅ Conforme |
| Accueil personnel | `/accueil` | `apps/web/src/app/accueil/page.tsx` | Connecté | ✅ Conforme |
| Explorer | `/explorer` | `apps/web/src/app/explorer/page.tsx` | Public/Semi | ✅ Amélioré |
| Onboarding principal | `/onboarding` | `apps/web/src/app/onboarding/page.tsx` | Connecté | ✅ Créé |
| Onboarding localisation | `/onboarding/localisation` | `apps/web/src/app/onboarding/localisation/page.tsx` | Connecté | ✅ Existant |
| Réglages | `/reglages` | `apps/web/src/app/reglages/page.tsx` | Connecté | ✅ Créé |
| Mentions légales | `/mentions-legales` | `apps/web/src/app/mentions-legales/` | Public | ✅ Amélioré |
| CGU | `/conditions-generales-utilisation` | `apps/web/src/app/conditions-generales-utilisation/` | Public | ✅ Existant |
| Politique cookies | `/politique-cookies` | `apps/web/src/app/politique-cookies/` | Public | ✅ Existant |
| Politique confidentialité | `/politique-confidentialite` | `apps/web/src/app/politique-confidentialite/` | Public | ✅ Existant |
| Sign-in | `/sign-in` | `apps/web/src/app/sign-in/` | Public | ✅ Amélioré |
| Sign-up | `/sign-up` | `apps/web/src/app/sign-up/` | Public | ✅ Créé |

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

## Rubriques auditées et améliorées

| Priorité | Page | Route | Statut | Actions réalisées |
|---|---|---|---|---|
| [CRITIQUE] | Explorer | `/explorer` | ✅ **AMÉLIORÉ** | Métadonnées mises à jour pour refléter le rôle de navigation globale |
| [HAUTE] | Onboarding | `/onboarding` | ✅ **CRÉÉ** | Page principale d'onboarding avec interface claire et auto-suffisante |
| [HAUTE] | Sign-in / Sign-up | `/sign-in`, `/sign-up` | ✅ **AMÉLIORÉ** | Interfaces repensées avec panneaux d'information et navigation claire |
| [MOYENNE] | Pages légales | `/mentions-legales` | ✅ **AMÉLIORÉ** | Navigation de retour ajoutée pour améliorer l'UX |
| [BASSE] | Réglages | `/reglages` | ✅ **CRÉÉ** | Page complète avec sections organisées et navigation intuitive |

---

## Points de dette résolus

- ✅ `/reglages` créée avec interface complète et navigation intuitive
- ✅ `/explorer` métadonnées améliorées pour refléter son rôle de navigation globale
- ✅ Pages d'authentification repensées avec interfaces auto-suffisantes
- ✅ `/onboarding` principal créé pour guider les nouveaux utilisateurs
- ✅ Navigation de retour ajoutée aux pages légales

## Points de dette restants

- Pages légales : vérifier accessibilité WCAG (contraste, heading hierarchy)
- Onboarding : compléter les étapes 2 et 3 (profil et préférences)
- Réglages : implémenter la configuration des notifications

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
