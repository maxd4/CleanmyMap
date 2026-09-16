# Mode de développement rapide — `CURRENT`

Ce mode s'applique uniquement lorsqu'il est demandé explicitement, par exemple
« mode de développement rapide », « un commit local par exécution » ou « pas de
push ». Il réduit le coût de l'exécution sans réduire les garde-fous de sécurité,
d'intégrité Git ou de validation du candidat.

## Contrat d'exécution

Pour un lot local, borné et à faible blast radius :

1. faire une seule passe initiale : `git fetch origin main`, vérifier `main`,
   l'état du checkout et les instructions scoped applicables ;
2. localiser le fichier ou le comportement directement concerné et lire ses
   dépendances immédiates, sans audit global ni exploration historique ;
3. modifier uniquement l'allowlist du lot ;
4. exécuter la validation la plus ciblée qui apporte une preuve suffisante,
   puis la validation `STAGED` fournie par le pre-commit ;
5. créer exactement un commit local non signé avec les seuls fichiers du lot ;
6. vérifier le SHA et l'état final, puis arrêter l'exécution.

Le push, la création de branche ou de worktree, les appels GitHub en écriture,
le navigateur, Playwright, GitNexus, les tests E2E, le build complet et les
audits globaux sont `NOT_RUN` par défaut. Ils ne sont ajoutés que si le prompt,
le blast radius ou un échec ciblé les rend nécessaires. Un échec est corrigé
uniquement s'il appartient au lot ; les erreurs étrangères sont signalées.

## Garde-fous non négociables

- préserver les changements dirty, staged et untracked hors périmètre ;
- ne jamais utiliser `git add -A`, `reset`, `clean`, stash ou force-push ;
- vérifier `git diff --cached --name-only` avant le commit ;
- ne pas présenter une validation non exécutée comme réussie ;
- si le lot touche AuthN/AuthZ, données, migrations, secrets, production,
  configuration globale ou une primitive partagée, sortir du mode rapide et
  appliquer le niveau d'investigation requis.

Ce mode ne remplace donc pas `MAIN-ONLY / SINGLE-WRITER` : il accélère la
préparation et la validation d'un lot clairement local, mais conserve son
isolation et sa clôture par commit.
