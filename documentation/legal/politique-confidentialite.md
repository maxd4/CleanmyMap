# Politique de confidentialité

**Dernière mise à jour : 27 août 2026**

Cette doctrine est la version documentaire de la page publique
`/politique-confidentialite`. Elle décrit les traitements actuellement visibles
dans le code et le schéma de données du workspace web. Elle ne transforme pas
une configuration technique ou une hypothèse en information juridique.

## 1. Responsable du traitement et point de contact

Le responsable du traitement est **Maxence Deroome**, personne physique éditant
CleanMyMap à titre non professionnel dans le cadre d'un projet étudiant. Aucune
société, entreprise, association ou autre personne morale n'exploite actuellement
le service. Le point de contact actuellement configuré pour les questions RGPD,
le retrait du consentement et l'exercice des droits est :
`contact@cleanmymap.fr`.

Le domicile et le téléphone personnels de l'éditeur ne sont pas publiés :
le régime d'anonymat prévu à l'article 1-1 II de la LCEN est appliqué, les
éléments d'identification personnelle nécessaires ayant été communiqués à Vercel
et restant à sa disposition.

## 2. Données traitées

Les catégories suivantes correspondent aux traitements et tables actuellement
utilisés par l'application web :

- **Compte et profil** (`profiles`) : identifiant Clerk, données d'identité
  fournies par Clerk, email, téléphone lorsqu'il est fourni, nom d'affichage,
  avatar, rôle, visibilité, progression, badges, arrondissement éventuellement
  renseigné et rattachement de parrainage.
- **Authentification et sécurité** : cookies de session Clerk, identifiants de
  session, données techniques nécessaires à l'authentification, à la limitation
  des abus et au diagnostic.
- **Actions et lieux** (`actions`, `trash_spotter_spots`, et données historiques
  `spots`) : dates, type, libellé, coordonnées saisies, statut, notes, mesures
  déclarées, tracés et métadonnées de modération.
- **Médias** (`signalement_media` et objets des stockages associés) : nom
  original, type MIME, taille, dimensions, état d'import et chemin de stockage.
  Le binaire n'est pas stocké dans la table métier.
- **Communauté** (`community_events`, `event_rsvps`, `app_messages`) :
  événements, organisateurs, participations, expéditeurs, destinataires,
  contenu des messages, zone ou arrondissement, pièces jointes et métadonnées
  associées.
- **Demandes et communication** : feedback, signalements de bug, demandes de
  promotion, onboarding partenaire et données de support collectées dans les
  stores ou tables correspondants. Les demandes RGPD du formulaire `/contact`
  sont persistées dans `contact_requests` avec l'email, le type de demande, le
  message, la page d'origine, l'identifiant de compte lorsqu'il est disponible,
  la date et l'état de notification.
- **Notifications de contenu** (`legal_content_reports`) : URL exacte du
  contenu, motif circonstancié, type et identifiant technique facultatifs,
  nom/email lorsqu'ils sont fournis, motif facultatif de l'exception d'identité,
  identifiant de suivi, date et états de traitement. Le contenu tiers lui-même
  n'est pas copié.
- **Newsletter** (`newsletter_subscriptions`) : email, état d'inscription,
  source, consentement et dates associées. L'inscription exige un consentement
  explicite dans le parcours actuel.
- **Notifications et progression** (`app_notifications`, `progression_profiles`,
  `progression_events`) : identifiant utilisateur, contenu de notification,
  statut de lecture, événements et données de progression nécessaires à ces
  fonctionnalités.
- **Analytics** (`funnel_events` et PostHog) : après consentement, identifiant de
  session, étape et mode de parcours, identifiant Clerk éventuel et
  métadonnées envoyées par le parcours. Sans consentement, le suivi de tunnel
  côté client ne transmet pas d'événement.
- **Audit et observabilité** (`admin_operations_audit`, journaux Sentry lorsque
  Sentry est activé) : identifiant d'opération, acteur, résultat, détails
  techniques, traces, messages d'erreur et métadonnées utiles à la sécurité et
  au diagnostic.

Certaines données peuvent être reçues indirectement lorsqu'un autre utilisateur
vous associe à un événement, une participation, une action, un message ou un
parrainage. Elles sont utilisées pour la fonctionnalité concernée.

## 3. Finalités, bases légales et caractère obligatoire

| Traitement | Finalité | Base légale | Caractère utile ou obligatoire |
| --- | --- | --- | --- |
| Compte, profil et authentification | Créer le compte, authentifier la personne et fournir les fonctionnalités | Exécution du service ou mesures précontractuelles lorsque pertinentes ; intérêt légitime de sécurité | Les données nécessaires au compte et à l'authentification sont obligatoires pour l'utiliser ; les compléments de profil sont facultatifs lorsqu'ils ne sont pas requis |
| Actions, lieux, événements et messagerie | Enregistrer les contributions et fournir les fonctions communautaires choisies | Exécution du service | Les champs requis par chaque formulaire sont nécessaires à la fonctionnalité choisie ; les champs facultatifs sont signalés dans le parcours |
| Support et demandes RGPD | Répondre aux messages, instruire les droits et suivre les demandes | Intérêt légitime pour le support ; obligation légale pour les demandes de droits | L'email et les éléments nécessaires à l'instruction sont requis par le formulaire concerné |
| Notifications de contenu | Recevoir, examiner et suivre les notifications électroniques concernant un contenu potentiellement illicite | Intérêt légitime ; obligation légale lorsque le traitement concerné l'impose | URL et motif circonstancié obligatoires ; identité/email requis sauf exception déclarée |
| Newsletter | Envoyer les communications demandées | Consentement | Facultatif et distinct de la création du compte |
| Analytics et mesure d'audience | Mesurer les parcours et la performance après accord | Consentement | Facultatif ; le refus ne bloque pas le service essentiel |
| Sentry | Détecter, diagnostiquer et prévenir les erreurs, abus et incidents | Intérêt légitime | Hors analytics soumis au consentement cookies ; activé uniquement lorsqu'une DSN est configurée |
| Parrainage et progression | Relier les invitations et afficher les éléments de progression | Exécution du service ; intérêt légitime d'animation de la communauté | Dépend de l'utilisation de ces fonctionnalités |

## 4. Cookies, analytics et observabilité

Le choix de consentement est écrit dans `localStorage` sous
`cleanmymap_cookie_consent` et dans le cookie
`cleanmymap_analytics_consent`. Les deux décisions, acceptation comme refus,
sont conservées pendant six mois. À l'expiration, l'état local est nettoyé et
le choix est reproposé.

PostHog, Vercel Analytics et Vercel Speed Insights ne sont déclenchés qu'après
consentement analytics. Le contrôle permanent **Gérer mes cookies** permet de
rouvrir les préférences. Le retrait arrête la capture PostHog, empêche le rendu
des intégrations Vercel et un nouveau consentement peut réactiver proprement ces
services.

Sentry n'est pas présenté comme une mesure d'audience : lorsqu'il est activé,
il sert à l'observabilité, à la sécurité et au diagnostic. Les erreurs peuvent
contenir des traces, messages et métadonnées techniques. Aucun masquage ou
anonymisation spécifique supplémentaire n'est déclaré comme configuré par ce
dépôt.

## 5. Destinataires et sous-traitants

- **Clerk** : identité, authentification et métadonnées de compte.
- **Supabase** : base de données, stockage et synchronisation métier.
- **Vercel** : hébergement et exécution du site ; Analytics et Speed Insights
  uniquement avec consentement.
- **Resend** : envoi des emails transactionnels, de support et de notification.
- **PostHog** : analytics et mesure d'audience uniquement avec consentement.
- **Sentry** : observabilité et sécurité lorsque la DSN est configurée.
- **Autorités compétentes** : lorsque la loi l'exige ou l'autorise.

Les services sont utilisés uniquement pour les finalités correspondantes. Les
fournisseurs techniques ne sont pas tous des hébergeurs du site.

## 6. Transferts hors EEE

La configuration du projet utilise par défaut un hôte UE pour PostHog, mais
permet un hôte configurable. Le dépôt ne permet pas, à lui seul, de vérifier la
localisation effective de chaque fournisseur, de chaque environnement ni la
garantie juridique applicable à chaque flux.

Aucune liste de pays, décision d'adéquation ou garantie contractuelle précise
n'est donc affirmée ici sans vérification actuelle du fournisseur et de la
configuration de production. Lorsque le traitement l'exige, le transfert doit
être encadré par le mécanisme légal applicable et les informations fournisseur
en vigueur.

## 7. Conservation et rétention

Les durées ci-dessous sont limitées aux règles effectivement identifiées. Quand
aucune durée fixe n'est configurée, le critère réel ou la limite de vérification
est indiqué :

- **Consentement cookies** : six mois ; l'état expiré est nettoyé et le choix est
  reproposé.
- **`contact_requests`** : les demandes sont persistées localement et dans
  Supabase. Elles sont couvertes par le script de nettoyage générique ; son
  seuil opérationnel par défaut est de 120 jours lorsqu'il est exécuté. Le
  dépôt ne prouve pas une exécution planifiée ni une durée garantie pour chaque
  demande.
- **Stores locaux couverts** : les enregistrements dépassant le seuil fourni au
  script sont retirés, avec une limite de volume propre à certains stores.
  L'artefact produit par le nettoyage est désormais un manifeste de comptage et
  de run ; il ne recopie ni les lignes personnelles ni les chemins de fichiers.
- **Tables et fichiers couverts par le nettoyage** : `app_messages`,
  `community_events`, `training_examples`, `community_bug_reports`,
  `promotion_requests`, `partner_onboarding_requests`, `contact_requests` et
  les objets des buckets explicitement configurés par le script. Le seuil est
  configurable par l'opérateur.
- **`legal_content_reports`** : aucun nettoyage automatique spécifique n'est
  identifié dans ce dépôt ; les signalements sont conservés selon le suivi
  nécessaire de la notification, les obligations applicables et l'examen d'une
  demande de droits. Ils ne sont pas supprimés par le nettoyage générique actuel.
- **Profils, actions, lieux, médias de signalement, rapports, notifications,
  progression et audit** : aucun mécanisme générique de suppression périodique
  n'est identifié dans ce dépôt. La conservation suit le fonctionnement du
  service et fait l'objet d'un examen lors d'une demande de droits.
- **Newsletter** : l'inscription reste active jusqu'à son retrait ou sa mise à
  jour. Le code actuel ne fournit pas de parcours public de désinscription
  dédié ; le retrait peut être demandé par le contact RGPD.
- **PostHog, Vercel et Sentry** : aucune durée de conservation des données chez
  ces fournisseurs n'est configurée par ce dépôt ; leurs paramètres et
  conditions applicables déterminent cette durée.

Les demandes d'effacement sont examinées au regard des données concernées, des
droits de tiers, des obligations applicables et des nécessités de preuve ou de
sécurité. Aucune suppression globale automatique de toutes les données n'est
promise.

## 8. Exercice des droits

Selon les conditions applicables, vous pouvez demander :

- l'accès à vos données ;
- leur rectification ;
- leur effacement ;
- la limitation du traitement ;
- vous opposer à un traitement fondé sur l'intérêt légitime ;
- la portabilité des données lorsque ce droit s'applique ;
- retirer votre consentement à tout moment pour les traitements fondés sur
  celui-ci.

Le retrait du consentement ne remet pas en cause les traitements réalisés avant
ce retrait.

Utilisez le formulaire RGPD de `/contact` ou celui de la page publique de cette
politique. Une vérification raisonnable de l'identité peut être demandée si
elle est nécessaire pour protéger les données d'autrui.

Pour une notification de contenu potentiellement illicite, utilisez la page
publique `/signaler-contenu-illicite`. Ce formulaire possède sa propre finalité
et sa propre persistance dans `legal_content_reports`; il ne remplace pas le
formulaire d'exercice des droits RGPD.

La réponse intervient dans un délai d'un mois à compter de la réception. Ce
délai peut être prolongé de deux mois lorsque la complexité ou le nombre de
demandes le justifie ; la personne en est informée dans le premier mois.

## 9. Réclamation auprès de la CNIL

Vous pouvez d'abord exercer vos droits auprès du point de contact indiqué
ci-dessus. Vous pouvez ensuite saisir la CNIL via son site officiel :
<https://www.cnil.fr/fr/adresser-une-plainte>.

## 10. Décision automatisée

Aucune fonctionnalité identifiée ne prend actuellement une décision
exclusivement automatisée produisant des effets juridiques ou un effet
significatif similaire à l'égard d'une personne.

## 11. Sécurité

Les mesures visibles dans le dépôt comprennent le chiffrement en transit
lorsque le fournisseur et le protocole l'exposent, les restrictions d'accès
administrateur, les politiques Supabase du schéma, la journalisation de
certaines opérations et la minimisation des champs demandés. Cette description
ne vaut pas promesse de chiffrement des sauvegardes, de localisation européenne
des serveurs ou de masquage non configuré.

## 12. Mise à jour

La présente doctrine et la page publique doivent être mises à jour lorsque les
traitements, les fournisseurs, les bases légales ou les mécanismes effectifs de
conservation changent.
