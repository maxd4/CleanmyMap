# Environnement local et diagnostics host

## Objet

Ce document porte les contraintes de diagnostic propres au poste local.
Il complète la gouvernance racine sans modifier le workflow
`MAIN-ONLY / SINGLE-WRITER`.

Les règles spécifiques aux hooks, candidats Git et validations restent dans le
périmètre de gouvernance des scripts et dans
`documentation/development/TESTING.md`.

## Copies et temporaires

La racine du dépôt est l’unique emplacement canonique du projet.

Ne pas créer ni conserver hors de cette racine :

- clone Git ou worktree ;
- copie persistante du dépôt ;
- backup ou staging durable du projet ;
- snapshot destiné à devenir une seconde source de travail.

Cette règle couvre aussi `%TEMP%`, `%TMP%`, `%LOCALAPPDATA%`, le dossier parent
`business` et les dossiers frères. Utiliser uniquement les emplacements
canoniques prévus dans le dépôt (`work/`, `artifacts/` ou `.artifacts/`) pour
les artefacts et preuves.

Une candidate de validation dynamique doit rester sous
`.artifacts/validation/prepush-candidate/<sha>/`. Une contrainte technique
imposée par un outil ne vaut pas autorisation générale de dupliquer le projet.
Avant la clôture, vérifier qu'aucune copie externe n'a été créée par le lot.

## Verrous Git

`.git/index.lock` ne doit jamais être supprimé par réflexe.

Une suppression ciblée n’est permise qu’après vérification qu’aucune opération
Git mutatrice pertinente n’est encore active et qu’aucun état
`MERGE`, `REBASE`, `CHERRY_PICK` ou `REVERT` n’est en cours. Vérifier aussi
que le fichier est nul en octets et inchangé depuis au moins 30 secondes.

Si le lock réapparaît après une suppression justifiée, arrêter le lot avec un
diagnostic `HOST_ENVIRONMENT` plutôt que répéter les suppressions.

Ne jamais tuer globalement `git.exe`, `fsmonitor` ou d’autres processus Git.
Identifier le processus et le dépôt réellement concernés.

## Diagnostics volumineux

Les captures ProcMon, ETW ou équivalentes doivent être :

- filtrées avant capture lorsque possible ;
- bornées dans le temps ;
- limitées au processus, chemin ou événement utile ;
- traitées par requête ou export ciblé plutôt que chargées intégralement.

Obtenir une autorisation explicite avant une capture susceptible de dépasser
1 Go ou avant le chargement intégral d’un fichier de diagnostic d’au moins
500 Mo. Ne jamais charger ou parcourir intégralement une capture volumineuse
en Python sans cette autorisation ; préférer une requête native, une fenêtre
courte ou un export filtré.

Arrêter plutôt que provoquer volontairement une consommation RAM ou disque non
bornée.

## Processus et charge machine

Ne pas lancer plusieurs commandes lourdes concurrentes sans besoin démontré.

Exécuter séquentiellement les suites lourdes de tests, builds, E2E ou analyses
lorsqu’elles peuvent se concurrencer pour les mêmes ressources.

Après validation, arrêter les serveurs, watchers, workers ou processus lancés
par le lot.

Éviter l’exploration non ciblée des répertoires générés ou volumineux tels que
`node_modules/`, `.next/`, `.vercel/`, `artifacts/` et `backups/`.

## Runtime conteneurisé local

Docker, WSL et les runtimes de conteneurs ne font pas partie de
l’environnement local supporté lorsqu’un contrat spécialisé du dépôt l’indique.

Ne pas installer, démarrer ou arrêter un runtime conteneurisé uniquement pour
contourner cette contrainte. Une CI hébergée et éphémère explicitement prévue
peut utiliser son propre runtime.

Classifier une dépendance locale impossible à satisfaire sous
`HOST_ENVIRONMENT` ou le diagnostic spécialisé prévu par la documentation du
domaine.

## Outils utilisateur

Un workaround propre à Codex Desktop, à une configuration utilisateur locale
ou à un outil externe ne constitue pas un contrat du dépôt. Ne pas transposer
automatiquement dans la gouvernance du dépôt, les scripts ou la documentation
canonique une configuration locale telle que `config.toml`, un mode Git Review
ou un réglage de poste.
