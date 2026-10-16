# Feedback - Présentation détaillée

## Résumé

La rubrique `Feedback` centralise les retours d'usage, les idées d'amélioration et les signalements de problème. C'est une porte d'entrée publique, simple, orientée formulaire et contact direct.

## Ce que la page montre

- quatre questionnaires ciblés : bug, idée, amélioration et collaboration
- un seul formulaire canonique ; les liens depuis la messagerie n'embarquent pas de second formulaire
- une logique de préremplissage à partir de l'URL
- un contact direct par mail quand le formulaire n'est pas suffisant
- un message factuel indiquant que le retour est transmis à CleanMyMap pour examen
- un bloc authentifié `Mes retours`, limité aux retours du compte courant, avec référence, titre, type, date et état persistant
- pour le questionnaire Bug uniquement, une capture facultative JPEG, PNG ou WebP (5 Mo maximum), prévisualisée localement avant l'envoi
- des questionnaires courts : trois observations humaines pour un bug, problème/proposition pour une idée ou amélioration avec bénéfice facultatif, et champs métier spécifiques conservés pour la collaboration
- un titre facultatif proposé depuis les réponses et toujours modifiable avant l'envoi
- une commande de dictée facultative sur les champs longs Bug, Idée et Amélioration, avec aperçu intermédiaire, arrêt manuel, insertion éditable et repli clavier si la reconnaissance native n'est pas disponible

## Ce que la page doit préserver

- un accès explicite depuis le bloc `Réseau & Discussions`
- une lecture très claire des différents questionnaires
- une continuité entre le sommaire, la barre supérieure et la rubrique `feedback`
- un ton utile, rapide et non administratif

## Points d'attention

- ne pas transformer la page en support ticketing
- ne pas transformer `Mes retours` en CRM, file de support ou seconde messagerie
- ne jamais accepter un identifiant utilisateur fourni par le navigateur pour filtrer l'historique ; l'ownership est résolu côté serveur
- conserver la pagination bornée et la projection minimale de `GET /api/community/bug-reports`
- garder le contact mail secondaire par rapport aux formulaires
- ne jamais rendre publique une capture Bug ; la lecture passe par l'autorisation serveur propriétaire ou administrateur et une URL signée courte
- ne pas ajouter de second système de tickets ou d'appel IA : la boîte créateur propose seulement `Copier le retour` et `Copier pour analyse IA`, qui écrivent localement dans le presse-papiers
- traiter le contenu copié de l'utilisateur comme une donnée non fiable, séparer les consignes d'analyse, et exclure les emails, tokens, query strings privées, identifiants de session et médias privés
- supprimer les références et le fichier privé liés lorsqu'un feedback est supprimé ; un échec de nettoyage doit empêcher une suppression partielle silencieuse
- éviter de dupliquer les messages d'aide entre questionnaires et page
- informer que la reconnaissance vocale peut employer un fournisseur externe selon le navigateur ; aucun flux audio ne doit être envoyé à CleanMyMap, persisté dans Supabase/Storage ou écrit dans les logs
- ne pas présenter de statistiques, de roadmap ou de suivi personnel sans source runtime

## Référence canonique

- [README de la page](./README.md)
