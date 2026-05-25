# Homepage Section Headings

Règle de cohérence pour les titres et sous-titres de la homepage, hors hero supérieur.

## Règle

- tous les titres de section utilisent la même taille, la même graisse et le même tracking
- tous les sous-titres utilisent la même taille, la même graisse et la même couleur
- l’introduction de section est centrée au début de chaque bloc
- le hero supérieur reste une exception et conserve sa hiérarchie propre

## Application

- `cmm-home-section-title`
- `cmm-home-section-subtitle`
- `cmm-home-section-header`

## Usage

- `cmm-home-section-header` centre l’introduction
- `cmm-home-section-title` uniformise les H2 de la homepage
- `cmm-home-section-subtitle` uniformise les paragraphes d’introduction

## Exemple

```tsx
<div className="cmm-home-section-header space-y-3">
  <h2 className="cmm-home-section-title">Titre de section</h2>
  <p className="cmm-home-section-subtitle">Sous-titre de section</p>
</div>
```
