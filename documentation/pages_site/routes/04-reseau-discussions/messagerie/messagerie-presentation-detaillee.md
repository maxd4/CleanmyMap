# Messagerie - Présentation détaillée

## Résumé

La page `Messagerie` sert aux échanges publics thématiques et directs entre membres du réseau. Elle doit rester lisible, réactive et orientée conversation, sans se transformer en fil social ni en boîte de réception administrative.

## Ce que la page montre

- une liste de conversations ou de fils
- des messages à lire et à répondre
- une navigation primaire entre `Discussions` et `Messages privés`
- une vue publique agrégée ou un groupe de présentation qui relit les `topic_id` persistés correspondants
- une recherche débouncée dans l’historique du scope ouvert, avec résultats paginés et ancrage sur le message ciblé
- une composition `Message` ou `Annonce / Relai` ; les trois modèles de relais préparent un brouillon éditable et sélectionnent leur topic canonique
- une composition `Sondage` dans `community` ou `admin_elu`, avec une question et 2 à 6 options éditables ; la publication conserve le topic courant et réinitialise uniquement le formulaire
- un vote réel dans chaque sondage : choix, changement ou retrait, compteurs par option et proportions agrégées, sans exposer l'identité des votants
- pour `admin_elu`, une audience limitée à `admin`, `max` et `elu`, avec un topic facultatif ; la visibilité du message, des options, du vote et des agrégats reste décidée par la RLS
- un contexte d'événement minimal lorsqu'une annonce est liée à un cleanup existant
- des états de chargement, d'accès et de participation
- un contexte minimal intégré au fil actif, sans panneau secondaire concurrent

## Ce que la page doit préserver

- une palette `pink` cohérente avec le bloc 04
- une hiérarchie claire entre discussions, fil actif et composition du message
- une séparation explicite entre l’inbox DM et la navigation publique
- des états `loading`, `empty` et `access refused` propres
- une navigation sans surcharge entre conversations et contenu
- conserver les anciens `topicId` dans les URLs : ils sont résolus vers leur groupe d’affichage sans supprimer le ciblage d’un `messageId`
- ne jamais traiter les groupes d’affichage comme une nouvelle granularité métier ou de persistance

## Points d'attention

- garder la surface compacte sur mobile
- sur mobile, afficher la liste des contextes puis le fil avec retour ; afficher les deux simultanément sur desktop lorsque l’espace le permet
- éviter une densité de cartes trop élevée
- ne pas mélanger la messagerie avec les retours `Feedback`
- ne pas afficher une sidebar DM dans l’onglet `Discussions`
- laisser `Communauté globale` et `Territoire global` afficher les messages non classés ; un groupe sélectionné filtre sur les `topic_id` persistés qui le composent, tandis que le fil territorial reste zone-driven et conserve les messages legacy/non classés
- afficher sobrement le topic porté par un message dans une vue agrégée
- conserver les annonces dans `app_messages` avec leur `message_kind` et ne publier un contexte événementiel qu'après résolution d'un `community_events.id` canonique
- préserver les deep-links de relais `template`, `topicId` et `eventId` sans faire de l’URL une source de vérité pour le titre, la date ou le lieu
- préserver les deep-links DM `tab=dm`, `recipientId`, `recipientLabel`, `recipientHandle` et `messageId` ; une recherche sélectionnée réutilise le même ancrage que les notifications
- ne pas présenter de multi-choix, d’expiration ou de clôture tant que ces lots ne sont pas livrés ; les compteurs et proportions du vote simple sont désormais disponibles

## Référence canonique

- [README de la page](./README.md)
