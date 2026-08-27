# Politique des cookies et traceurs

**Dernière mise à jour : 27 août 2026**

Cette politique décrit les cookies, le stockage local et les services
conditionnés au choix analytics sur CleanMyMap.

## 1. Choix initial

Lors de la première visite, la bannière présente deux choix de premier niveau :

| Choix | Effet |
| --- | --- |
| **Tout accepter** | Autorise les services analytics conditionnés au consentement |
| **Tout refuser** | N'autorise pas ces services et conserve uniquement le fonctionnement essentiel |

Les deux choix ont le même niveau d'accès et le même nombre de clics. Aucun
choix intermédiaire n'est requis au premier niveau.

## 2. Durée et retrait

L'acceptation comme le refus sont mémorisés pendant **180 jours**, soit six
mois :

- `cleanmymap_cookie_consent` dans le `localStorage` du navigateur ;
- `cleanmymap_analytics_consent=1` ou `cleanmymap_analytics_consent=0` dans
  le cookie de consentement, avec la même durée.

Lorsque la décision locale est expirée, elle est nettoyée et le choix est
proposé à nouveau. Le contrôle permanent **Gérer mes cookies**, présent dans le
pied de page, permet de rouvrir les préférences sans supprimer manuellement le
stockage du navigateur.

Le retrait est possible à tout moment. Il arrête la capture PostHog et empêche
le rendu de Vercel Analytics et Vercel Speed Insights. Un nouveau consentement
peut réactiver ces services.

## 3. Fonctionnement essentiel

Les cookies et stockages nécessaires au fonctionnement du site peuvent être
utilisés sans consentement analytics, notamment :

- la session et l'authentification Clerk ;
- les préférences d'interface nécessaires au parcours, comme la langue ou le
  mode d'affichage, lorsqu'elles sont activées ;
- les éléments techniques nécessaires à la sécurité et au fonctionnement de la
  plateforme.

Les durées de ces éléments peuvent dépendre de la session, du navigateur ou de
la configuration du fournisseur. La présente politique ne leur attribue pas de
durée générique non vérifiée.

## 4. Services soumis au consentement analytics

| Service | Finalité | Condition |
| --- | --- | --- |
| PostHog | Mesure d'audience et analytics des parcours | Consentement positif |
| Vercel Analytics | Mesure de performance web | Consentement positif |
| Vercel Speed Insights | Mesure des temps de chargement | Consentement positif |

PostHog n'est jamais chargé avant un consentement positif. Après un retrait,
l'instance déjà initialisée est arrêtée, son identité et sa persistance utile
sont réinitialisées et la capture reste désactivée jusqu'à un nouveau
consentement.

Sentry n'est pas classé comme analytics soumis à ce consentement. Lorsqu'il est
activé par une DSN, il sert à l'observabilité, à la sécurité et au diagnostic
sur la base de l'intérêt légitime. Les données techniques éventuellement
transmises et leur durée chez le fournisseur ne sont pas décrites comme
anonymisées ou conservées pendant une durée fixée par ce dépôt.

## 5. Gestion par navigateur

Le navigateur permet de supprimer, bloquer ou limiter les cookies et le
stockage local. Un blocage général peut perturber la session, les préférences
ou certaines fonctions essentielles. Le contrôle **Gérer mes cookies** reste
le moyen prévu par CleanMyMap pour modifier le choix analytics.

## 6. Contact

Pour toute question sur les cookies ou le consentement, écrivez à
<contact@cleanmymap.fr>. Les traitements associés aux données personnelles sont
décrits dans la [Politique de confidentialité](politique-confidentialite.md).
