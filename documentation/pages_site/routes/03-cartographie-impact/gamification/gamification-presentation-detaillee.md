# Gamification - Présentation détaillée

## Usage et frontières fonctionnelles

**Statut : `CURRENT` pour les parcours effectivement livrés ; les améliorations visuelles non testées ne sont pas des constats runtime.** La source fonctionnelle propriétaire de la page est [gamification-README.md](./gamification-README.md) ; les règles d'XP, badges et progression restent dans [gamification-SPEC_CANONIQUE.md](./gamification-SPEC_CANONIQUE.md) et le moteur web.

- **Route** : `/sections/gamification`, section personnelle accessible après authentification, distincte du classement public `/sections/leaderboard`.
- **Parcours** : consulter le niveau acquis/potentiel, les prérequis, les collections, les jalons, la reconnaissance personnelle et les reçus de réconciliation ; accéder volontairement au classement sans l'intégrer à la rubrique privée.
- **Vie privée** : le classement est une projection publique opt-in, désactivée par défaut dans les réglages. Aucun historique personnel détaillé ni identifiant privé ne doit y apparaître.
- **États UI** : chargement, progression non démarrée, collections en cours/terminées, notifications acquittées/non acquittées, absence ou indisponibilité des données. Ne pas remplacer un état inconnu par un zéro ou une valeur supposée.
- **Présentation** : palette Impact rouge, respect des modes de visibilité et préférences de mouvement. Les anciens jugements de « surcharge » ou de « priorité critique » ne valent pas preuve d'audit visuel actuel.

## Rôle produit

La rubrique gamification sert à rendre lisible la progression personnelle, la reconnaissance utile et les paliers d engagement. Elle doit rester non compétitive, crédible et alignée avec la mission benevole du site.

## Contrat produit CURRENT

- La surface privée et la page publique partagent les deux scopes `user` et
  `structure` ; le premier affiche le niveau utilisateur et le second le niveau
  collectif.
- Les trois métriques de classement sont `level`, `xp` et `badges`.
- Le compteur de badges est `gradeCount + oneShotCount` et s'affiche au format
  `(X grades + Y one-shot)` ; aucun détail de badge n'est publié.
- L'opt-in public est une préférence de profil désactivée par défaut, gérée dans
  `/reglages`. Le refus retire l'utilisateur de la projection publique.
- La projection publique est limitée au label autorisé, au niveau, à l'XP
  validée et aux compteurs de badges ; elle ne contient ni identifiant Clerk,
  ni email, ni metadata, ni rôle, ni XP pending, ni détail de contribution,
  d'impact, d'historique ou de modération.
- Le leaderboard est l'unique exception à la règle de non-publication de la gamification.

La page `/sections/gamification` reste privée. Elle conserve la reconnaissance
personnelle et propose le CTA « Voir le classement public » sans ajouter le
leaderboard à la navigation primaire. Elle ne monte pas le panneau de classement
et ne précharge ni son bundle ni sa requête : le chargement commence à
l'ouverture effective de `/sections/leaderboard`.

## Ce que la rubrique montre

- progression visible;
- badges one-shot;
- badges infinis;
- badges réguliers;
- retours d impact;
- distinctions de confiance;
- surfaces de lecture calmes, pas un jeu mobile.

## Mécaniques CURRENT à garder visibles

Les sept progressions infinies sont `Participation`, `Organisation`,
`Exploration`, `Zones propres`, `Régularité`, `Polyvalence` et
`Apprentissage`. Les paliers quiz par type et équilibrés sont rattachés à
`Apprentissage`, pas exposés comme deux progressions supplémentaires.

Les formulaires sont des preuves de validation et de complétude, pas une
progression utilisateur : aucun badge Forms CURRENT ni XP de remplissage. Les
indicateurs de confiance et de qualité restent dérivés des faits vérifiés, et
les compteurs kg/mégots restent des métriques d'impact ; ils alimentent
désormais les deux badges Mohs personnels secondaires à seuils fixes, sans
créer une huitième ou neuvième progression comportementale. Mohs ne produit
pas de progression infinie CURRENT et ne reclassifie pas silencieusement les
anciens compteurs à humidité inconnue. La zone sensible apaisée dispose d'une preuve historique
dédiée : une qualification est figée au moment de la validation de l'action et
l'état courant de la zone ne peut pas révoquer cette contribution. Elle ne
produit pas de nouvelle attribution XP ; les anciens événements de palier sont
conservés uniquement en compatibilité historique.

## États utilisateur et limites

- **Anonyme** : la page privée ne divulgue ni métrique ni projection owner-scoped ; seul le parcours d'accès prévu par le registre est applicable.
- **Connecté** : la progression, ses collections et les reçus sont résolus depuis les lectures canoniques, sans calcul UI concurrent.
- **Chargement, données absentes, erreur** : distinguer ces états sans simuler un niveau, un badge ou une attribution.
- **Classement opt-in** : affichage uniquement sur la route publique dédiée et seulement pour les comptes ayant accepté la publication.

## Références legacy

- Référence legacy non versionnée dans le dépôt actuel ; consulter les documents canoniques de cette page et ne pas recréer l'ancien chemin.

## Notes d audit

- Le [README de la rubrique](./gamification-README.md) est la source fonctionnelle canonique ; cette présentation complète uniquement ses parcours et ses limites.
- `/gamification` reste un alias de compatibilité vers cette section canonique.
- La source canonique des règles de gamification vit dans [gamification-SPEC_CANONIQUE.md](./gamification-SPEC_CANONIQUE.md).
- Les conventions de scopes temporels et le résumé de l interface cible vivent dans [gamification-scope-ui-notes.md](./gamification-scope-ui-notes.md).
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.

## Liens de travail

- [Spécification canonique](./gamification-SPEC_CANONIQUE.md)
- [Objectifs non pertinents](./gamification-objectifs-non-pertinents.md)
