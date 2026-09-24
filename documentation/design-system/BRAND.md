# Marque web CleanMyMap (CURRENT)

Ce contrat définit les assets de marque servis par `apps/web`. Les sources
éditables restent les trois PNG validés sous `documentation/`; le runtime ne
sert jamais directement ces fichiers.

## Registre canonique

Le registre unique est
[`apps/web/src/components/brand/brand-assets.ts`](../../apps/web/src/components/brand/brand-assets.ts)
et la primitive de rendu est
[`BrandLogo`](../../apps/web/src/components/brand/brand-logo.tsx).

| Variante | Asset runtime | Usage |
| --- | --- | --- |
| `compact` | `/brand/logo-court.png` | navigation, breadcrumb, profil et formats compacts |
| `lightSurface` | `/brand/logo-grand-clair.png` | surfaces claires, exports et rapports |
| `darkSurface` | `/brand/logo-grand-sombre.png` | navigation de marque sombre, Auth et footer |
| `social` | `/brand/github-social-preview.png` | OpenGraph et Twitter, au ratio social dédié |

Les variantes `compact`, `lightSurface` et `darkSurface` sont les trois
variantes de marque. `social` est une image éditoriale dédiée au partage et
ne remplace pas un logo dans l'interface.

## Règles d'usage

- Réutiliser `BrandLogo` pour tout logo affiché dans le runtime web.
- Réutiliser `BRAND_ASSET_PATHS` pour les métadonnées, les données structurées
  et le manifest afin d'éviter les chemins divergents.
- Les icônes du navigateur et des appareils utilisent les conventions de
  fichiers App Router `src/app/favicon.ico`, `src/app/icon.png` et
  `src/app/apple-icon.png`. Ces dérivés proviennent de
  `BRAND_ASSET_PATHS.compact`; ils ne remplacent pas l'asset canonique dans le
  registre.
- Ne pas reconstruire la marque avec une icône Lucide, du texte ou du CSS.
- Ne pas placer le logo complet dans le hero de la homepage : le H1 reste un
  contenu éditorial.
- Les PNG de `documentation/` sont des sources de référence et ne sont pas
  des chemins runtime.
