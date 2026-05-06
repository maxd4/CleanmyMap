# Audit Kaizen Chat

Date: 2026-05-06  
Fichier cible principal: `apps/web/src/components/chat/chat-shell.tsx`

## Décisions prises

- Envoi optimiste via `useChatData` avec `mutate(..., { optimisticData, rollbackOnError })`.
- Retour serveur réinjecté dans le cache sans attendre un second fetch.
- Le composer accepte `Entrée` pour envoyer, et `Shift+Entrée` pour revenir à la ligne.
- Le bouton d’envoi et le champ texte sont bloqués pendant l’envoi / upload pour éviter les doubles soumissions.
- Un upload de fichier trop lourd ou en échec déclenche un toast explicite, pas une alerte native.
- En cas d’erreur réseau sur l’envoi, le toast propose un nouvel essai et un rafraîchissement.

## Points vérifiés

- Aucun changement destructif sur les messages persistés.
- Le comportement DM, territoire et mention reste intact.
- Le cache SWR reste la source de vérité côté lecture.
- Les pièces jointes restent facultatives et compatibles avec les messages texte seuls.
