# Exemples de test d'accès aux ressources

Pour une route sensible qui reçoit `resourceId` :

1. Résoudre l'identité Clerk depuis la session serveur, jamais depuis le payload.
2. Vérifier le garde `CURRENT` adapté à la méthode HTTP.
3. Charger ou muter la ressource avec un filtre canonique d'ownership/scope ; l'identifiant seul ne donne aucun droit.
4. Refuser proprement un autre propriétaire, un rôle insuffisant, un scope invalide et une ressource non admissible, sans révéler son contenu.
5. Renvoyer uniquement une projection autorisée et ne persister l'audit `success` qu'après l'effet vérifié.
6. Tester un cas autorisé, un cas interdit et un payload malformé. Une page visible ne prouve pas l'AuthZ de son API.

Les exceptions de lecture publique doivent être déclarées par route et testées séparément.
