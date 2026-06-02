# Gestion des erreurs

Objectif: afficher une erreur avec la surface la plus légère possible, tout en gardant une sortie claire pour l'utilisateur.

## Types d'erreurs

### 1. Validation
- Source: données invalides, champ requis manquant, format incorrect.
- Surface recommandée: `InlineFieldError` sous le champ concerné.
- Message recommandé: `Le sujet doit contenir au moins 4 caractères.`
- Action recommandée: corriger le champ.

### 2. Network
- Source: connexion coupée, timeout, fetch impossible.
- Surface recommandée: `NetworkToast`.
- Message recommandé: `Connexion perdue. Nouvelle tentative dans 5 secondes.`
- Actions recommandées: `Réessayer maintenant`, `Rafraîchir`.

### 3. Server
- Source: erreur 5xx, réponse incohérente, problème technique côté service.
- Surface recommandée: `ServerErrorCard` ou bannière locale.
- Message recommandé: `Une erreur est survenue de notre côté.`
- Actions recommandées: `Réessayer`, `Contacter le support`.

### 4. Permission
- Source: accès refusé, session expirée, page protégée.
- Surface recommandée: `PermissionErrorState`.
- Message recommandé: `Vous n'avez pas accès à cette page.`
- Actions recommandées: `Se connecter`, `Retour au tableau de bord`.

## Composants centralisés

- `ErrorMessage`: base visuelle réutilisable.
- `InlineFieldError`: validation inline sous un champ.
- `NetworkToast`: toast non bloquant pour le réseau.
- `ServerErrorCard`: état bloquant local avec retry.
- `PermissionErrorState`: état d'accès refusé avec sortie claire.
- `ErrorBoundary`: fallback global pour les erreurs runtime.

## Règles UX

- Ne pas afficher `An error occurred` ou équivalent machine.
- Ne pas utiliser une modal 500 pour une simple erreur de formulaire.
- Désactiver le submit si les champs obligatoires sont invalides.
- Ne pas envoyer de requête si la validation client échoue déjà.
- Toujours proposer une action de sortie: corriger, réessayer, rafraîchir, se reconnecter, ou contacter le support.

## Anti-patterns

- Modal bloquante pour une erreur de champ.
- Message vague sans contexte.
- Bouton de retry sans effet réel.
- Erreur réseau affichée comme une erreur serveur définitive.
- Même surface pour validation, réseau, serveur et permission.
