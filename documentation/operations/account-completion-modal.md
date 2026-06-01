# Fenêtre de complétion de compte

La plateforme affiche une fenêtre modale de complétion lorsqu'un compte n'a pas toutes les informations requises pour accéder à certains contenus.

## Comportement

- Si `profileSetupCompleted` est absent ou faux, la fenêtre reste affichée.
- Si `profileSetupVersion` est absent ou inférieur à la version courante du schéma, la fenêtre s'affiche aussi, même pour les comptes existants.
- Une fois les données enregistrées, la page se rafraîchit et l'accès au contenu reprend sans redirection forcée.

## Portée

- Le flux plein écran d'onboarding reste disponible sur `/onboarding`.
- La complétion se branche route par route via un gate dédié, sur les pages qui en ont besoin.
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

Ces routes peuvent être enrichies au fil des besoins sans changer le composant modal lui-même.

## Routes laissées hors du gate

- `/actions/map`
- `/learn/hub`

Ces vues restent utiles sans compte complètement renseigné, donc elles ne sont pas bloquées par la fenêtre de complétion.

## Données mises à jour

- rôle de profil
- localisation principale
- langue
- mode d'affichage
- version de complétion du schéma utilisateur
