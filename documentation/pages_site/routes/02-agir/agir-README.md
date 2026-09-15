# Agir

Parcours de déclaration, préparation terrain, orientation, signalement et coordination.

## Fiche de bloc

- **Nom canonique** : Agir
- **Dossier canonique** : `02-agir`
- **Snapshots** : colocalisés dans le dossier `screenshots/desktop/` ou
  `screenshots/mobile/` de chaque page canonique.

## Inventaire des pages

L’inventaire exhaustif des routes canoniques, alias et fiches est tenu dans
[`INDEX.md`](../../INDEX.md). Le contrat de famille runtime est décrit dans
[`PAGE_FAMILIES.md`](../../PAGE_FAMILIES.md).

## Frontière avec les rubriques non classées

Les sections suivantes existent dans le runtime mais ne sont pas rattachées ici sans décision produit explicite :

```txt
/sections/recycling
/sections/compost
```

Leur présence dans la catégorie runtime `terrain` ne suffit pas à trancher leur famille documentaire définitive, car les contenus de tri et compost existent aussi dans le bloc Apprendre.

## Snapshots

Les snapshots sont colocalisés dans le dossier de la page concernée, sous
`screenshots/desktop/` ou `screenshots/mobile/`.

## Maintenance

Après modification d'une route du bloc :

```bash
npm run audit:pages-site-drift
```
