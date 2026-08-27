# Gouvernance locale — `documentation`

Héritage : gouvernance racine → ce périmètre documentaire. Ce fichier gouverne
la documentation spécialisée sans créer une hiérarchie concurrente dans ses
sous-dossiers.

## Source durable et sélection

- une documentation spécialisée est la source durable du domaine concerné ;
- documenter uniquement un contrat, une architecture, une règle de sécurité,
  une exploitation, un comportement ou une connaissance durable pertinente ;
- ne pas modifier le README ou le changelog global à chaque changement ;
- éviter toute duplication : préférer le lien vers la source canonique ;
- créer un nouveau document uniquement lorsqu'aucun emplacement canonique
  existant ne convient.

Lorsqu'un dossier porte une responsabilité, un point d'entrée ou une procédure
durable, son README peut orienter vers les documents canoniques, sans recopier
leur contenu. Après une réorganisation significative, vérifier les README
concernés et les références actives. Pour un sujet mixte, garder le résumé
fonctionnel dans la fiche de page et le détail technique dans le dossier
spécialisé approprié.

`documentation/pages_site/README.md` est le point d'entrée local du registre
route-first et porte les conventions spécifiques de ses routes ;
`documentation/pages_site/INDEX.md` en est l'inventaire maître. Ne pas créer
une seconde hiérarchie locale tant que ces conventions sont correctement
portées par ce README.

## États et historique

Toujours distinguer :

- état actuel ;
- proposition ou roadmap ;
- ADR ;
- historique ;
- audit ;
- snapshot.

Un document historique reste historique et ne doit pas être réécrit comme état
courant. Après le déplacement ou le renommage d'un fichier canonique, mettre à
jour les références actives ; ne pas corriger les snapshots historiques
uniquement pour moderniser leurs chemins.

## Public, interne et formats

- distinguer clairement les documents publics des documents internes ;
- ne jamais inventer une source, une mesure, un chiffre ou une référence ;
- respecter le format et les conventions du dossier concerné, notamment les
  titres Quarto sans numérotation manuelle ;
- conserver les limites, hypothèses et validations utiles à l'interprétation.

Avant clôture, vérifier le document contre le code ou le contrat actuel
lorsqu'il décrit le présent, contrôler les liens actifs et exécuter les checks
documentaires pertinents.

Tous les deux ou trois prompts consacrés à un même chantier, réévaluer la
documentation canonique si le comportement, une décision, une validation ou
une limite a changé ; ne pas produire de modification documentaire
artificielle lorsqu'aucune information n'a changé.
