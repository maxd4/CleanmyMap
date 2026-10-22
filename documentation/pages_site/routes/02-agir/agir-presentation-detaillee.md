# Agir — présentation fonctionnelle détaillée

**Statut : CURRENT pour l'orientation du bloc.** Owner de l'inventaire : [Agir — README](./agir-README.md) et [INDEX maître](../../INDEX.md). Les flux, accès et états détaillés restent dans les fiches des trois routes.

## Trois entrées visibles et distinctes

1. **Rejoindre une action** — `/sections/rejoindre-une-action`. Consulter les actions futures admissibles et les résultats publics passés ; une demande ou annulation d'inscription nécessite l'identité et les droits applicables. Une inscription acceptée ne constitue pas une participation terrain confirmée.
2. **Créer une action** — `/actions/new`. Composer le parcours `Essentiel → Terrain → Équipe et logistique → Vérifier et publier` et les préparations d'itinéraire, météo et formalités depuis les modules existants. Les étapes peuvent reprendre des brouillons autorisés ; les permissions, validations et projections restent des contrôles serveur.
3. **Signaler un déchet** — `/signalement`. Décrire une observation `spot` ou `clean_place` par le flux canonique et retrouver, dans le périmètre du compte, ses observations. La surface secondaire `/sections/trash-spotter` n'est pas un formulaire concurrent.

## Routes annexes et frontières

- `/missions/[id]` appartient au workflow et aux deep-links d'une mission, pas au menu primaire Agir ;
- `/actions/history` ouvre l'historique et ses opérations sous les droits de son owner, sans devenir une quatrième entrée ;
- `/sections/route`, `/sections/weather` et `/sections/guide` redirigent vers les panneaux existants du shell `/actions/new`, sans moteur supplémentaire ;
- `/sections/recycling` et `/sections/compost` demeurent non classées définitivement entre la famille terrain et les contenus pédagogiques Apprendre : aucune nouvelle attribution n'est déduite de leur catégorie runtime.

## États et invariants à préserver

La lecture publique ne confère aucun droit de création, modération, inscription ou export de données privées. Une liste vide, un chargement, une source externe dégradée, une demande refusée ou une mutation partielle doivent garder des états distincts lorsque le parcours correspondant les expose. Les Actions, la géométrie, la qualité et la participation ne sont pas recalculées par le bloc.

Une action, un résultat de sondage ou une préparation facilite une décision humaine mais ne constitue pas une décision officielle. Les captures, lorsqu'elles existent, restent dans les dossiers des pages canoniques. Pour tout nouveau CTA ou changement d'accès, relire le code, le contrat AuthZ et la fiche propriétaire plutôt que recopier une procédure ici.
