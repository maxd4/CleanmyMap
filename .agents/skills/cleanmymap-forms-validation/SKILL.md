---
name: cleanmymap-forms-validation
description: "Utiliser quand une tâche CleanMyMap touche formulaire, schéma de validation, soumission, erreur utilisateur, upload ou endpoint recevant une entrée publique."
category: repository
risk: high
source: local
tags: "[forms, validation, input, zod, submission, errors]"
---

# CleanMyMap — formulaires et validation

## But

Rendre l'entrée utilisateur explicite, sûre et cohérente entre UI, serveur et persistence.

## Règles

- Le serveur reste autoritaire pour toute validation de sécurité ou règle métier.
- Réutiliser un schéma ou owner canonique existant ; ne pas maintenir deux validations concurrentes « presque identiques ».
- La validation client améliore l'UX mais ne remplace jamais la validation serveur.
- Normaliser uniquement ce que le contrat autorise ; ne pas « corriger » silencieusement une entrée ambiguë.
- Distinguer erreurs de saisie, conflit métier, AuthZ, réseau et erreur serveur.
- Les messages utilisateur doivent être compréhensibles sans exposer stack trace, secret ou détail interne.
- Préserver les valeurs saisies quand c'est sûr et utile après un échec.
- Gérer double soumission, état pending et idempotence lorsque le flux peut produire un effet métier durable.
- Pour upload/URL/texte libre, appliquer les restrictions de taille, type, protocole et sanitation prévues par le domaine.
- Les protections anti-spam ou honeypots actifs ne sont pas du dead-code.

## Tests

Couvrir au bon seam : cas valide, champs requis, limites, format invalide, valeur métier refusée, AuthZ insuffisante, double soumission/idempotence si pertinente et erreur backend. Éviter de tester uniquement l'implémentation interne du schéma.
