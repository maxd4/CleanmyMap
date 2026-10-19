# Recyclage — contrat de chargement détaillé

## Surface et données essentielles

La surface `/sections/recycling` reste publique. Elle charge automatiquement
les projections publiques bornées des actions approuvées et de la carte, ainsi
que les informations pédagogiques et l’assistant de tri. Ces lectures alimentent
le résumé public et ne doivent pas être supprimées au seul motif que la
ventilation détaillée est facultative.

Le snapshot de ventilation contient les flux de déchets, le volume total, la
couverture de mesure, la qualité de tri et sa date de génération. Il reste
privé derrière `GET /api/recycling/breakdown`, qui conserve
`requireAuthenticatedAccess` avant toute reconstruction ou lecture du snapshot.
Une absence de données reste distincte de zéro.

## Chargement volontaire

Le CTA « Voir la répartition détaillée des déchets » est le seul déclencheur du
panneau privé. Avant le clic, ou lorsque Clerk confirme une session absente,
la clé SWR est `null` et `/api/recycling/breakdown` n'est pas appelé. Le visiteur
anonyme reçoit un accès requis avec un lien de connexion ; l'interface ne
déclenche donc pas un 401 privé involontaire.

Après un clic autorisé, le panneau affiche séparément les états de chargement,
indisponible, erreur et succès, puis rend les flux et les indicateurs de qualité
issus du snapshot réel. Les options `swrRecentViewOptions` conservent le résultat
en mémoire pendant la consultation et évitent les rechargements automatiques
ou les doublons lors d'un retour à une vue récente. Les informations
pédagogiques et l'assistant restent indépendants de cette lecture privée.
