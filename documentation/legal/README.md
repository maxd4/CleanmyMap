# Documents Juridiques - CleanMyMap

Ce dossier contient l'ensemble des documents juridiques de CleanMyMap.

## Documents disponibles

| Document | Description |
|----------|-------------|
| [Conditions Générales d'Utilisation](conditions-generales-utilisation.md) | CGU - Règles d'utilisation de la plateforme |
| [Politique de Confidentialité](politique-confidentialite.md) | RGPD - Protection des données personnelles |
| [Politique des Cookies](politique-cookies.md) | Gestion des cookies et traceurs |
| [Charte du Bénévole](charte-benevole.md) | Droits et devoirs des bénévoles |
| [Notification de contenu illicite](../pages_site/routes/07-legal/signaler-contenu-illicite/signaler-contenu-illicite-README.md) | Formulaire électronique de notification circonstanciée |

## Accès rapide

Ces documents sont accessibles directement depuis la plateforme CleanMyMap via
la section juridique, la page `/mentions-legales`, les CGU, la politique de
confidentialité et le formulaire `/signaler-contenu-illicite`.

## Mise à jour

Ces documents sont régulièrement mis à jour pour refléter les changements dans
nos services et la réglementation applicable.

Les dernières mises à jour couvrent notamment le parrainage, l'alignement des
cookies de consentement et des préférences, le cycle de consentement analytics
de 6 mois, les traitements Sentry d'observabilité, les critères de rétention
réellement implémentés et les dispositifs DSA-01/02 de notification électronique
et de décision administrative tracée.

**Dernière mise à jour juridique :** 27 août 2026

Les lots LEGAL-01, LEGAL-02 et LEGAL-03 sont clos sur la base du runtime
actuellement déployé et des confirmations opérateur disponibles.

## Notification de contenu potentiellement illicite

Le formulaire public `/signaler-contenu-illicite` recueille une URL exacte, un
motif circonstancié, les identifiants techniques facultatifs, l'identité du
déclarant lorsqu'elle est requise et une confirmation de bonne foi. Une
exception permet de ne pas fournir identité et email lorsque le déclarant
indique que les faits sont susceptibles de relever des articles 3 à 7 de la
directive 2011/93/UE ; la qualification juridique complète n'est pas exigée.

Les notifications sont persistées dans le domaine dédié
`legal_content_reports`, sans copie brute du contenu tiers. Elles ne sont pas
lisibles publiquement et apparaissent dans le creator inbox existant, où un
administrateur autorisé peut enregistrer une décision parmi la mise en examen,
l'absence d'action, la restriction ou le retrait lorsque la capacité canonique
du type de contenu existe, ou la clôture. Chaque décision conserve l'acteur
administrateur, la date, l'origine, le motif, le fondement applicable, l'usage
éventuel de moyens automatisés, l'URL/identifiant et des états avant/après
bornés. L'audit ne copie pas l'identité du déclarant ni le contenu tiers.

Après une décision, un accusé de décision est envoyé au déclarant lorsqu'un
email a été fourni. Une notification destinée à l'auteur n'est envoyée que si
un email canonique de l'auteur est effectivement connu. Une panne de
notification est enregistrée comme erreur partielle et ne retire pas la
décision ni une mutation déjà réalisée. Le dispositif est conçu pour recevoir
une notification électronique compatible avec l'article 16 du DSA, sans
présenter CleanMyMap comme un fournisseur d'hébergement au sens du DSA.

## DSA-02 — Décision administrative traçable

Le cycle est séparé en quatre étapes : notification reçue, décision de
légalité ou de conformité aux CGU, éventuelle mutation du contenu via une
capacité de modération canonique, puis audit et notifications. Les décisions
`content_restricted` et `content_removed` sont refusées lorsqu'aucune capacité
canonique ne permet d'identifier et de muter le contenu. Aucun mécanisme interne
de recours, médiateur ou organisme extrajudiciaire non implémenté n'est promis ;
les emails renvoient uniquement au contact réellement disponible.

## Clôture LEGAL-01 à LEGAL-03

### LEGAL-01 — Consentement cookies et analytics

Le premier niveau propose uniquement **Tout accepter** et **Tout refuser**, avec
un traitement visuel et un nombre de clics équivalents. Chaque décision, y
compris le refus, est conservée pendant six mois dans le stockage local et dans
le cookie de consentement analytics. Une décision expirée est nettoyée et le
choix est reproposé. Le footer permet en permanence de gérer les préférences.
Après retrait, les intégrations Vercel conditionnelles ne sont plus rendues et
PostHog est arrêté explicitement avant toute nouvelle capture.

### LEGAL-02 — Identité et mentions légales

La confirmation opérateur établit que CleanMyMap est actuellement édité par
**Maxence Deroome**, personne physique éditant à titre non professionnel dans le
cadre d'un projet étudiant. Aucune société, entreprise, association ou autre
personne morale n'exploite actuellement le service. Maxence Deroome est le
directeur de la publication conformément à l'article 93-2 de la loi du
29 juillet 1982.

La page /mentions-legales sépare désormais :

- l'édition et la publication ;
- l'hébergement par **Vercel Inc.**, 440 N Barranca Avenue #4133, Covina, CA
  91723, United States ;
- les services techniques distincts : Supabase, Clerk, Resend, PostHog et
  Sentry.

Le régime d'anonymat de l'article 1-1 II de la LCEN est appliqué : les éléments
d'identification personnelle nécessaires ont été communiqués à Vercel et restent
à sa disposition. Le domicile et le téléphone personnels de l'éditeur ne sont
donc pas publiés. Aucun numéro de téléphone général Vercel n'est inventé et le
numéro réservé aux notifications DMCA n'est pas réutilisé.

### LEGAL-03 — Politique RGPD

La page publique et la doctrine documentaire décrivent les traitements réellement
identifiés, leurs finalités et bases légales, les catégories de destinataires,
les transferts non vérifiables comme tels, les critères de conservation, les
droits, le retrait du consentement, la CNIL et les délais de réponse. Sentry est
documenté comme observabilité et sécurité hors analytics. Les demandes
contact_requests et le comportement réel du nettoyage sont explicitement
couverts, sans durée historique non prouvée ni promesse de suppression globale.

Références vérifiées le 27 août 2026 :

- [article 1-1 de la LCEN sur Légifrance](https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000049568614) ;
- [article 93-2 de la loi du 29 juillet 1982 sur Légifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033971722) ;
- [article 6 de la LCEN sur Légifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000049577522) ;
- [Vercel Privacy Notice](https://vercel.com/legal/privacy-notice) ;
- [Vercel DMCA Policy](https://vercel.com/legal/dmca-policy).

## Licence du projet

Le projet reste distribué en open source, mais le choix précis de licence est encore en cours d'arbitrage.

Les pistes actuellement envisagées pour conserver un cadre communautaire et bénévole sont:

- AGPLv3
- GPLv3
- MPL 2.0
- Apache 2.0

La décision finale doit être validée après avis de personnes compétentes. Cette note sert de trace interne pour la gouvernance du projet.

## Contact

Pour toute question juridique :
- **Point de contact actuellement configuré** : contact@cleanmymap.fr

---

*CleanMyMap - Ensemble pour un environnement plus propre*
