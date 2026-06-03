# Registre des familles de pages (`page-families`)

## Objectif

Centraliser **fond de page**, **tokens hero** (titre / sous-titre) et **cartes rubrique** par bloc — sans recopier des classes dans chaque `page.tsx`.

**Plan détaillé et limites hors périmètre** : [`PAGE_FAMILIES_PLAN.md`](./PAGE_FAMILIES_PLAN.md)

**Mémoire de non-régression** : [`PAGE_FAMILIES_NON_REGRESSION.md`](../pages_site/PAGE_FAMILIES_NON_REGRESSION.md)

## Emplacement code

| Rôle | Chemin |
|------|--------|
| Registre + résolution | `apps/web/src/lib/ui/page-families/` |
| Registre canonique runtime | `apps/web/src/lib/ui/page-families/families/registry.ts` |
| Manifeste partagé runtime/doc | `apps/web/src/lib/ui/page-families/page-families.manifest.json` |
| Presets cartes | `apps/web/src/lib/ui/page-families/card-presets.ts` |
| Fond global | `apps/web/src/lib/ui/backdrop-tone.ts` → `resolvePageFamily` |
| Hero canonique | `apps/web/src/components/ui/page-header.tsx` |
| Alias historique | `apps/web/src/components/ui/page-hero.tsx` |
| Cartes rubrique | `apps/web/src/components/ui/family-rubrique-card.tsx` |
| Hook client | `usePageFamily()` |

## Modifier une famille (ex. bloc 01)

1. **Hero + carte bloc** : `families/registry.ts` et `card-presets.ts` (`ACCUEIL_PILOTAGE_CARD`).
2. **Routes** : `resolve-page-family.ts` → `resolveBasePageFamilyId`.
3. **Exceptions** : `exceptions.ts` (sommaire, méthodologie, …).
4. **Manifeste** : `page-families.manifest.json` si le label, la portée ou le ton changent.
5. **Non-régression** : vérifier le test `registry-manifest.test.ts`.

## Ce qui est centralisé

| Couche | Oui / Non |
|--------|-----------|
| Fond de page | Oui |
| Titre / sous-titre de page | Oui |
| `RubriqueCard` via `FamilyRubriqueCard` | Oui (phase 2) |
| KPI, panneaux métier, sommaire `/explorer` | Non — voir plan § limites |

## Erreurs déjà corrigées

- `/accueil` a été supprimée comme alias caché.
- Le bloc 01 n'a plus de fichier `defaults.ts` concurrent.
- Le registre runtime est maintenant unique dans `families/registry.ts`.
- Le générateur documentaire lit le même manifeste que le runtime.
- Les tests de cohérence empêchent un décalage entre doc et code.

## Exceptions actuelles

| Id | Route | Effet |
|----|-------|--------|
| `explorer-sommaire` | `/explorer` | Fond `yellow` ; **cartes** = `BLOCK_THEME` local |
| `methodologie-impact` | `/methodologie` | Fond + hero `red` |

Overrides implicites : `/reports`, `/sections/gamification`, `/partners/*`, `/error/429`.

## Usage

### Hero

```tsx
import { PageHeader } from "@/components/ui/page-header";
import { getPageFamilyById } from "@/lib/ui/page-families";

<PageHeader
  family={getPageFamilyById("accueil-pilotage")}
  eyebrow="Cockpit opérationnel"
  title="Mon tableau de bord"
/>
```

### Carte rubrique

```tsx
import { FamilyRubriqueCard } from "@/components/ui/family-rubrique-card";

<FamilyRubriqueCard withTopBar topBarContent="Accès prioritaires" className="p-12">
  …
</FamilyRubriqueCard>
```

`SectionShell` et `FamilyRubriqueCard` résolvent la famille via le pathname si vous ne passez pas `family` explicitement.

## Migration

| Bloc | Hero | Cartes rubrique |
|------|------|-----------------|
| 01 Accueil & Pilotage | Fait | Fait (`/profil/[profile]`) |
| 02 Agir | `SectionShell` (famille) | Pilote : `/signalement` |
| 03–05 | Définition base dans `families/registry.ts` | À faire |

Voir le tableau de phases dans [`PAGE_FAMILIES_PLAN.md`](./PAGE_FAMILIES_PLAN.md).
