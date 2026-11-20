# LOT 15 : Affectation organisationnelle des parts et tableau RSE minimal

Type : lot XL. Statut : PLAN, après lot 14. Contrats : `01` §12 et §15, cadre `17`. Le lot 11 a fixé les parts personnelles ; le lot 14 a séparé preuves et partages. **Ce lot implémente désormais la future affectation à une structure, sans modifier l'owner de la mesure physique.**

## Objectif

Permettre à un participant d'attribuer sa part validée à une structure bénéficiaire vérifiée, organisatrice par défaut, et à cette structure de consulter un bilan collectif **uniquement sur les faits qu'elle est autorisée à voir**. Un employeur peut valoriser des participations volontairement partagées sans recevoir automatiquement leur quantité.

## Jalon 1 : identité structurelle et droits

- Examiner les owners réels `apps/web/src/lib/partners/`, les parcours `/partners/onboarding` et `/partners/dashboard`, les identifiants `organizer_*` et les rôles AuthZ. Leur présence actuelle n'autorise pas à considérer une fiche de répertoire comme un compte d'entreprise vérifié : `/partners/dashboard` est une surface de **gouvernance admin**, pas une console société cliente.
- Réutiliser un owner de structure et ses autorisations **seulement s'ils sont réellement aptes à prouver l'identité de l'organisation et le mandat du représentant**. Sinon créer le plus petit contrat de structure vérifiée et de membres habilités : identité canonique stable, type (entreprise/association/autre), état `pending|verified|revoked`, représentant vérifié, droits de lecture/mutation limités, sans confiance automatique dans un nom libre ou domaine e-mail.
- Distinguer l'identité publique d'une association organisatrice de la vérification d'un compte administrant une entreprise. Une personne sans rattachement vérifié peut consulter ses preuves mais pas les tableaux privés d'une structure. Révoquer immédiatement les droits au retrait d'un mandat.

## Jalon 2 : bénéficiaire unique par part personnelle

- Consommer exclusivement les parts personnelles **effectives et versionnées** du lot 11. Ajouter une affectation organisationnelle distincte, à la granularité `(actionId, userId, metric, sourceRevision)` ; valeur issue de la preuve Actions, sans colonne éditable de poids ni comptage. Par défaut `organizer` si la structure canonique est identifiable ; sinon `unresolved` (rien ne peut être attribué à un nom libre ambigu).
- Un changement vers une entreprise ou autre structure nécessite un choix explicite de la personne concernée, des identités vérifiées et un contrôle serveur des permissions. En cas d'absence de vérification, état `pending`, bénéficiaire effectif précédent inchangé. Exactement **un seul bénéficiaire effectif** par part, muté atomiquement, avec historique de révision append-only, idempotence et concurrence contrôlée ; revenir à l'organisateur est possible, sans double crédit.
- Séparer `hostingOrganizer`, `personalContributor`, `effectiveBeneficiary` et `audiencePermission`. **Partager l'engagement avec son employeur n'affecte pas la part à l'employeur**, et affecter la part ne donne pas le droit de lire des tokens ni d'autres données personnelles.
- Calcul de structure : somme des parts personnelles éligibles affectées à cette structure, dédupliquées par `(actionId, userId, metric)`, sur révisions effectives uniquement. Les parts inconnues ou inéligibles sont `unattributed`, les reliquats non répartis sont indiqués distinctement. **Ne jamais ajouter ces sommes au total de l'action** ; ne pas conserver la part chez l'organisateur après un transfert. Le rôle de l'association organisatrice reste visible.
- Un changement d'affectation laisse invariants les kg et mégots personnels, leurs sources et corrections, les objectifs IA, la gamification et les KPI physiques des Actions. Une correction, révocation, invalidation ou action annulée réconcilie les totaux structurels sans effacer l'historique des décisions d'affectation.

## Jalon 3 : tableau RSE sobre

- Surface de pilotage protégée pour représentants vérifiés : période, actions liées, organisateurs, nombre de participations **partagées** (distinctes), kg/mégots **attribués à la structure**, provenance mesurée/estimée, corrections, taux de couverture et export minimal. Ne jamais afficher automatiquement l'identité de salariés non consentants ; seuil de confidentialité ou suppression des petits agrégats lorsqu'une identification indirecte est probable.
- Prévoir deux vues indépendantes et explicitement nommées : `Mobilisation des salariés` (présences partagées, même sans affectation à l'entreprise) et `Quantités attribuées à la structure` (bénéficiaire effectif unique). L'organisateur peut publier le total physique de l'Action selon les règles Actions, mais ce total n'est pas une deuxième contribution structurelle additionnable.
- Les compteurs IA individuels restent privés. Une future mesure d'usage professionnel agrégé nécessite source autorisée, périmètre et gouvernance propres ; ne pas créer de surveillance des salariés ni des outils d'import automatique de leurs comptes IA dans cet espace.
- Mise à jour ciblée des docs CURRENT Actions, structures, AuthZ/RLS, gamification et pages ; aucun classement des salariés ou score de performance.

## Validation

Tests : organisateur absent/ambigu, structure non vérifiée, mandat révoqué, décision pending, double transfert concurrent, retour organisateur, utilisateur B, métrique inconnue, correction de source et suppression d'action ; conservation stricte des kg/mégots et des XP/badges du participant ; somme des bénéficiaires ≤ somme des parts éligibles et jamais double comptée avec le total de l'action ; preuve que changer le bénéficiaire ne partage pas de données IA. PostgreSQL transaction/RLS en exécution réelle, tests runtime API, E2E rôles salarié/représentant/non-membre, fr/en, responsive, typecheck/lint/coverage et documentation CURRENT.

## STOP CONDITION

Chaque part personnelle effective a au plus un bénéficiaire organisationnel reconnu, avec organisateur par défaut lorsque résolu, transfert autorisé et réversible, traçabilité complète et zéro double comptage. Une structure vérifiée voit seulement ses données autorisées, indépendamment des comptes IA privés de ses salariés.