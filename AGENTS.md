# Regles strictes de travail local

## Interdiction de creer des dossiers projet paralleles

Il est strictement interdit de creer un nouveau dossier sibling, une copie du depot, un worktree Git ou tout autre dossier projet parallele a cote de `CleanmyMap-main` sans autorisation explicite de l'utilisateur.

Cette interdiction s'applique a tous les agents, modeles et automatisations travaillant sur ce projet.

Concretement, ne pas creer de dossier du type :
- `CleanmyMap-*`
- `CleanmyMap-main-*`
- `.worktrees/*`
- `worktrees/*`
- toute copie locale du depot hors du dossier courant

Tout travail doit rester dans :
`C:\Users\sophi\Desktop\MAXENCE\business\CleanmyMap-main`

Si une isolation Git est necessaire, demander d'abord l'accord explicite de l'utilisateur et expliquer :
- le nom du dossier qui serait cree ;
- la raison precise ;
- la duree de conservation ;
- la procedure de fusion et suppression.

Sans cet accord, utiliser uniquement la branche courante et les fichiers du dossier `CleanmyMap-main`.
