# Mode École — Liste des propositions à traiter

But : conserver uniquement les améliorations retenues mais non encore exécutées.

## Proposition 1 — Tester la banque scolaire

Priorité : haute.

Vérifier pour chaque question :

- exactitude ;
- formulation adaptée aux niveaux 6e/5e/4e/3e ;
- réponse correcte ;
- explication ;
- source ;
- statut de vérification.

Terminé quand :

- aucune question incertaine n'est présentée comme certaine ;
- les sources sont accessibles et cohérentes ;
- un test protège la structure de la banque.

## Proposition 2 — Ajouter un test de non-régression de la promesse « sans compte élève »

Priorité : moyenne.

Objectif :

éviter qu'une future évolution collecte une identité élève tout en conservant le texte actuel.

Terminé quand :

- le contrat de la page est documenté ;
- toute collecte future exige une décision explicite.

## Proposition 3 — Vérifier le lien de retour

Priorité : faible.

Le chemin historique `/learn/ressources` a été mentionné comme cible de retour, alors que le registre route-first ne le présente pas comme une destination autonome. Vérifier le CTA et le comportement effectifs dans le checkout courant avant de décider d'un éventuel correctif : ce fichier `PLAN` ne prouve pas que le lien existe encore dans l'UI.

## Règle

Une proposition terminée quitte ce fichier.

Le résultat durable est reporté dans la fiche canonique seulement s'il change le contrat de la page.
