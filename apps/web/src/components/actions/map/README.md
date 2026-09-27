# Carte des Actions

Cette arborescence porte la composition React de la carte Actions : filtres,
marqueurs, couches, popups, export et états d'affichage.

## Frontière avec le domaine

```text
components/actions/map/
→ composition visuelle, interactions et états UI

lib/actions/ et lib/geo/
→ contrats, règles métier, géométrie et normalisation
```

Les composants consomment les contrats canoniques mais ne recréent ni la
taxonomie Actions, ni les règles de qualité, ni les calculs géographiques.
Les données observées, prédites, réseau et fallback doivent rester distinguées
dans l'affichage ; un état inconnu ne doit pas devenir une affirmation visuelle.

Les helpers purs liés à un rendu peuvent rester dans ce dossier lorsqu'ils
appartiennent réellement à la carte. Un contrat réutilisable hors UI doit
rejoindre son module domaine propriétaire.

## Validation

Conserver les tests auprès de la capacité qu'ils vérifient. Pour un changement
local :

```text
npm run test -w apps/web -- src/components/actions/map
npm run typecheck -w apps/web
npm run lint -w apps/web
```
