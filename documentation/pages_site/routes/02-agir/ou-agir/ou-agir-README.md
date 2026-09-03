# Où agir

## Fiche canonique

- **Route** : `/sections/route`
- **Fichier source** : `apps/web/src/app/(app)/sections/route/page.tsx`
- **Type fonctionnel** : page protégée du bloc Agir
- **Objectif** : proposer une liste déterministe de points Trash Spotter validés
  à parcourir selon la priorité, le déplacement et le nombre d'arrêts.
- **Action principale** : cliquer explicitement sur `Calculer la recommandation`.
- **Statut V1** : livré et validé

## Contrat V1

Les seules préférences persistables sont :

- `travelBudgetMinutes` : budget strict de déplacement, en minutes ;
- `maxStops` : nombre maximal d'arrêts, borné de 1 à 12 ;
- `priorityVsTravel` : arbitrage priorité / déplacement, de 0 à 100.

Le planner est déterministe. Il part de l'origine, compte le déplacement vers
le premier arrêt, estime la marche à 4,5 km/h et ne renvoie jamais une route au-
delà du budget demandé. L'algorithme compare priorité et coût de déplacement
sur des valeurs normalisées, puis applique des départages stables.

## Origine et confidentialité

L'origine est un contexte ponctuel du calcul, jamais une préférence enregistrée.
Trois sources sont supportées dans la réponse :

- `browser` : position actuelle, demandée uniquement après clic explicite ;
- `map` : point choisi et modifiable sur la carte ;
- `approximate_saved_area` : centre approximatif de la zone enregistrée, utilisé
  par le serveur en l'absence d'origine explicite.

La route ne demande pas la géolocalisation au chargement. Une position précise
n'est conservée ni dans le draft `sessionStorage`, ni dans `localStorage`, ni
dans l'URL, le hash ou un cookie de route.

## Données, sécurité et routage

La source de candidats est constituée de données Trash Spotter validées, avec
coordonnées obligatoires et hard gate de sécurité bénévole. Les points
dangereux sont exclus fail-closed.

Le routage piéton FOSSGIS est best-effort. Une géométrie `network` expose son
provider et son profil ; lorsque le réseau est indisponible ou que le préfixe
compatible avec le budget doit être réduit, la géométrie `fallback` est
explicitement indiquée comme estimée. Aucune précision réseau n'est promise
dans ce cas.

Les réponses exposent `status: ok | empty | degraded` :

- `ok` pour une réponse nominale ;
- `empty` lorsqu'aucun arrêt exploitable n'est disponible ;
- `degraded` pour une source partielle, tronquée ou un routage dégradé.

Les diagnostics incluent notamment `loaded`, `eligible`, `excluded`,
`selected`, `sourcePartial` et `truncated`. `selected` correspond toujours au
nombre réel d'arrêts retournés. Les champs `serviceMinutesEstimate` et
`totalMinutesEstimate` restent volontairement `null` : aucun temps de collecte
ou de service n'est inventé.

## Authentification et états

La page et l'API de recommandation sont protégées. En développement local,
l'identité de bypass officielle peut rendre le CTA disponible sans fabriquer de
session ou de token Clerk ; en production, Clerk reste l'autorité d'identité.

La page distingue les états de chargement, vide, erreur d'origine et réponse
dégradée. Le calcul est toujours déclenché par l'utilisateur ; aucune
recommandation automatique n'est lancée.

## Références

- [Présentation détaillée](./ou-agir-presentation-detaillee.md)
- [Propositions à traiter](./ou-agir-liste-propositions-a-traiter.md)
- [Objectifs non pertinents](./ou-agir-objectifs-non-pertinents.md)
- [Itinéraire historique](../../../../2-BLOC-AGIR/itineraire_ia.md)
