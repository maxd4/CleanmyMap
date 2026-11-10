# Politique globale de persistance économe

> **Statut :** `CURRENT` — contrat de développement Web et Mobile.
>
> Cette politique complète la gouvernance des données et la gouvernance des
> coûts. Elle ne crée ni source de vérité concurrente, ni cache global, ni file
> de synchronisation.

## Objet

Limiter les requêtes Vercel et Supabase en séparant clairement l'état de
préparation, la sauvegarde métier et la synchronisation nécessaire, sans
réduire la fiabilité, la sécurité, la traçabilité ou l'information de la
personne utilisatrice.

La règle s'applique aux évolutions Web et Mobile, y compris lorsqu'un même
contrat serveur est consommé par les deux applications.

## Règle de décision

Avant d'ajouter une écriture ou une relecture distante, classer l'opération :

| Situation | Conservation par défaut | Déclenchement attendu |
| --- | --- | --- |
| Édition préparatoire, réversible et non sensible | État React ou état local du parcours | Sauvegarde explicite de l'unité métier |
| Préférence d'interface ou état d'affichage non critique | Stockage navigateur existant, seulement si la donnée est adaptée | Relecture locale au démarrage, sans écriture serveur automatique |
| Donnée métier durable, partagée, auditée ou nécessaire à une autre session | Source serveur canonique (Supabase ou service propriétaire) | Mutation autorisée, validée et confirmée par le serveur |
| Donnée dont la fraîcheur est une condition de sécurité ou de collaboration | Source serveur et synchronisation nécessaire | Immédiatement au moment métier requis |
| Dérivé recalculable ou projection publique | Cache, snapshot ou projection existante | Régénération bornée, jamais seconde source de vérité |

La conservation locale ne vaut pas sauvegarde métier. L'interface doit rendre
visibles les états `non enregistré`, `enregistrement en cours`, `enregistré`,
`erreur` et, lorsqu'il existe, `conflit` ou `synchronisation en attente`.

## Éditions préparatoires et mutations

- Une édition préparatoire reste locale jusqu'à une action explicite de
  sauvegarde, de soumission ou de publication.
- Une unité métier est persistée par une mutation groupée lorsque le contrat
  le permet ; il faut éviter une requête par champ modifié ou par étape visuelle.
- La réponse de la mutation est la première source de mise à jour de
  l'interface. Une relecture serveur n'est ajoutée que si elle est nécessaire
  pour obtenir une projection différente, confirmer une résolution concurrente
  ou satisfaire une exigence de sécurité/intégrité. Un contrat qui exige
  explicitement la relecture d'une projection, comme certaines synchronisations
  de préférences, reste prioritaire.
- Les révisions optimistes, transactions, contraintes d'unicité, verrous,
  protections AuthN/AuthZ, idempotence et reprises existantes restent
  obligatoires. Une réduction de requêtes ne justifie jamais un retour local
  présenté comme écrit lorsqu'il ne l'est pas.
- Les erreurs, conflits, réponses partielles et pertes de synchronisation
  restent des états explicites et reprenables ; ils ne sont pas convertis en
  succès local.

## Choix du stockage local

React state est le choix par défaut pour l'état éphémère d'un écran ou d'un
workflow. Le stockage navigateur ou natif existant peut être réutilisé pour
des préférences, des brouillons non critiques ou une reprise locale clairement
bornée, lorsque le contrat du domaine le permet.

Ne jamais écrire dans `localStorage`, `sessionStorage` ou un stockage local
équivalent non sécurisé :

- un roster nominatif ou une liste de personnes identifiable ;
- un code, secret, token, credential ou une clé d'idempotence qui est elle-même
  secrète ou sensible ;
- une donnée personnelle sensible, une preuve privée ou une décision
  d'autorisation ;
- une donnée qui doit rester exclusivement sous contrôle serveur pour son
  ownership, sa rétention ou son audit.

Sur Mobile, le stockage local existant reste owner-scoped, avec vérification de
l'identité Clerk et les garanties de reprise déjà définies par le domaine. Le
SecureStore reste réservé aux secrets et au cache de token selon les contrats
mobiles ; cette politique n'autorise pas un nouveau mécanisme de stockage.

## Synchronisation immédiate obligatoire

La sauvegarde locale ne remplace pas la synchronisation lorsque l'opération
engage immédiatement une autre personne, une permission ou une vérité
partagée. Restent donc immédiats, selon leurs contrats propres :

- AuthN, AuthZ, RLS et vérification d'ownership ;
- inscription, désinscription et présence terrain ;
- publication, clôture et transitions d'état métier ;
- collaboration, messagerie, notifications et statuts visibles par autrui ;
- opérations dont la fraîcheur conditionne la sécurité, le quota,
  l'idempotence ou la cohérence inter-session.

Ces opérations conservent leurs transactions, révisions optimistes bornées,
clés idempotentes, protections serveur et chemins de reprise. Une opération
immédiate peut mettre à jour l'interface optimistement, mais son statut reste
en attente jusqu'à la réponse serveur attendue.

## Limites de la politique

Cette politique ne justifie pas :

- un cache global ou partagé ajouté sans besoin mesuré ;
- une queue de synchronisation ou une infrastructure de transport nouvelle ;
- la suppression d'une lecture nécessaire à une projection, une autorisation,
  une résolution de conflit ou une preuve d'intégrité ;
- le déplacement d'une donnée sensible ou d'une décision métier vers le
  navigateur ;
- une relecture systématique après chaque mutation lorsque la réponse contient
  déjà la projection canonique utile.

Toute exception doit préciser la donnée concernée, son owner, la raison de
fraîcheur ou de sécurité, le coût attendu et le comportement en cas d'erreur,
de conflit, de reconnexion ou de changement d'identité.

## Références canoniques

- [Gouvernance des données](../architecture/data-governance.md) : sources de
  vérité, durée de vie, ownership et projections.
- [Gouvernance des coûts plateforme](../operations/platform-cost-governance.md) :
  classement des opérations distantes, déclenchement et quotas.
- [Contrats mobiles](../../apps/mobile/README.md) et
  [architecture GPS compagnon](../../apps/mobile/architecture_gps_companion.md) :
  reprise locale, owner-scoping, idempotence et synchronisation terrain.
- [Politique de confidentialité](../legal/politique-confidentialite.md) :
  finalités, minimisation, conservation et droits applicables.
