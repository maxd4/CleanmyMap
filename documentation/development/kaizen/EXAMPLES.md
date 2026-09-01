# Exemples Kaizen

Ces exemples illustrent la méthode. Ils ne constituent pas des prescriptions à appliquer sans lecture du code courant.

## Exemple 1 — cas limite réellement non couvert

### Observation

Une fonction métier suppose qu'une collection est toujours non vide alors que son type autorise `null` ou `undefined`, et aucun appelant ne garantit cette précondition.

### Bonne réaction

- vérifier les appelants et les tests ;
- décider si la bonne correction est une validation à l'entrée, un type plus strict ou un état vide explicite ;
- ajouter un test sur le cas limite ;
- corriger à la frontière la plus claire.

### Mauvaise réaction

Ajouter `?? []` partout sans comprendre si l'absence de données signifie réellement « zéro élément » ou une erreur métier.

## Exemple 2 — duplication de logique métier

### Observation

Le même calcul est implémenté dans plusieurs modules et commence à diverger.

### Bonne réaction

- comparer les variantes ;
- identifier le contrat commun réel ;
- extraire uniquement si une source canonique claire existe ;
- migrer les tests vers cette source sans casser les exceptions de domaine.

### Mauvaise réaction

Créer un helper générique simplement parce que deux blocs de code se ressemblent visuellement.

## Exemple 3 — document actif en contradiction avec le runtime

### Observation

Une documentation affirme qu'une source de données est encore utilisée, mais le code courant ne la lit plus et conserve seulement une compatibilité historique.

### Bonne réaction

- vérifier code et tests ;
- corriger la documentation canonique ;
- conserver l'explication de compatibilité historique si elle reste nécessaire ;
- supprimer ou historiser les documents secondaires concurrents.

### Mauvaise réaction

Modifier le runtime pour qu'il corresponde à un document ancien.

## Exemple 4 — warning TypeScript ou lint révélant une faiblesse

### Observation

Un `useEffect` sert à recalculer un état purement dérivé et produit un warning récurrent.

### Bonne réaction

- vérifier qu'il n'existe aucun effet de bord ;
- calculer directement ou utiliser `useMemo` si le coût le justifie ;
- supprimer l'état dupliqué ;
- relancer le check ciblé.

### Mauvaise réaction

Désactiver la règle ESLint ou ajouter un commentaire d'ignore sans justification.

## Exemple 5 — composant volumineux

### Observation

Un composant est long et difficile à modifier, mais sa longueur seule ne dit pas où couper.

### Bonne réaction

- cartographier responsabilités, état, effets, données et ordre d'exécution ;
- identifier une frontière stable et testable ;
- extraire seulement cette responsabilité ;
- préserver props, effets de bord et ordre des opérations ;
- comparer les tests avant/après.

### Mauvaise réaction

Découper arbitrairement par blocs de lignes ou créer plusieurs composants façades sans responsabilité propre.

## Exemple 6 — amélioration UI justifiée

### Observation

Une action asynchrone n'expose ni état de chargement, ni erreur exploitable, et permet plusieurs soumissions identiques.

### Bonne réaction

- empêcher la double soumission ;
- fournir un feedback de progression ;
- exposer une erreur utilisateur utile ;
- préserver l'accessibilité clavier et lecteur d'écran ;
- vérifier le design system existant.

### Mauvaise réaction

Ajouter une animation ou un effet visuel sans résoudre l'état fonctionnel.

## Exemple 7 — performance mesurée

### Observation

Une requête ou un calcul coûteux est exécuté à répétition et une mesure montre qu'il domine réellement le coût du parcours.

### Bonne réaction

- caractériser fréquence, taille et invalidation ;
- choisir cache, memoïsation, pagination ou restructuration en fonction du contrat ;
- mesurer à nouveau après modification ;
- documenter la stratégie seulement si elle devient durable.

### Mauvaise réaction

Ajouter un cache parce qu'un appel « semble cher » sans définir sa politique d'invalidation.

## Exemple 8 — donnée scientifique non sourcée

### Observation

Une métrique publique utilise un coefficient dont la provenance n'est pas documentée.

### Bonne réaction

- rechercher la source canonique déjà utilisée par le projet ;
- si elle existe, relier la métrique à cette source ;
- si elle n'existe pas, signaler le manque au lieu d'inventer une référence ;
- distinguer mesure, dérivation et proxy.

### Mauvaise réaction

Attribuer un chiffre à une institution ou à une publication sans l'avoir vérifié.

## Exemple 9 — opportunité hors périmètre

### Observation

En corrigeant une route API, l'agent remarque qu'une page voisine pourrait être simplifiée.

### Bonne réaction

Classer l'idée `FOLLOW_UP` et terminer le lot courant sans toucher à la page voisine.

### Mauvaise réaction

Inclure la refonte voisine dans le même commit au nom du Kaizen.

## Exemple 10 — innovation spéculative

### Observation

Aucun problème utilisateur n'est démontré, mais une nouvelle technologie paraît intéressante.

### Bonne réaction

`NO_ACTION` tant qu'un besoin, une preuve ou une expérimentation explicitement demandée ne justifie pas l'ajout.

### Mauvaise réaction

Proposer automatiquement WebSocket, Redis, D3, Framer Motion, notifications push, gamification ou nouvelle dépendance comme signe de modernité.

## Format court de signalement

Pour une opportunité hors périmètre :

```text
FOLLOW_UP — <problème observé>
Preuve : <fait vérifiable>
Bénéfice attendu : <sans métrique inventée>
Périmètre probable : <zone concernée>
```

Ce format sert à préserver l'information sans transformer chaque observation en nouveau chantier.
