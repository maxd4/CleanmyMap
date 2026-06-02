# Texture Surfaces CleanMyMap

Référence pour ajouter une profondeur visuelle discrète sur les cartes et grands panneaux du site, sans ajouter d'image externe ni de bruit gênant la lecture.

## Intention

- conserver la couleur propre de chaque surface
- ajouter un effet premium inspiré de la carte, du terrain, du GPS et de la nature
- rester lisible à 100% sur mobile et desktop
- limiter l'effet à des surfaces majeures

## Règles

- opacité de texture entre `5%` et `12%` maximum
- privilégier les gradients superposés, motifs topographiques légers et halos radiaux
- utiliser `background-blend-mode` pour fondre les couches
- ne pas ajouter de grain fort, ni de bruit visible, ni d'image raster
- éviter les textures sur les tableaux, formulaires denses, listes techniques et zones de lecture longue

## Classes disponibles

- `cmm-surface-texture-white`
  - pour les cartes claires et les surfaces allégées
  - fond blanc avec halos verts très discrets et lignes topographiques légères

- `cmm-surface-texture-emerald`
  - pour les grands panneaux verts et surfaces d'impact
  - fond vert profond avec halos et courbes cartographiques très subtiles

## Surfaces recommandées

- cartes principales de rubrique
- grands panneaux hero
- panneaux de crédibilité / preuve
- surfaces de synthèse où la hiérarchie repose sur peu de contenu

## Surfaces à éviter

- formulaires
- tableaux denses
- cartes denses avec beaucoup de texte
- états système d'erreur ou de chargement

## Exemple d'usage

```tsx
<article className="rounded-[1.5rem] border border-emerald-200/80 cmm-surface-texture-white p-5">
  ...
</article>

<section className="rounded-[2.5rem] border border-white/10 cmm-surface-texture-emerald">
  ...
</section>
```

## Note d'implémentation

La texture doit rester dans la couche de fond CSS de la surface.  
Éviter les overlays séparés quand la classe utilitaire suffit, pour ne pas multiplier les couches visuelles.
