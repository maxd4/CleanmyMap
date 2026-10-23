# Autorisation par capacités et périmètres

> **Statut** : `PLAN / TARGET` — contrat d'autorisation cible durable pour
> CleanMyMap.
>
> Ce document définit comment attribuer des permissions utiles mais contrôlées
> aux rôles métier. Tant que la convergence du code n'est pas complète, le
> comportement réellement implémenté reste déterminé par le code et les tests
> sur `main`. Une divergence entre ce contrat cible et le runtime doit être
> traitée explicitement ; elle ne doit jamais être masquée par la documentation.

## 1. Objectif

CleanMyMap ne doit pas modéliser ses permissions comme une hiérarchie linéaire de rôles.

La règle cible est :

```txt
permission effective
=
identité authentifiée
+ capacité demandée
+ périmètre autorisé
+ relation à la ressource
+ état métier
+ contraintes de données
```

Un rôle donne accès à un ensemble de capacités possibles. Il ne donne pas, à lui seul, un droit global sur toutes les ressources du même domaine.

Exemples :

```txt
coordinateur
+ actions.manage_organized
+ action dont il est organisateur
→ autorisé

coordinateur
+ actions.manage_organized
+ action d'une autre organisation
→ refusé

elu
+ reports.view_territory
+ territoire qui lui est attribué
→ autorisé

elu
+ actions.moderate_global
→ refusé par défaut
```

## Classification canonique des surfaces

Cette classification constitue la politique cible documentaire de CleanMyMap.
Elle guide la convergence future sans prétendre décrire un runtime déjà
convergé : le comportement effectivement implémenté sur `main` reste défini
par le code et les tests.

| Classe | Règle cible |
|---|---|
| `public_read` | lecture publique de données `public-safe`, sans session obligatoire |
| `authenticated_write` | mutation après session Clerk, avec AuthZ, ownership/scope, validation et rate limit côté serveur |
| `private_read` | lecture après session Clerk, avec contrôle d'ownership, de scope et d'AuthZ |
| `privileged` | surface d'administration ou de modération avec AuthN, AuthZ forte, audit et garde-fous adaptés au risque |
| `public_write_exception` | écriture publique explicitement justifiée, sans compte obligatoire, avec contrôles anti-abus proportionnés |

La visibilité d'une page ne vaut pas autorisation d'exécuter ses actions. Une
page peut rester publique tout en présentant des CTA qui demandent ensuite une
connexion au moment où l'interaction nécessite une identité, une donnée privée
ou une mutation. Le proxy peut contribuer à la navigation et au premier
filtrage, mais il n'est pas l'autorité finale : l'handler ou le service serveur
doit reprendre la décision.

Toute mutation liée à un compte doit être attribuée à l'identité Clerk
courante. Toute lecture privée doit contrôler l'ownership, le scope et
l'AuthZ applicables. Une session authentifiée ne remplace jamais l'AuthZ.

BotID est une défense anti-automation complémentaire ; ce n'est ni une
primitive d'AuthN ni une primitive d'AuthZ. Il ne doit pas être imposé comme
hard gate par défaut aux écritures déjà authentifiées. Un CAPTCHA ou un
challenge présenté à l'authentification ne remplace ni le rate limit, ni
l'AuthZ, ni les contrôles métier après connexion.

Les exceptions d'écriture publique doivent rester rares, explicitement
justifiées et documentées. Elles combinent les contrôles strictement
nécessaires — validation, honeypot ou délai lorsque pertinent, rate limit et
anti-automation éventuelle — sans rendre le parcours inaccessible aux humains
légitimes.

Exemples de classification cible :

- carte, méthodologie, apprentissage et données validées publiques : `public_read` ;
- créer, rejoindre ou modifier une action, envoyer un feedback attribué et
  envoyer des messages : `authenticated_write` ;
- profil, historique personnel et messages privés : `private_read` ;
- administration et modération : `privileged` ;
- contact, newsletter et notification de contenu illicite lorsque leur
  contrat l'exige : `public_write_exception`.

Pour la newsletter, `public_write_exception` décrit le parcours HTTP public,
pas un droit d'écriture Data API. La route `/api/newsletter/subscribe` applique
BotID, rate limiting, validation, honeypot, délai anti-rejeu et consentement,
puis écrit avec `service_role` ; `anon` et `authenticated` ne disposent pas
d'INSERT direct sur `newsletter_subscriptions`. Le consentement RGPD est une
preuve du choix déclaré dans le formulaire, pas une preuve de possession ou de
contrôle effectif de l'adresse email. La fermeture du bypass Data API ne met
pas en place de double opt-in ni de vérification d'adresse.

## Vérification transverse des surfaces interactives

Toute surface interactive doit pouvoir être vérifiée à trois niveaux :

```txt
PAGE_OK
→ page et navigation utilisables

INTERACTION_OK
→ action utilisateur produit l'état UI attendu

END_TO_END_OK
→ effet réel vérifié côté persistence, email, audit, redirection ou état métier selon le cas
```

Ces niveaux constituent un invariant de validation cible pour les formulaires,
écritures, feedbacks, emails, liens et redirections, participations, messages,
exports et autres effets métier. Ils ne constituent pas un résultat de
commissioning actuel.

## Index des modules

- [Rôles, scopes et ownership](./authorization-capabilities-scopes.md)
- [Catalogue des capacités métier](./authorization-capabilities-catalogue.md)
- [Matrice cible des rôles](./authorization-capabilities-roles.md)
- [Données, risques et mise en œuvre](./authorization-capabilities-data.md)
- [Permissions événementielles SPOGOMI](./authorization-capabilities-spogomi.md)

Le contrat CURRENT d'autorisation reste dans authz-authn-regles.md, ses modules et le runtime.
