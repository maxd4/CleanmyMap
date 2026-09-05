# Où agir — Présentation détaillée

## Rôle et déclenchement

`/sections/route` est la surface protégée qui transforme une demande explicite
en proposition d'itinéraire. L'utilisateur choisit ses contraintes puis active
le calcul ; aucune recommandation automatique n'est lancée au chargement.

Deux contextes fonctionnels sont documentés :

- **Itinéraire libre** : l'origine sert de point de départ et les candidats
  disponibles sont comparés dans le périmètre du calcul ;
- **Itinéraire autour d'un événement** : lorsqu'un événement exploitable est
  fourni, il peut servir de contexte ou d'ancre, sans devenir pour autant un
  signalement de déchets.

## Entrées et contraintes

Le calcul prend en compte l'origine, le temps ou budget de déplacement,
`maxStops`, les préférences disponibles et les données terrain/contextuelles
accessibles au moment de la demande. L'origine peut être :

1. `browser`, demandée après l'action explicite de l'utilisateur ;
2. `map`, choisie et modifiable sur la carte ;
3. `approximate_saved_area`, centre approximatif résolu côté serveur.

Le budget, `maxStops`, l'éligibilité et la sécurité sont des contraintes dures.
Elles peuvent empêcher la sélection d'une zone pourtant prioritaire. Une
origine approximative, une source indisponible ou une réponse partielle reste
identifiée comme telle.

Lorsque le contrat le propose, l'orientation de la demande peut distinguer les
déchets et les mégots. Les deux risques restent distincts dans la couche
prédictive et ne sont pas présentés comme une mesure réelle de pollution.

## Candidats et priorisation

Un candidat **observé** correspond à une preuve terrain disponible et éligible.
Un candidat **prédit** correspond à une zone ou cellule issue de la pression
géospatiale ; son modèle, son millésime, sa provenance et sa confiance doivent
rester visibles. Le centroïde d'une zone sert aux calculs de proximité ou de
corridor et ne crée pas un spot observé artificiel.

La priorité peut combiner plusieurs signaux, dont le contexte urbain, les
événements, l'historique et la proximité. Les détails de formules et de poids
ne sont pas reproduits ici : ils sont maintenus dans la documentation
d'architecture liée ci-dessous.

Les exclusions pour sécurité, éligibilité, corridor, budget ou disponibilité
sont des décisions du planner. Elles ne décrivent pas l'état réel du lieu.

## Trajet et états dégradés

Le résultat de sélection est distinct du résultat du fournisseur de routage.
Une géométrie `network` correspond aux mesures et au tracé fournis par le
provider. Une géométrie `fallback` ou estimée est signalée comme telle et ne
doit pas être lue comme une précision réseau.

Les états `ok`, `empty` et `degraded` rendent visibles les cas nominaux, les
absences démontrées et les sources ou routages incomplets. `null` n'est pas
interprété comme zéro ; l'absence d'une donnée n'est pas une preuve d'absence
de pollution.

## Explicabilité et confidentialité

`Comprendre cet itinéraire` doit relier la proposition à ses éléments réels :
origine utilisée, arrêts, budget, contraintes, statut observé/prédit,
pression géospatiale, source et millésime prédictifs, routage réseau ou fallback
et éventuelles approximations. Le frontend affiche la décision et ne recalcule
pas la géographie ni le planner.

Les coordonnées précises de l'origine ne sont pas persistées dans le draft de
route, l'URL, le hash ou un cookie de route. Le refus de géolocalisation ne
déclenche pas une recommandation implicite ; le serveur peut répondre avec une
erreur d'origine si aucun fallback n'est disponible.

## Sources et documentation canonique

- page : `apps/web/src/app/(app)/sections/route/page.tsx` ;
- surface : `apps/web/src/components/sections/rubriques/route/` ;
- API : `apps/web/src/app/api/route/recommend/` ;
- domaine : `apps/web/src/lib/route/` ;
- [Méthodologie de création d'itinéraire](../../../../architecture/methodologie-creation-itineraire.md) ;
- [Créer un itinéraire](/sections/route).
