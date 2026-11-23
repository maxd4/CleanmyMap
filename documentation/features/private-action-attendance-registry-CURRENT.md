# Registre privé de présence des actions — CURRENT

## Propriétaire et surfaces

Le registre nominatif partagé est rendu en préparation, dans la feuille
d’appel Jour J et dans le bilan d’action. Ces trois phases lisent et modifient
les mêmes entrées via le même `actionId` et la même API ; aucune copie n’est
stockée dans `preparationData`. Avant la première sauvegarde, l’interface
indique que la liste sera accessible après l’enregistrement sans créer
l’action. La reprise utilise l’identifiant de l’action déjà persistée. Le
registre reste privé et distinct des inscriptions et de la
participation finale. Les entrées actives et leurs compteurs sont la source
des totaux du registre ; la recherche de lignes ne filtre que l’affichage.
L’écart du bilan compare l’effectif déclaré au nombre de présences identifiées
sur toutes les entrées actives.

## Identités et liaison

L’organisateur peut saisir librement une identité sous un seul libellé
distinctif. La recherche Clerk facultative utilise ce même champ. La saisie
libre ne crée aucun compte et n’associe aucun identifiant. La sélection explicite
d’un résultat peut créer une entrée liée ; une entrée libre propose aussi
l’opération explicite de liaison. La liaison conserve le libellé, le statut,
l’observation de présence et l’historique de l’entrée. Une identité Clerk déjà
liée à la même action est refusée en conflit ; aucune fusion automatique n’est
effectuée. Les homonymes restent des entrées indépendantes.

## Pointage et accès

La capacité de pointer dépend de l’heure de début planifiée de l’action
(`event_start_at`). Aucun début réel observé n’est requis ni créé par le
registre. Le pointage reste une observation explicite de l’organisateur ; une
entrée inconnue, une inscription confirmée ou un compte associé ne prouvent
pas à eux seuls une présence.

L’API conserve ses contrôles AuthN/AuthZ côté serveur, les révisions
optimistes, l’idempotence par requête, l’audit avant/après et le conflit HTTP
409. Le registre ne crée pas de participation finale ni d’XP.
