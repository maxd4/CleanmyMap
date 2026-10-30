# Dimension communautaire

CleanMyMap peut renforcer son utilite en transformant la participation ponctuelle en reseau local lisible, reconnu et recurrent.

> **Statut documentaire : PLAN / OBJECTIF PRODUIT.** Les intentions, axes,
> fonctionnalités MVP et indicateurs ci-dessous décrivent une direction à
> développer ; ils ne constituent pas un inventaire de capacités disponibles
> ni la preuve d'un impact social. Le leaderboard qualité documenté plus bas
> est un contrat `CURRENT` distinct, dérivé de données disponibles et de
> politiques explicites. L'inclusion sociale et les bénéfices liés à
> l'activité physique restent des objectifs, sans résultat mesuré déclaré.

## État courant — 6A2

Le schéma canonique `public.action_needs` existe pour représenter les besoins
structurés associés à une action. Il utilise exclusivement les huit catégories
`COMMUNITY_HELP_CATEGORIES` et les statuts persistés `open`, `fulfilled` et
`cancelled`. L'état `expired` reste dérivé de `expires_at` et n'est pas stocké.

Les offres d'aide sont désormais persistées dans `public.action_need_offers`
avec les statuts `pending`, `accepted`, `declined` et `withdrawn`. Une seule
offre active `pending` ou `accepted` est autorisée par membre et besoin. La
proposition, la décision du gestionnaire canonique et le retrait passent par
les routes `/api/community/needs/[needId]/offers` ; l'acceptation crée une
notification in-app `community` idempotente pour l'offreur. Ce flux ne crée
jamais d'inscription, de participation confirmée ou de permission sur
l'action. La table et les notifications restent privées ; les identités des
offreurs ne figurent pas dans les projections publiques.

## État courant — 6A4

Les préférences privées `public.community_helper_skills` permettent à un
membre authentifié de sélectionner volontairement zéro ou plusieurs des huit
catégories d'aide. Elles sont accessibles par `GET` et `PUT`
`/api/community/helper-skills`, avec remplacement atomique de l'ensemble ; il
n'existe ni annuaire, ni badge, ni score, ni classement associé.

`GET /api/community/needs/suggestions` propose uniquement les besoins publics,
ouverts, non expirés et correspondant aux catégories sélectionnées. Le
territoire préféré du membre puis ses voisins canoniques servent seulement au
classement ; les autres territoires restent éligibles. Ce flux ne génère pas
de notification automatique.

## État courant — digest communautaire in-app

Les abonnements explicites `community_subscriptions` peuvent alimenter un
digest in-app lors d'une visite du parcours communautaire. La génération est
sans cron et sans email : elle ne promet donc pas une notification à une
période où le membre ne revient pas dans l'application.

`POST /api/community/digest/refresh` ne traite que les nouveautés entrées dans
la visibilité publique pendant la période due : futures actions publiées,
besoins ouverts publiés via leur action, et résultats publiés et approuvés.
Les abonnements territoriaux utilisent la zone canonique et ses voisins
autorisés ; les abonnements thématiques n'ajoutent pas de filtre territorial.
Le payload est public, typé, dédoublonné et limité à dix références.

`community_digest_runs` garantit au plus une exécution et une notification
`community` par membre, cadence et période Paris. Un résultat vide persiste un
run sans notification ; un résultat non vide relie exactement une notification
au run dans une transaction atomique. Aucun run, abonnement ou destinataire
n'est créé implicitement par la consultation d'une surface non communautaire.

## Intentions produit

- Faire revenir les contributeurs grace a une reconnaissance utile, pas decorative.
- Donner aux associations une presence exploitable pour recruter, relayer et coordonner.
- Installer une boucle locale entre signalement, action, remerciement, apprentissage et retour.
- Favoriser les contributions concretes plutot qu'une logique de volume brut.

## Axes prioritaires

### Reconnaissance des contributeurs

- Badges fondes sur des contributions verifiees.
- Mise en avant des contributeurs utiles par zone, type d'aide et regularite.
- Cartes de profil avec impact concret: actions aidees, zones couvertes, bonnes pratiques partagees.
- Remerciements automatiques apres action par association ou coordinateur.
- Statut mentor ou referent pour les profils reguliers et fiables.

Le leaderboard qualité est une vue dérivée, portée par
`apps/web/src/lib/community/engagement.quality.ts` et versionnée par la policy
`engagement-quality-v1`. Les coefficients actuels sont des `POLICY` (qualité
0,7 ; taux A 35 ; volume plafonné à 20 actions à 1,5 ; pénalité C de 2) et
ne sont pas des mesures observées. `wasteKg` est une mesure `OBSERVED` : un
zéro déclaré reste zéro, tandis qu'une absence reste `NULL`; la couverture
des actions connues est exposée séparément. Le score ne doit pas imputer une
masse absente ni transformer le volume en preuve d'utilité à lui seul.

### Valorisation des associations

- Pages association enrichies avec mission, zones couvertes, besoins recurrents, actions passees et ressources utiles.
- Badge de structure active ou validee pour distinguer les acteurs fiables.
- Mise en avant des appels a benevoles, dons, relais de communication et materiel.
- Historique d'impact local par association: nombre d'actions, zones traitees, recurrences.

### Dynamique locale

- Fil local des actions et besoins visibles a l'echelle d'une zone.
- Mise en avant des besoins proches et des contributions attendues dans le secteur.
- Rattachement des contenus communautaires a un territoire lisible.

### Transmission des bonnes pratiques

- Fiches terrain courtes et standardisees.
- Retours d'experience post-action: ce qui a marche, ce qui a bloque, ce qu'il faut ameliorer.
- Ressources validées et faciles a relayer par les associations.

### Participation recurrente

- Boucle post-action: merci, impact, prochaine action suggerée.
- Rappels sobres basees sur la zone, l'historique et les habitudes.
- Missions courtes recurrentes: relayer, verifier, photographier, signaler, accompagner.
- Progression par etapes: premier signalement, premiere action, premiere aide, premiere contribution recurrente.

## Fonctionnalites MVP proposees

Le minimum viable doit tenir en quelques composants simples.

- Une fiche association utile avec mission, zone, besoin actuel et dernieres actions.
- Un badge unique de confiance pour les associations validees.
- Un badge unique de contribution verifiee pour les utilisateurs actifs.
- Un message automatique de remerciement apres action.
- Un bloc "prochaine action" base sur la zone et l'historique recent.
- Un format standard de retour terrain et de bonnes pratiques.

## Risques a eviter

- Trop de badges et une logique de gamification confuse.
- Classement global qui valorise le volume plutot que l'utilite.
- Sur-notification ou pression excessive sur les volontaires.
- Donnees sensibles exposees sur les profils ou les associations.
- Badge trop facile a obtenir, donc peu credible.
- Fiches association transformees en vitrine decorative sans usage operatif.

## Ordre de mise en oeuvre propose

- D'abord la fiche association utile et la reconnaissance minimale.
- Ensuite le remerciement post-action et la suggestion de prochaine action.
- Puis les retours terrain et les bonnes pratiques.
- Enfin la progression vers les statuts mentor, la dynamique locale et les rappels plus fins.

## Indicateurs proposes

- Taux de retour apres premiere action.
- Nombre d'associations actives par zone.
- Part des actions avec retour post-action.
- Retention a 30 jours.
- Conversion d'un signalement vers une action concrete.

## Relation avec l'existant

Cette proposition s'aligne avec les blocs deja en place:

- `community` pour la vie de la communaute.
- `actors` et `network` pour le reseau de partenaires.
- `gamification` pour la progression.
- `messagerie` et `dm` pour l'animation locale.
- `open-data` pour la lisibilite des resultats.

L'objectif n'est pas d'ajouter une couche sociale generale, mais de renforcer la capacite du produit a faire durer l'engagement local.
