# Agir

Parcours pour rejoindre une action, créer une action et signaler un déchet.

## Fiche de bloc

- **Nom canonique** : Agir
- **Dossier canonique** : `02-agir`
- **Snapshots** : colocalisés dans le dossier `screenshots/desktop/` ou
  `screenshots/mobile/` de chaque page canonique.

## Entrées visibles

Le bloc Agir contient exactement trois entrées utilisateur, quel que soit le
mode d'affichage :

1. `/sections/rejoindre-une-action` — **Rejoindre une action**
2. `/actions/new` — **Créer une action** (shell unique : pré-formulaire, itinéraire, météo & conditions terrain, formalités juridiques)
3. `/signalement` — **Signaler un déchet**

Une action ou un sondage aide à préparer un arbitrage ; son résultat ne vaut pas
décision officielle. `/missions/[id]` reste une route de workflow et de
deep-link, jamais une rubrique primaire. Les anciennes routes de préparation,
d'orientation et d'historique restent accessibles hors de cette navigation.

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
