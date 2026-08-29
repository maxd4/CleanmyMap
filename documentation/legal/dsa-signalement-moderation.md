# Notification et modération des contenus

**Dernière mise à jour : 29 août 2026**

Ce document décrit le mécanisme CleanMyMap de notification électronique et de
modération. Il est conçu pour répondre aux exigences applicables aux
mécanismes de notification et de décision lorsqu'elles s'appliquent. Il ne
qualifie pas définitivement CleanMyMap au regard d'un régime juridique
particulier.

## 1. Principes

Une violation des CGU et un contenu potentiellement illicite sont deux
questions distinctes. Une notification est examinée de bonne foi, de manière
proportionnée et traçable, en limitant les données du déclarant et les copies
du contenu tiers.

Une notification ne vaut pas décision. La décision tient compte des
informations disponibles, des droits des personnes concernées, de la règle
applicable et de la capacité technique réellement disponible pour agir sur le
contenu.

La notification de contenu illicite est une `public_write_exception`. Le
mécanisme doit rester public et utilisable sans compte : aucune création de
compte ne doit être imposée comme condition générale pour déposer une
notification. Les contrôles anti-abus doivent rester proportionnés et ne pas
empêcher un humain légitime d'utiliser le mécanisme. La notification n'accorde
aucun accès aux données privées ni aux surfaces d'administration.

## 2. Déposer une notification

Le formulaire public est accessible à
<https://cleanmymap.fr/signaler-contenu-illicite>. Il ne nécessite pas de
compte et ne demande pas de pièce d'identité.

La notification doit comporter :

- l'URL ou l'emplacement électronique exact du contenu ;
- un motif circonstancié expliquant pourquoi le contenu est considéré comme
  potentiellement illicite ;
- une confirmation de bonne foi indiquant que les informations transmises sont
  exactes et complètes.

Le type de contenu et son identifiant technique peuvent être ajoutés pour aider
à retrouver l'objet. Le nom et l'adresse email sont normalement demandés. Le
formulaire permet de ne pas exiger ces éléments lorsque le déclarant indique
que le signalement concerne les infractions visées aux articles 3 à 7 de la
directive 2011/93/UE. La personne n'a pas à qualifier juridiquement l'infraction
de manière parfaite.

Après l'envoi, un identifiant de suivi est retourné. Un accusé de réception est
envoyé sans délai lorsqu'une adresse email a été fournie.

## 3. Cycle de traitement

Le cycle distingue les étapes suivantes :

`received` → `reviewing` → `decision` → `closed`

La notification est persistée dans le domaine dédié
`legal_content_reports`. Elle n'est pas lisible publiquement et aucune copie
brute du contenu tiers n'est conservée lorsque l'URL ou l'identifiant suffit.
Elle est présentée dans le creator inbox accessible aux administrateurs
autorisés.

Les décisions sont conservées dans `legal_content_report_decisions` avec un
acteur administrateur canonique, la date, l'origine, le motif, l'URL ou
l'identifiant du contenu, le fondement retenu, l'usage éventuel de moyens
automatisés, des états avant/après bornés et un audit administratif. L'audit ne
contient pas de secret, jeton, trace d'exécution brute, payload tiers ou donnée
personnelle inutile.

## 4. Décisions et exécution

Les actions administratives disponibles sont :

- `reviewing` : examen en cours ;
- `no_action` : aucune action sur le contenu ;
- `content_restricted` : restriction du contenu lorsqu'une capacité canonique
  le permet ;
- `content_removed` : retrait du contenu lorsqu'une capacité canonique le
  permet ;
- `closed` : clôture du dossier.

Une action sur un compte n'est pas annoncée comme disponible par ce mécanisme.

Une décision sans mutation a l'état d'exécution `not_applicable`. Une
restriction ou un retrait est persisté avec l'état `pending` avant toute
tentative. Une mutation absente, une capacité indisponible, un contenu
introuvable ou une exception de mutation produit `failed` avec un code d'erreur
borné ; dans ce cas, le contenu n'est pas projeté comme restreint ou retiré.

L'état d'exécution décrit uniquement l'exécution réelle de la mesure sur le
contenu. Dès que la mutation canonique du contenu a réussi, l'état devient
`applied` et ne repasse jamais à `failed` en raison d'une projection ultérieure
du signalement dans `legal_content_reports`. Si cette projection échoue, il
s'agit d'un état partiel distinct, audité avec `stage=report_projection` ; la
projection de `creatorState` peut rester inchangée. L'auteur peut néanmoins
être notifié, car la mesure réelle a été appliquée. L'API répond alors avec
l'état HTTP `207` (`partial`).

## 5. Motivation et notifications

La motivation d'une décision expose les faits et circonstances examinés, la
règle des CGU ou le fondement légal retenu, ainsi que l'utilisation éventuelle
de moyens automatisés. Les deux fondements ne sont pas confondus.

La décision est communiquée au déclarant lorsqu'un contact électronique a été
fourni. Un auteur de contenu n'est informé d'une restriction ou d'un retrait
que si son adresse électronique est connue et que l'exécution est `applied`.
L'identité du déclarant n'est pas révélée à l'auteur, sauf nécessité juridique
justifiée.

En cas d'erreur d'envoi, la décision ou la mutation n'est pas annulée
silencieusement : l'erreur est enregistrée comme état partiel. Les possibilités
de réexamen mentionnées dans une notification se limitent au contact
effectivement disponible ; aucun médiateur, organisme extrajudiciaire ou
procédure interne non implémentée n'est promis.

## 6. Architecture et condition d'effectivité

Le mécanisme est porté par :

- la page publique `/signaler-contenu-illicite` et sa route POST dédiée ;
- le domaine de persistance `legal_content_reports` ;
- le creator inbox existant ;
- le contrôle serveur `requireAdminAccess` ;
- l'audit administratif canonique ;
- le service email existant pour les accusés et décisions.

La présence d'une migration dans Git ne prouve jamais son application en
production.

Le mécanisme a fait l'objet d'une validation production effective couvrant :

- la soumission publique sans compte obligatoire ;
- la persistance dans `legal_content_reports` ;
- l'accusé de réception au déclarant ;
- la notification interne ;
- la décision administrateur ;
- la persistance dans `legal_content_report_decisions` ;
- la projection d'état `new` → `reviewing` ;
- l'audit administratif ;
- `execution_status=not_applicable` pour `reviewing` ;
- la notification de décision au déclarant ;
- l'absence de mutation de contenu pour cette décision non mutative.

### Critères durables de validation du commissioning production

Les points suivants restent les critères durables de non-régression pour les
prochains contrôles production.

**DSA-01 — réception d'une notification**

- une soumission utilisateur légitime est acceptée ;
- la réponse HTTP réussit et fournit un `trackingId` ;
- la notification est réellement persistée dans `legal_content_reports` ;
- un accusé de réception est effectivement envoyé lorsqu'un email est fourni ;
- la notification interne est effectivement déclenchée.

**DSA-02 — décision de modération**

- la décision est effectuée via la session admin canonique ;
- elle est réellement persistée dans `legal_content_report_decisions` ;
- la projection du report reste cohérente ;
- l'état d'exécution correspond à l'action effectuée ;
- la notification au déclarant est effectivement déclarée envoyée lorsqu'elle
  est requise ;
- une décision non mutative comme `reviewing` n'entraîne aucune mutation du
  contenu.

## 7. Données et contact

Le traitement des données du déclarant est détaillé dans la [Politique de
confidentialité](politique-confidentialite.md). Pour une question générale,
une demande relative à vos données ou un réexamen, utilisez
<contact@cleanmymap.fr> ou le [formulaire de contact](https://cleanmymap.fr/contact).
