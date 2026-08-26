# Messagerie - Présentation détaillée

## Résumé

La page `Messagerie` sert aux échanges directs entre membres du réseau. Elle doit rester lisible, réactive et orientée conversation, sans se transformer en fil social ni en boîte de réception administrative.

## Ce que la page montre

- une liste de conversations ou de fils
- des messages à lire et à répondre
- une vue publique agrégée ou un salon thématique explicitement sélectionné
- une composition `Message` ou `Annonce / Relai` ; les trois modèles de relais préparent un brouillon éditable et sélectionnent leur topic canonique
- une composition `Sondage` dans `community`, avec une question et 2 à 6 options éditables ; la publication conserve le topic courant et réinitialise uniquement le formulaire
- un vote réel dans chaque sondage : choix, changement ou retrait, compteurs par option et proportions agrégées, sans exposer l'identité des votants
- un contexte d'événement minimal lorsqu'une annonce est liée à un cleanup existant
- des états de chargement, d'accès et de participation
- un contexte minimal intégré au fil actif, sans panneau secondaire concurrent

## Ce que la page doit préserver

- une palette `pink` cohérente avec le bloc 04
- une hiérarchie claire entre discussions, fil actif et composition du message
- des états `loading`, `empty` et `access refused` propres
- une navigation sans surcharge entre conversations et contenu

## Points d'attention

- garder la surface compacte sur mobile
- éviter une densité de cartes trop élevée
- ne pas mélanger la messagerie avec les retours `Feedback`
- laisser `Communauté globale` et `Territoire global` afficher les messages non classés ; un salon sélectionné ne montre que son `topic_id`
- afficher sobrement le topic porté par un message dans une vue agrégée
- conserver les annonces dans `app_messages` avec leur `message_kind` et ne publier un contexte événementiel qu'après résolution d'un `community_events.id` canonique
- préserver les deep-links de relais `template`, `topicId` et `eventId` sans faire de l'URL une source de vérité pour le titre, la date ou le lieu
- ne pas présenter de multi-choix, d'expiration ou de clôture tant que ces lots ne sont pas livrés ; les compteurs et proportions du vote simple sont désormais disponibles

## Référence canonique

- [README de la page](./README.md)
