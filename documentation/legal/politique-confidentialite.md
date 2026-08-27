# Politique de confidentialité

**Dernière mise à jour : 27 août 2026**

Cette politique décrit les traitements de données personnelles mis en œuvre
par CleanMyMap au regard du code et de la configuration du service web. Les
champs effectivement demandés peuvent varier selon la fonctionnalité choisie.

## 1. Responsable et contact

Le responsable du traitement est **Maxence Deroome**, personne physique éditant
CleanMyMap à titre non professionnel dans le cadre d'un projet
étudiant. Aucune société, entreprise, association ou autre personne morale
n'exploite actuellement le service.

Pour toute question, demande de droit ou retrait d'un consentement, le point
de contact est <contact@cleanmymap.fr>. Le domicile et le téléphone personnels
de l'éditeur ne sont pas publiés.

## 2. Catégories de données traitées

Selon les parcours utilisés, CleanMyMap traite notamment :

- **Compte et profil** : identifiant Clerk, données d'identité fournies par
  Clerk, email, téléphone lorsqu'il est fourni, nom d'affichage, avatar, rôle,
  visibilité, badges, progression, arrondissement et rattachement de
  parrainage ;
- **Authentification et sécurité** : données de session, identifiants
  techniques, données nécessaires à la prévention des abus et au diagnostic ;
- **Actions, lieux et médias** : dates, types, libellés, coordonnées, notes,
  mesures déclarées, tracés, statuts de modération et métadonnées de médias.
  Les fichiers sont stockés séparément de la table métier ;
- **Communauté** : événements, organisateurs, RSVP, messages, destinataires,
  zones et pièces jointes lorsqu'elles sont utilisées ;
- **Demandes et communication** : feedback, demandes de support, promotion,
  onboarding partenaire et demandes RGPD, notamment l'email, le type de
  demande, le message, la page d'origine, l'identifiant de compte lorsqu'il
  est disponible et l'état de notification ;
- **Notifications de contenu** : URL exacte, motif circonstancié, type ou
  identifiant technique facultatif, nom/email lorsqu'ils sont fournis, motif
  d'exception d'identité, identifiant de suivi et états de traitement. Le
  contenu tiers lui-même n'est pas copié ;
- **Newsletter** : email, état d'inscription, source, consentement et dates
  associées lorsque l'inscription est proposée ;
- **Notifications, progression et audit** : identifiant utilisateur, contenu
  et statut de notification, événements de progression, identifiant
  d'opération, acteur administratif, résultat et détails techniques bornés ;
- **Analytics** : après consentement, identifiant de session, étape ou mode de
  parcours, identifiant Clerk éventuel et métadonnées nécessaires à la mesure.

Des données peuvent être reçues indirectement lorsqu'un autre utilisateur vous
associe à un événement, une participation, une action, un message, un
parrainage ou un contenu.

## 3. Finalités et bases légales

| Traitement | Finalité | Base légale |
| --- | --- | --- |
| Compte, profil et authentification | Créer le compte, authentifier la personne et fournir les fonctions choisies | Exécution du service ou mesures précontractuelles pertinentes ; intérêt légitime de sécurité |
| Actions, lieux, événements et messagerie | Enregistrer les contributions et fournir les fonctions communautaires demandées | Exécution du service |
| Support et demandes RGPD | Répondre, instruire une demande et en suivre le traitement | Intérêt légitime pour le support ; obligation légale pour les droits RGPD |
| Notification de contenu | Recevoir, examiner et suivre une notification concernant un contenu potentiellement illicite | Intérêt légitime ; obligation légale lorsque le traitement l'impose |
| Newsletter | Envoyer les communications demandées | Consentement |
| Analytics et mesure d'audience | Mesurer les parcours après accord | Consentement |
| Sentry | Détecter, diagnostiquer et prévenir les erreurs, abus et incidents | Intérêt légitime de sécurité et de fonctionnement |
| Parrainage et progression | Relier une invitation et fournir les éléments de progression | Exécution du service ; intérêt légitime d'animation |

Les champs nécessaires à la fonction choisie sont obligatoires lorsqu'ils sont
signalés comme tels dans le parcours. Les champs complémentaires sont
facultatifs lorsqu'ils ne sont pas nécessaires à cette fonction.

## 4. Cookies, analytics et observabilité

Le choix cookies est conservé dans `localStorage` sous
`cleanmymap_cookie_consent` et dans le cookie
`cleanmymap_analytics_consent`. L'acceptation comme le refus sont mémorisés
pendant six mois ; une décision expirée est nettoyée et le choix est reproposé.

PostHog, Vercel Analytics et Vercel Speed Insights ne sont rendus ou activés
qu'après consentement analytics. Le contrôle permanent **Gérer mes cookies**
permet de rouvrir les choix. Le retrait arrête la capture PostHog et empêche le
rendu des intégrations Vercel conditionnelles ; un nouveau consentement peut
les réactiver.

Sentry n'est pas présenté comme un outil d'analytics soumis au consentement.
Lorsqu'une DSN est configurée, il sert à l'observabilité, au diagnostic et à la
sécurité. Les données techniques envoyées peuvent contenir des traces, des
messages d'erreur et des métadonnées utiles. Aucun masquage ou anonymisation
spécifique supplémentaire n'est déclaré comme configuré par ce dépôt.

## 5. Destinataires et prestataires

- **Clerk** : identité, authentification et métadonnées de compte ;
- **Supabase** : base de données, stockage et synchronisation métier ;
- **Vercel** : hébergement et exécution du site ; Analytics et Speed Insights
  seulement après consentement ;
- **Resend** : emails transactionnels, de support et de notification lorsque
  cet envoi est utilisé ;
- **PostHog** : analytics et mesure d'audience seulement après consentement ;
- **Sentry** : observabilité et sécurité lorsque la DSN est configurée ;
- **autorités compétentes** lorsque la loi l'exige ou l'autorise.

Ces prestataires sont distincts les uns des autres et ne sont pas tous
l'hébergeur du site.

## 6. Transferts hors EEE

Le dépôt ne permet pas de vérifier de manière exhaustive la localisation
effective de chaque fournisseur, de chaque environnement ou de chaque flux.
Il ne publie donc pas de liste de pays, de décision d'adéquation ou de garantie
contractuelle précise non vérifiée. Lorsqu'un transfert hors EEE intervient,
il doit être encadré par le mécanisme légal et les garanties applicables au
fournisseur et à la configuration concernés.

## 7. Conservation et critères

Les règles suivantes sont celles qui peuvent être établies à partir du
runtime :

- le consentement cookies et le refus sont conservés six mois ;
- `contact_requests` est couvert par le script de nettoyage générique. Son
  seuil par défaut est de 120 jours lorsqu'il est exécuté ; le dépôt ne prouve
  pas une exécution planifiée ni une durée garantie pour chaque demande ;
- le nettoyage générique traite aussi, selon sa configuration, des données de
  messages, événements, feedback, demandes de promotion et onboarding, ainsi
  que certains objets de stockage. Les archives qu'il produit sont des
  manifestes de comptage et de run, pas une copie des données personnelles ;
- les notifications `legal_content_reports` et les décisions associées sont
  conservées aussi longtemps que nécessaire à l'examen, au suivi, à la
  traçabilité et au respect des obligations applicables. Aucun délai fixe
  supplémentaire n'est configuré par le dépôt ;
- les profils, actions, lieux, médias, rapports, notifications, progression et
  audits suivent le besoin du service, les paramètres de publication et les
  nécessités de sécurité ou de preuve. Aucune durée générique non vérifiée
  n'est annoncée ;
- la newsletter reste active jusqu'au retrait ou à la mise à jour de
  l'inscription. Le retrait peut être demandé via le contact ;
- les durées de conservation appliquées directement par Clerk, Supabase,
  Vercel, Resend, PostHog et Sentry dépendent de leurs configurations et
  conditions propres et ne sont pas fixées par ce dépôt.

Une demande d'effacement est examinée au regard des données concernées, des
droits des tiers, des obligations de conservation et des nécessités de preuve
ou de sécurité. Aucune suppression globale de toutes les données n'est
promise.

## 8. Droits et demandes

Selon le traitement, vous pouvez exercer les droits suivants : accès,
rectification, effacement, limitation, opposition, portabilité lorsque
applicable et retrait du consentement. Le retrait n'affecte pas les traitements
réalisés avant celui-ci.

Utilisez le [contact](https://cleanmymap.fr/contact) ou le formulaire RGPD
présent sur cette page publique. Une vérification raisonnable peut être
demandée lorsqu'elle est nécessaire pour protéger les données d'une autre
personne.

Le formulaire [Signaler un contenu potentiellement illicite](https://cleanmymap.fr/signaler-contenu-illicite)
répond à une finalité distincte et ne remplace pas une demande RGPD.

La demande est traitée dans un délai d'un mois à compter de sa réception. Ce
délai peut être prolongé de deux mois lorsque la complexité ou le nombre de
demandes le justifie ; la personne en est informée dans le premier mois.

## 9. Réclamation auprès de la CNIL

Après ou parallèlement à votre demande, vous pouvez saisir la CNIL via son site
officiel : <https://www.cnil.fr/fr/adresser-une-plainte>.

## 10. Décision automatisée et sécurité

Aucune fonctionnalité identifiée ne prend actuellement une décision
exclusivement automatisée produisant des effets juridiques ou un effet
significatif similaire à l'égard d'une personne.

Les mesures visibles comprennent les contrôles d'accès administrateur, les
restrictions d'accès aux données, la validation des entrées, la limitation des
abus, la journalisation de certaines opérations et la minimisation des champs.
Cette description ne constitue pas une promesse de chiffrement des sauvegardes,
de localisation européenne des serveurs ou de masquage non configuré.

## 11. Mise à jour

Cette politique est révisée lorsqu'un traitement, un fournisseur, une base
légale ou un mécanisme effectif de conservation change.
