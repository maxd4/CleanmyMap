# Règlement externe et questions ouvertes

> Module associé à [spogomi.md](./spogomi.md). Statut : PLAN.

## 17 bis. Addendum public vérifié — contrat à intégrer (PLAN)

> **Statut : PLAN documentaire.** Cet addendum intègre des informations
> publiques consultées le 12 octobre 2026. Il ne transforme pas ces
> informations en règlement contractuel de CleanMyMap et ne fait pas foi pour
> une édition française tant que SPOGOMI France n'a pas confirmé le règlement
> et les données applicables à l'événement concerné.

### 17 bis.1 Sources et niveaux de portée

Les sources suivantes sont séparées par portée :

| Source | Portée utilisable | Limite de preuve |
| --- | --- | --- |
| [Fédération japonaise — règles](https://spogomi.or.jp/rule/) | Règles générales publiées : format de base, zone désignée, sécurité, déplacement groupé et principes de score | La page précise que les règles sont localisées selon chaque tournoi ; elle ne fixe pas le règlement français de chaque édition. |
| [Fédération japonaise — organiser un tournoi](https://spogomi.or.jp/organize/) | Sélection de la zone, règles de tri, remise d'un règlement adapté et déroulement avec pesée | Il s'agit d'un cadre d'organisation, pas d'un barème ou d'une délégation juridique pour CleanMyMap. |
| [World Cup — site officiel](https://en.nf-spogomiwc.com/) | Contexte World Cup, équipes de trois, une heure de compétition + vingt minutes de tri, et édition 2027 annoncée comme prévue | Le calendrier 2027 reste présenté comme prévisionnel ; les qualifications locales doivent être confirmées par leur organisateur. |
| [World Cup — conditions de participation](https://en.nf-spogomiwc.com/terms/) | Conditions propres au contexte World Cup 2027 : équipe de trois, mineurs, représentation, voyage, remplacements et équipes gagnantes précédentes | Ces conditions ne s'appliquent pas automatiquement à `casual` ni à tout événement français. La page est une règle d'édition/contexte, pas une décision de SPOGOMI France. |
| [ARTEMA — règles de participation](https://www.artema-network.com/participer-spogomi) | Exemple français publié : une heure de collecte, vingt minutes de tri, zone désignée, retard, avertissements et sécurité | Exemple et communication de l'organisateur français ; l'édition et le règlement applicables doivent être identifiés pour chaque événement. |
| [ARTEMA — SPOGOMI Nice 2024](https://www.artema-network.com/spogomi-nice) | Exemple d'édition : trois personnes, horaires opérationnels, retard de plus de dix minutes, avertissements et rôles de bénévoles, dont Excel et pesée | Données propres à Nice 2024 ; elles ne constituent pas une règle universelle ni un contrat pour une autre édition. |
| [ARTEMA — World Cup 2025 France](https://www.artema-network.com/spogomiwc2025) | Exemple daté de qualification française et de déroulement d'une édition World Cup | Archive d'édition 2025 ; ne pas en déduire les règles de 2027 ou d'un Casual. |

La version ou la date d'une règle doit être conservée dans la configuration de
l'événement. Lorsqu'une page publique n'expose pas de numéro de version, le
contrat doit enregistrer au minimum l'URL, la date de consultation, l'édition
et la confirmation reçue du partenaire, sans inventer une version.

### 17 bis.2 Chronométrage et phases

Les contrats d'événement doivent prévoir une configuration versionnée des
phases, au lieu d'une durée globale codée en dur :

- début officiel de la collecte et heure limite de collecte ;
- fin effective de collecte, si elle est constatée séparément ;
- fin du tri ;
- heure réelle de retour de chaque équipe ;
- début/fin de pesée et validation des résultats ;
- auteur, horodatage et motif de toute correction ultérieure.

Le format général publié par la Fédération japonaise indique 60 minutes,
composées de 40 minutes de collecte et 20 minutes de tri, avec possibilité de
réduction liée à la météo ou d'adaptation en deux périodes. Le site World Cup
décrit 60 minutes de compétition suivies de 20 minutes de tri ; ARTEMA publie
également une modalité française d'une heure de collecte et vingt minutes de
tri. Ces éléments sont des références de cadre ou des exemples d'édition, pas
un réglage automatique.

Le chronométrage officiel doit être contrôlé par un responsable autorisé de
l'événement et rester corrigeable avec une trace. Les durées World Cup ne sont
jamais appliquées automatiquement à un événement `casual`. La durée, la
tolérance de retard et leurs conséquences sont versionnées avec le règlement
de l'événement.

### 17 bis.3 Déplacement, sécurité et infractions

La fiche de consignes destinée aux équipes doit pouvoir reprendre, lorsque le
règlement de l'édition le confirme, les règles suivantes : ne pas courir ;
rester groupé avec un écart maximal de 10 mètres entre le premier et le dernier
membre ; respecter les piétons et la circulation ; collecter uniquement dans
la zone autorisée et sur les surfaces autorisées ; ne pas prendre les déchets
dans les poubelles ou lieux de collecte ; ne pas récupérer d'objet
vraisemblablement détenu par autrui ; ne pas entrer dans une propriété privée,
un cours d'eau ou la chaussée dangereusement ; ne pas soulever de plaques de
caniveau ; ne pas prendre de seringue, liquide inconnu, objet dangereux ou
encombrant interdit.

Un arbitre ou responsable sécurité peut enregistrer une infraction catégorisée
avec l'équipe concernée, l'heure, le lieu éventuellement déclaré, la
justification, l'auteur et la version du règlement. Le système ne tente pas de
déduire automatiquement toutes les infractions d'un GPX, d'une zone ou d'une
trace GPS. La sécurité reste une décision opérationnelle et non un score
numérique autonome.

### 17 bis.4 Arbitrage, pénalités et bilan physique

Le contrat d'arbitrage doit permettre au règlement d'une édition de représenter
au moins : avertissement, pénalité en points lorsqu'un montant est effectivement
publié, correction du tri, disqualification, révision et annulation d'une
décision. Chaque décision conserve son motif, son acteur, son horodatage, sa
valeur éventuelle et la version du règlement.

Les pages françaises consultées mentionnent une déduction pour retour tardif,
une disqualification après plus de dix minutes de retard dans les exemples
concernés et une disqualification possible après avertissements répétés. Ces
modalités restent attachées aux pages/éditions qui les publient : aucun `-10`,
`-100` ou autre montant ne doit être inventé pour un événement qui n'a pas
confirmé son barème.

Le score brut, les pénalités et le score final doivent être stockés et affichés
comme trois notions distinctes. Une disqualification sportive ne supprime pas
les déchets réellement collectés du bilan environnemental ; elle modifie
l'éligibilité ou la publication sportive selon le règlement certifié.

### 17 bis.5 Rôles opérationnels et séparation des pouvoirs

L'exemple ARTEMA de Nice décrit des fonctions de sécurité, de pointage des
masses dans Excel, de contrôle du retour des équipes, de pesée et de
préparation des cérémonies. Le parcours organisateur doit donc pouvoir
attribuer, à l'échelle de l'événement et non comme six rôles globaux Clerk :

- gestion de l'événement ;
- arbitrage et sécurité ;
- chronométrage ;
- pesée ;
- saisie/import des résultats ;
- lecture des résultats publiés.

Une même personne peut cumuler des fonctions si le règlement et l'organisateur
l'autorisent. Les contrôles serveur doivent toutefois empêcher une équipe de
certifier sa propre pesée ou de modifier les pénalités d'une autre équipe.
L'attribution et la révocation des droits doivent être auditées et s'appuyer
sur la relation organisateur canonique et un scope d'événement.

### 17 bis.6 Interopérabilité des classeurs de pesée

L'import des inscrits reste distinct de l'import des mesures. Un futur import
de classeur de pesée doit fournir :

- aperçu des lignes et colonnes avant validation ;
- confrontation aux équipes connues et signalement des mesures déjà saisies ;
- résolution explicite des conflits ;
- provenance `import_excel` ;
- historique, empreinte et reprise idempotente.

Un import ne certifie jamais une pesée sans autorisation explicite de la
personne habilitée. Aucun schéma de classeur français n'est inventé à partir
des pages publiques : un exemplaire anonymisé et les règles de correspondance
doivent être demandés à SPOGOMI France.

### 17 bis.7 Périmètre officiel, GPX et traces observées

Trois objets sont indépendants :

1. le périmètre officiel de collecte, qui peut être une zone ou une carte ;
2. un itinéraire GPX officiel, uniquement s'il est effectivement fourni ;
3. une trace GPS réellement parcourue, uniquement si elle est collectée et
   conservée avec cette provenance.

Lorsque le GPX est absent, l'interface peut représenter une zone officielle
fiable sans la présenter comme un trajet observé. Avant de créer un nouveau
modèle géométrique, l'écart avec les contrats de géométrie existants de
CleanMyMap doit être documenté. Le domaine ne doit pas convertir une distance
théorique en distance parcourue.

### 17 bis.8 Conditions World Cup 2027 et mineurs

Les [conditions World Cup publiées](https://en.nf-spogomiwc.com/terms/) font
apparaître, pour ce contexte d'édition, une équipe exactement composée de
trois membres, un consentement parental/tuteur pour les mineurs, un adulte
responsable si un membre a moins de 12 ans, des conditions de représentation
du pays, la capacité à voyager pour une finale internationale, des règles de
remplacement et une restriction de reconstitution d'une équipe gagnante.

Ces conditions sont qualifiées `world_cup`, édition 2027, et ne sont pas
appliquées à `casual` par défaut. Le modèle doit permettre une vérification
manuelle et une trace avant/après des remplacements. Il ne demande pas par
défaut de passeport, justificatif de nationalité ou document parental et ne
conserve pas de copie de document sensible sans nécessité, base légale et
durée de conservation approuvées.

### 17 bis.9 Consentements, publication et identité juridique

Les notions suivantes restent indépendantes : inscription, présence,
éligibilité sportive, consentement à la participation, droit à l'image,
consentement à la publication de résultats individuels et liaison volontaire à
un compte CleanMyMap. Le classement par équipes peut être public avec des noms
d'équipe autorisés, sans publier les noms, âges, emails ou nationalités des
membres. La présence possible de mineurs impose une minimisation et une
publication prudentes.

ARTEMA publie et présente des événements français dans les sources consultées,
mais cela ne suffit pas à conclure que « SPOGOMI France » est une personne
morale distincte ni à lui attribuer automatiquement l'action CleanMyMap. Avant
de figer l'organisateur canonique, confirmer la dénomination juridique, le rôle
exact d'ARTEMA et des autres partenaires, l'autorité de partage des données et
les comptes autorisés à administrer les événements. Le nom public d'un événement
peut différer de l'identité juridique de son organisateur.

### 17 bis.10 Cas de validation à conserver pour les lots concernés

Les contrats et écrans qui implémenteront ces capacités devront couvrir, sans
les simuler dans ce document : durée configurable et correction tracée ; retard
et sanction versionnée ; disqualification sans suppression du bilan physique ;
droits distincts de pesée, arbitrage et chronométrage ; import de résultats
Excel idempotent avec conflits ; périmètre sans GPX ; éligibilité World Cup
distincte de `casual` ; mineur et consentement ; liaison de compte indépendante
des conditions sportives.

## 18. Points encore à confirmer auprès de SPOGOMI France

- Règlement complet applicable à chaque mode, catégories, coefficients, unités, arrondis, pénalités, départages et conditions de disqualification.
- Exemple **anonymisé** et schéma réel du classeur des inscriptions ; qualité des identifiants externes et champs optionnels.
- Paramètres de composition Casual, critères d'éligibilité World Cup, modalités de vérification de présence, rôle effectif des arbitres.
- Identité juridique exacte de la structure, comptes des représentants habilités et conditions de délégation.
- Circuit de validation des résultats et des données environnementales ; corrections après proclamation.
- Modalités de publication des équipes, consentements, mineurs, durée de conservation des inscrits et gestion des demandes RGPD.
- Règlement et durée applicables à chaque édition, y compris le format des phases,
  la tolérance de retard et les effets des avertissements.
- Exemple **anonymisé** et schéma réel du classeur de pesée, en plus du classeur
  des inscriptions ; qualité des identifiants et règles de résolution des conflits.
- Format du périmètre officiel et existence éventuelle d'un GPX ou de traces
  GPS, sans assimiler ces objets.
- Conditions World Cup 2027 effectivement applicables aux événements français,
  notamment mineurs, représentation, remplacements et consentements.
- Dénomination juridique, rôle et habilitations de l'organisateur français.

Ces incertitudes ne bloquent pas les contrats généraux, mais **interdisent** de figer un barème « officiel », un effectif observé non attesté ou une conversion physique non justifiée.
