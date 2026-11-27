# Couverture des contacts en France métropolitaine

Statut : comportement intégré côté Web pour les recherches déclenchées par l'organisateur. Source propriétaire : modules `apps/web/src/lib/actions/formalities/` ; cette fiche reste un PLAN des sources et couvertures non encore exhaustives. Pas de duplication d'annuaire permanent.

| Besoin | Source primaire | Nature |
|---|---|---|
| Compétence administrative | DILA compétence géographique + fiches services | Recherche dynamique, limitée aux catégories interrogées |
| Communes couvertes par la géométrie | IGN API Carto limites administratives | Intersection du point/de la géométrie enregistrée ; ne prouve pas toute l'action ni sa compétence juridique |
| Déchets, collecte, syndicats | BANATIC, ADEME SINOE | Liens d'orientation ; import non réalisé |
| Matériel et reprise | Service de propreté, gestionnaire effectif, associations | Confirmation locale indispensable |
| Associations | World Cleanup Day, JeVeuxAider, Surfrider | Annuaires et réseau, pas inventaire exhaustif |
| Espaces naturels et voies d'eau | OFB, réserves, PNR, VNF | Identifier le gestionnaire compétent |
| Assurance, sécurité | Service Public, assureur, services territoriaux | Information ; aucun accord présumé |

Ne pas générer d'adresse électronique, de compétence ou de délai local non sourcé. Aucun contact ne doit être présenté comme accord. La recherche IGN/DILA est lancée par l'organisateur, utilise les données publiques de géométrie et de service, et n'envoie pas les données personnelles de l'organisateur à DILA. Elle reste indépendante des obligations et ne bloque pas une action si indisponible. Les seuils, résultats partiels et erreurs restent visibles. Un échantillon de l'annuaire nantais a retourné mairie, EPCI, DDT, DREAL, préfecture, commissariat et SDIS ; cette requête n'est pas une validation exhaustive de la taxonomie ni de la couverture des contacts. Voir README_CODEX.md pour les preuves et limites de ce lot.
