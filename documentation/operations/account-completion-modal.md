# Configuration initiale et rappel de complétion de compte

La plateforme conserve une configuration initiale du compte, mais sa complétion
n'est pas une permission générale. Les pages métier restent utilisables lorsque
leurs fonctions ne dépendent pas des informations manquantes.

## Comportement

- Si `profileSetupCompleted` est absent ou faux, ou si `profileSetupVersion` est
  absent ou inférieur à la version courante, l'état de configuration reste
  signalé au compte connecté.
- Sur une page métier, `AccountCompletionGate` affiche alors un rappel
  non bloquant et conserve le contenu de la page.
- Le parcours `/onboarding` reste l'écran dédié pour renseigner les données ;
  l'option `Configurer plus tard` reste disponible.
- Une opération qui a réellement besoin d'une donnée manquante la valide au
  moment de cette opération et peut la refuser côté serveur sans modifier les
  permissions générales.

## Portée

- Le flux plein écran d'onboarding reste disponible sur `/onboarding`.
- Le rappel se branche route par route via un composant partagé ; il ne remplace
  plus les pages métier par l'écran de configuration.
- Un blocage total n'est possible qu'avec `mode="required"` pour un invariant
  fonctionnel démontré et explicite.
- Le shell applicatif ne porte plus cette responsabilité.
- Cette logique sert à corriger les comptes déjà créés après une évolution des données utilisateur.

## Routes actuellement branchées

- `/dashboard`
- `/sponsor-portal`
- `/signalement`
- `/actions/history`
- `/partners/dashboard`
- `/partners/onboarding`
- `/reports`
- `/admin`

Ces routes affichent un rappel non bloquant lorsque la configuration est
incomplète. Leur AuthN/AuthZ et leurs validations métier restent indépendantes.
`/partners/onboarding` conserve en particulier son propre formulaire comme
propriétaire de ses champs obligatoires.

## Routes laissées hors du rappel

- `/actions/map`
- `/learn/hub`

Ces vues restent utiles sans compte complètement renseigné ; elles ne dépendent
pas du rappel de configuration.

## Données mises à jour

- rôle de profil
- localisation principale
- langue
- mode d'affichage
- version de complétion du schéma utilisateur
