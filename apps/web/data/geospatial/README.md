# Snapshot de pression géospatiale de Paris

`paris-pressure-snapshot.json` est le dernier snapshot local versionné utilisé
par le moteur route. Il ne déclenche aucun appel externe pendant un calcul.

Le snapshot est indexé sur les IRIS de Paris (992 zones, géographie 2024) et
conserve la provenance, le millésime, la date de rafraîchissement, le niveau de
résolution et l'état de chaque source. Une valeur inconnue reste `null`.

## Rafraîchissement

Le script `apps/web/scripts/refresh-paris-pressure-snapshot.mjs` est un
générateur offline-first. Les exports bruts sont préparés hors de la requête
route puis passés au script avec `--iris-json` et `--population-csv`; les
compléments ponctuels utilisent `--transport-json`, `--activity-json`,
`--tourism-json` et `--cleanliness-json`. Le paramètre `--refreshed-at` permet
de reproduire exactement un snapshot.

Fréquences recommandées : population et géographie annuelles ou à chaque
nouveau millésime ; trafic RATP annuel ; terrasses et marchés mensuels ou
trimestriels ; Dans Ma Rue selon la fenêtre publiée ; données touristiques à
chaque millésime institutionnel ou changement du snapshot OSM. Une source
indisponible conserve le dernier snapshot valide et son état
`unavailable`/`partial`.

Le `cleanlinessPrior` ne s'appuie ni sur le revenu ni sur le prix immobilier.
Lorsqu'il provient de Dans Ma Rue agrégé à l'arrondissement, sa résolution est
explicitement `arrondissement` et ne doit pas être interprétée comme une
mesure rue par rue. `visitorAttendance` reste `null` sans fréquentation
institutionnelle géolocalisée ; les points OpenStreetMap sous ODbL alimentent
seulement `tourismPresenceProxy`, qui est un proxy de présence et non une
mesure de flux.
