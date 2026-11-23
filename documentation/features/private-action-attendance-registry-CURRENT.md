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

## Équipes facultatives

Les organisateurs autorisés peuvent gérer des équipes privées depuis les trois
phases du même registre : créer, renommer, retirer une équipe, affecter ou
déplacer une entrée et la remettre « Sans équipe ». Une entrée stable appartient
à zéro ou une équipe. Les équipes sans membre restent présentes et aucun
participant n’est supprimé lorsque l’équipe est retirée.

Le chef est une entrée active de cette équipe, avec ou sans compte associé ;
son rôle sert uniquement à l’organisation. Une entrée déplacée ou retirée qui
était chef libère cette désignation explicitement. « À désigner » et « Sans
équipe » sont des états de préparation, sans règle de taille, verrouillage,
classement ou vocabulaire compétitif SPOGOMI.

Le retrait d’une autre entrée détache uniquement cette entrée : le chef, les
autres membres, la révision d’équipe et l’audit avant/après restent cohérents.

Les noms sont normalisés et uniques par action. L’affectation, la désignation du
chef et les modifications d’équipe utilisent le RPC serveur atomique, des
révisions optimistes, l’idempotence par requête et un audit avant/après. Les
références sont limitées à la même action ; RLS et grants empêchent l’accès
direct au navigateur. Les nombres attendues/présentes/absentes/à confirmer d’une
équipe dérivent de ses membres actifs et ne modifient pas les compteurs globaux.
Les équipes n’ajoutent aucun droit, participation finale, classement ni XP.

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

## Minimisation, confidentialité et effacement

Le seul champ d’identité accepte un libellé minimal. L’interface invite à ne
pas saisir de données médicales, de coordonnées ou d’informations inutiles,
en particulier pour les mineurs ; aucun âge, date de naissance ou découpage
nom/prénom n’est demandé. La finalité est l’organisation et le pointage de
l’action.

Les identités, les équipes, leurs membres, leurs chefs et les audits nominatifs
sont privés. La lecture passe par l’API organisateur et le client serveur ; les
réponses sont `private, no-store`. Les rôles navigateur n’ont aucun accès SQL
direct. Les projections publiques, exports et briefings ne consomment pas les
tables du registre. Les erreurs d’API journalisent un message générique et le
job de maintenance n’émet que des statuts et compteurs agrégés.

« Retirer de la liste » est une suppression logique auditée : l’entrée quitte
la liste active et sa composition d’équipe est détachée, mais ses données
restent dans l’audit privé jusqu’à l’échéance de purge. Ce geste n’est pas un
effacement définitif et ne modifie jamais les participations finales. La
purge physique des entrées actives ou retirées, des audits avant/après, des
équipes, compositions et audits d’équipe devient éligible 90 jours après la
fin de l’action. Pour une action historique sans fin horodatée, le calcul
utilise la fin du jour local de `action_date` dans le fuseau de l’action, ce
qui évite une purge anticipée. Les suppressions des quatre familles de données
sont atomiques par lot et rejouables ; le dry-run expose les actions candidates
et des nombres, sans identité ni composition. Le job quotidien existant
`action-retention` réalise le dry-run puis la purge avec revalidation ; aucun
cron parallèle n’est ajouté. La synchronisation des inscriptions confirmées
respecte aussi cette échéance et ne peut pas recréer une identité opérationnelle
déjà purgée. Ses journaux restent agrégés.

La demande de rectification ou d’effacement passe par le canal RGPD documenté
dans la politique de confidentialité. Elle est instruite selon les droits des
tiers et les obligations de conservation applicables. Actions, inscriptions,
participations finales, instantanés statistiques collectifs et preuves
juridiques conservés dans leurs contrats indépendants ne sont ni supprimés ni
recalculés par cette purge. Les durées des sauvegardes et des fournisseurs
externes ne sont pas établies par ce mécanisme.
