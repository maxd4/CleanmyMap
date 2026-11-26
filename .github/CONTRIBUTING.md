# Contribuer à CleanMyMap

Merci de proposer des améliorations ciblées, vérifiables et respectueuses des
données des utilisateurs. Le projet est public ; le droit de proposer un
changement n'accorde ni accès aux données privées ni permission de déploiement.

## Proposer un changement

1. Lire le [README](../README.md) et rechercher une issue ou PR existante.
2. Pour une évolution importante, décrire d'abord le besoin, le comportement
   attendu et les surfaces concernées. Utiliser les formulaires d'issue adaptés.
3. Pour une correction de code externe, proposer une Pull Request depuis son
   propre fork vers `main`. La branche canonique du projet conserve son
   workflow interne coordonné ; les contributions externes ne nécessitent pas
   un accès d'écriture au dépôt principal.
4. Expliquer la cause, les modifications, leurs limites, les tests réellement
   exécutés et leurs résultats. La [politique de validation](../documentation/development/TESTING.md)
   et les règles scoped applicables restent les sources de vérité.
5. Ne pas demander ni publier de secrets, données personnelles, dumps,
   captures authentifiées, cookies ou identifiants de production.

Pour les vulnérabilités exploitables, utiliser exclusivement le canal de
[signalement de sécurité](../SECURITY.md), pas une issue ni une PR publique.

## Environnement de développement

Le dépôt utilise Node.js 24.x et un lockfile npm commun. Depuis la racine :

```bash
npm ci
```

Lire ensuite le [README Web](../apps/web/README.md) ou le
[README Mobile](../apps/mobile/README.md). Pour travailler sur le Web,
partir du modèle `apps/web/.env.local.example` et utiliser uniquement un
environnement de développement autorisé ; ne jamais recopier les clés du
mainteneur ou connecter une copie de développement à la production.
Le démarrage complet dépend des services configurés. Une contribution
documentaire ou un test isolé ne requiert pas ces services.

Ne pas lancer les commandes de bootstrap distant, de migration, de nettoyage
ou de déploiement pour vérifier une modification locale.

## Validation et revue

Choisir les tests correspondant au changement, par exemple un fichier de test
Web depuis la racine :

```bash
npm run test -w apps/web -- src/chemin/du/fichier.test.ts
```

Le chemin ci-dessus est un exemple à remplacer par un test existant.
Les contrôles GitHub utilisent des permissions réduites. Certains tests
d'intégration ne peuvent pas être exécutés depuis un fork sans identifiants
de développement : signaler cette limite, sans contourner la sécurité ni
demander que des secrets soient exposés à une PR externe. L'intégrateur
autorisé décide des preuves complémentaires nécessaires.

Les contributions assistées par IA suivent les mêmes exigences que les autres :
relire le code réel, vérifier les hypothèses et ne pas inventer de preuve.
Préférer une correction cohérente aux refactorisations hors périmètre.

Les contributions de code relèvent de la [licence AGPL-3.0-only](../LICENSE) ;
les données tierces, médias et la marque ont leurs conditions propres (voir la
[documentation juridique](../documentation/legal/README.md)). Une PR ne
constitue pas une promesse de fusion, de support ni de mise en production.
