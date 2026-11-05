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

## Exception contextuelle de l'assistant de tri

La mention d'une boîte à pizza ou d'un autre emballage en carton ne suffit pas
à conclure qu'il contient encore des restes. Un emballage en carton vide reste
dans la filière papier-carton même s'il porte des traces de graisse ou de sauce ;
l'assistant demande de retirer les restes alimentaires avant le tri. Si la
question ne précise pas si la boîte est vide, il demande cette précision sans
déduire les déchets résiduels de la seule graisse. Si l'objet n'est pas un
emballage, sa nature doit être précisée avant de choisir une filière ; la seule
mention de « carton » ou une salissure générique (« sale », « souillé »,
« contaminé ») ne constitue pas une preuve d'emballage ni de graisse
alimentaire. Une peinture, un solvant ou une autre contamination chimique
impose de vérifier la filière dédiée avant toute orientation. Les cartons
composites restent à identifier explicitement, sans être assimilés au carton
recyclable ordinaire.
Les catégories sensibles, notamment les médicaments, seringues, verre cassé et
piles, conservent leur projection de sécurité prioritaire.

Cette règle suit les consignes de l'[ADEME sur les emballages en carton](https://quefairedemesdechets.ademe.fr/categories/emballages/emballages-en-carton/),
les recommandations de l'[ADEME pour un emballage souillé par un produit dangereux](https://quefairedemesdechets.ademe.fr/dechet/emballage-souille-par-un-produit-dangereux/)
et de la [Ville de Paris sur le tri des emballages](https://www.paris.fr/pages/en-2019-paris-vous-facilite-le-tri-6266/),
à compléter par la consigne locale lorsque celle-ci diffère.
