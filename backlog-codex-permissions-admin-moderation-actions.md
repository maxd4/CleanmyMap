# Backlog Codex 5.4 mini — Finaliser réellement les permissions, la modération et l’audit des actions

## Statut

**Actif — non clôturé**

Ce fichier remplace le statut précédent « aucun point bloquant identifié ».

Dernier état GitHub vérifié avant rédaction :

```txt
Repo : maxd4/CleanmyMap
Branche : main
Commit : 8c8e4a8d7501ce8787c31cfd15f7cde0acab5d61
```

Le backlog précédent a été partiellement exécuté. Plusieurs règles importantes sont déjà présentes, mais les critères d’acceptation ne sont pas tous satisfaits.

---

# 1. But

Finaliser proprement et de manière testée :

- les permissions des organisateurs ;
- les permissions des coorganisateurs ;
- les permissions `admin`, `elu` et `max` ;
- le parcours normal de participation ;
- les dérogations de modération ;
- les motifs obligatoires ;
- la journalisation avant/après ;
- le masquage et la restauration ;
- les changements de statut ;
- les corrections d’impact ;
- l’absence de double attribution de progression ;
- les tests de permissions, visibilité, impact et audit ;
- la documentation.

Le travail est terminé uniquement quand les critères de la section 15 sont réellement vérifiés par le code et les tests.

---

# 2. Règles strictes d’exécution pour Codex 5.4 mini

## 2.1 Dépôt unique

Travailler uniquement dans :

```txt
C:\Users\sophi\Desktop\MAXENCE\business\CleanmyMap-main
```

Interdictions :

- aucun worktree ;
- aucun dossier projet parallèle ;
- aucune copie sibling ;
- aucun changement de homepage ;
- aucun changement du header global ;
- aucun changement du footer global ;
- aucune désactivation de RLS ;
- aucune clé `service_role` côté client ;
- aucune réécriture large hors périmètre.

## 2.2 Source de vérité

Avant chaque lot :

1. lire les fichiers actuels du dépôt ;
2. ne pas se fier au seul contenu de ce backlog si le code a changé ;
3. réutiliser les helpers existants ;
4. ne pas créer un système d’autorisation parallèle ;
5. conserver les changements petits, typés, testés et lisibles.

## 2.3 Mode d’exécution

Exécuter les lots dans l’ordre.

Pour chaque lot :

1. lire les fichiers indiqués ;
2. corriger le code ;
3. ajouter ou corriger les tests ciblés ;
4. exécuter les tests ciblés ;
5. corriger avant de passer au lot suivant.

Ne pas attendre la fin pour découvrir plusieurs dizaines d’erreurs.

## 2.4 Interdiction de faux positif

Ne jamais déclarer un lot terminé uniquement parce que :

- le fichier contient un helper ;
- la documentation dit que c’est fait ;
- un ancien commit porte le mot `complete` ;
- un test existe mais n’a pas été exécuté.

Le comportement réel et les tests priment.

---

# 3. État réel déjà confirmé

## 3.1 Déjà présent

Les éléments suivants existent déjà et doivent être conservés :

```txt
apps/web/src/lib/actions/permissions.ts
```

avec notamment :

```ts
isActionModerationRole(...)
canUseAdminOverride(...)
canModerateAnyAction(...)
canAutoApproveOwnAction(...)
canManageAction(...)
canReviewActionParticipants(...)
canEditValidatedImpact(...)
canChangeActionStatus(...)
canViewModerationAudit(...)
```

Les rôles de modération centralisés sont :

```txt
admin
elu
max
```

Le flux normal :

```txt
POST /api/actions/group-join
```

force actuellement :

```ts
isAdminLike: false
```

Donc même un admin utilisant le bouton normal reste dans le flux normal :

```txt
participationStatus = pending
participationSource = group_form
```

Conserver cette règle.

Une commande administrative séparée existe actuellement via :

```ts
addActionParticipationByAdmin(...)
```

et les opérations admin de participation sont journalisées.

L’auto-validation d’une création admin-like existe déjà dans :

```txt
apps/web/src/app/api/actions/route.ts
```

Conserver cette logique, mais couvrir les cas exacts par tests.

## 3.2 Exécuté dans cette reprise

- `P0-A` corrigé dans `apps/web/src/app/api/actions/[actionId]/group-join/route.ts`.
- La lecture de la file utilise désormais `resolveReviewerAccess(...)` et autorise créateur, organisateur, coorganisateur et rôles `admin`, `elu`, `max`.
- La recherche de comptes pour ajout direct utilise la même vérification de file, donc elle n'est plus limitée aux seuls rôles admin-like.
- Le traitement `POST` d'acceptation, refus et ajout direct utilise aussi `resolveReviewerAccess(...)`.
- Les organisateurs ordinaires peuvent traiter leur propre file sans déclencher de journal d'audit admin.
- Les rôles de modération continuent à générer l'audit existant sur les opérations de participation.
- Tests ajoutés ou corrigés pour lecture organisateur, recherche organisateur, acceptation organisateur, ajout direct organisateur et refus non-organisateur.
- Validations exécutées: lint ciblé, tests ciblés `GET/POST group-join`, typecheck web.

---

# 4. Écarts confirmés à corriger

Ne pas clôturer ce backlog tant que ces écarts existent.

## P0-A — L’organisateur ne peut pas réellement gérer sa file

Statut : corrigé dans cette reprise.

Dans :

```txt
apps/web/src/app/api/actions/[actionId]/group-join/route.ts
```

le helper :

```ts
resolveReviewerAccess(...)
```

sait déjà autoriser :

- créateur ;
- organisateur ;
- coorganisateur ;
- admin-like.

Mais la lecture réelle de la file et le traitement `POST` utilisent encore :

```ts
resolveAdminModerationAccess()
```

Conséquence :

- organisateur ordinaire : file inaccessible ;
- coorganisateur ordinaire : file inaccessible ;
- acceptation/refus : admin-only ;
- ajout manuel par l’organisateur : admin-only.

C’est contraire au contrat produit.

## P0-B — Les motifs obligatoires ne sont pas implémentés

Les opérations sensibles ne possèdent pas encore une exigence générale du type :

```ts
reason.trim().length >= 5
```

À corriger pour les opérations définies dans ce backlog.

## P0-C — Le statut global peut changer via un flux normal

Dans :

```txt
apps/web/src/app/api/actions/[actionId]/route.ts
```

un utilisateur autorisé à éditer l’action peut actuellement provoquer :

```txt
actionPhase = post_action_complete
→ status = approved
```

sans passer par une permission globale de changement de statut.

Le contrat cible est :

```txt
utilisateur ordinaire finalise
→ status pending

admin-like finalise sa propre action
→ approved

admin-like modère une action tierce
→ opération explicite et auditée
```

## P0-D — Masquage/restauration absent

Le modèle actuel possède surtout :

```txt
pending
approved
rejected
```

Il ne faut pas surcharger `rejected` pour simuler tous les états.

Créer un mécanisme distinct de visibilité de modération si aucun équivalent n’est apparu dans le repo.

## P0-E — Correction d’impact incomplète

Une édition admin peut actuellement modifier directement :

```txt
waste_kg
cigarette_butts
volunteers_count
duration_minutes
```

sans garantie complète de :

- recalcul des données dérivées ;
- recalcul idempotent de progression ;
- absence de double XP ;
- journalisation avant/après ;
- motif obligatoire ;
- rafraîchissement des snapshots/caches dépendants.

## P1-F — Journal d’audit incomplet

Le helper actuel :

```txt
apps/web/src/lib/actions/moderation-audit.ts
```

enregistre une opération et des détails, mais le contrat complet suivant n’est pas systématiquement garanti :

```txt
action
admin auteur
opération
motif
ancienne valeur
nouvelle valeur
cible utilisateur éventuelle
date
contexte technique éventuel
```

## P1-G — Documentation déclarée complète alors qu’elle ne l’est pas

Mettre à jour le backlog, la documentation AuthZ et la fiche Formulaire de groupe après correction réelle.

---

# 5. LOT 0 — Revalidation rapide avant modification

## Objectif

Confirmer que les écarts ci-dessus sont toujours présents au moment d’exécuter.

## Lire

```txt
AGENTS.md
apps/web/src/lib/actions/permissions.ts
apps/web/src/lib/actions/permissions.test.ts
apps/web/src/app/api/actions/route.ts
apps/web/src/app/api/actions/[actionId]/route.ts
apps/web/src/app/api/actions/[actionId]/route.test.ts
apps/web/src/app/api/actions/group-join/route.ts
apps/web/src/app/api/actions/group-join/route.test.ts
apps/web/src/app/api/actions/[actionId]/group-join/route.ts
apps/web/src/app/api/actions/[actionId]/group-join/route.get.test.ts
apps/web/src/app/api/actions/[actionId]/group-join/route.post.test.ts
apps/web/src/app/api/actions/[actionId]/group-join/route.patch.test.ts
apps/web/src/lib/actions/group-participation.ts
apps/web/src/lib/actions/group-participation.helpers.ts
apps/web/src/lib/actions/moderation-audit.ts
apps/web/src/lib/actions/organizers.ts
apps/web/src/lib/actions/types.ts
apps/web/src/lib/validation/action.ts
apps/web/src/lib/gamification/progression-tracking.ts
apps/web/src/lib/gamification/progression-data.ts
```

Rechercher aussi :

```txt
appendActionModerationAudit
canChangeActionStatus
canEditValidatedImpact
hidden
is_hidden
visibility
moderation_status
restore
restored
refreshProgressionProfile
progression_events
public surface snapshot
```

## Sortie attendue

Avant de modifier, noter dans le rapport final :

```txt
- écarts confirmés ;
- écarts déjà corrigés depuis le dernier audit ;
- éventuels nouveaux conflits.
```

Ne pas bloquer le travail pour produire un long rapport intermédiaire.

---

# 6. LOT 1 — Donner réellement la gestion de file aux organisateurs

## Priorité

**P0**

## Fichier principal

```txt
apps/web/src/app/api/actions/[actionId]/group-join/route.ts
```

## But

Autoriser :

- créateur ;
- organisateur principal ;
- coorganisateur autorisé ;
- `admin` ;
- `elu` ;
- `max`.

Refuser :

- participant simple ;
- utilisateur extérieur ;
- anonyme.

## Correction attendue

### GET normal de la file

Remplacer la logique admin-only par :

```ts
const access = await resolveReviewerAccess({
  supabase,
  actionId: trimmedActionId,
  creatorUserId: actionResult.created_by_clerk_id,
  actorUserId: userId,
});
```

Puis :

```txt
access.ok = true
→ pendingRequests
→ confirmedParticipants
→ canReview = true
```

Ne pas retourner silencieusement une file vide à un organisateur autorisé.

### POST de traitement

Le `POST` doit utiliser le même contrôle `resolveReviewerAccess(...)`.

Ensuite distinguer :

#### Organisateur / coorganisateur

Peut :

```txt
accept
reject
add participant manually
remove participant si le flux existe
```

Sans audit de modération globale par défaut, sauf exigence déjà prévue par le projet.

#### Admin-like sur action tierce

Même capacité, mais :

```txt
audit obligatoire
```

### Recherche de comptes

Le plan produit exige que l’organisateur puisse ajouter un membre manuellement.

Donc la recherche de candidats ne doit pas rester admin-only si elle est nécessaire pour ce flux.

Autoriser la recherche à :

```txt
créateur
organisateur
coorganisateur
admin-like
```

avec :

- limite stricte ;
- recherche bornée ;
- aucune donnée sensible inutile.

## Tests obligatoires

Modifier ou compléter :

```txt
apps/web/src/app/api/actions/[actionId]/group-join/route.get.test.ts
apps/web/src/app/api/actions/[actionId]/group-join/route.post.test.ts
```

Ajouter exactement les cas :

```txt
organisateur voit sa file → 200
coorganisateur voit sa file → 200
extérieur ne voit pas la file → 403 ou canReview false sans données sensibles
organisateur d’une autre action → refusé
admin voit toute file → 200
organisateur accepte → succès
organisateur refuse → succès
organisateur ajoute manuellement → succès
admin traite action tierce → audit
```

## Critère de sortie

Lot terminé seulement si l’organisateur peut réellement gérer sa propre file par le backend.

---

# 7. LOT 2 — Motifs obligatoires et contrat d’audit

## Priorité

**P0**

## But

Étendre le système existant sans créer un second journal parallèle.

## Fichiers principaux

```txt
apps/web/src/lib/actions/moderation-audit.ts
apps/web/src/lib/admin/operation-audit.ts
apps/web/src/app/api/actions/[actionId]/group-join/route.ts
apps/web/src/app/api/actions/[actionId]/route.ts
```

Auditer aussi toute route admin d’action existante avant de créer une nouvelle route.

## Contrat cible

Faire évoluer le helper d’audit vers un contrat cohérent :

```ts
type ActionModerationAuditParams = {
  operationId: string;
  actorUserId: string;
  targetActionId: string;
  operation: string;
  outcome: "success" | "error";
  reason?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  targetUserId?: string | null;
  details?: Record<string, unknown>;
};
```

Le stockage peut continuer à réutiliser :

```txt
appendAdminOperationAudit(...)
```

si ce système conserve correctement les données.

Ne pas créer une nouvelle table si le journal existant répond au besoin.

## Validation du motif

Créer un helper central, par exemple :

```ts
export function normalizeModerationReason(
  value: unknown,
  options?: { required?: boolean },
): string | null
```

Règle minimale pour une opération sensible :

```txt
reason.trim().length >= 5
```

## Motif obligatoire pour

```txt
reject_action
hide_action
delete_content
remove_participant_admin_override
change_organizer
correct_impact
confirm_participant_admin_override
correct_points
restore_after_sanction
```

Adapter les noms aux conventions existantes du repo.

## Ne pas exiger de motif pour

Par défaut :

```txt
lecture
ouverture normale de formulaire par son organisateur
acceptation normale d’une demande par son organisateur
annulation personnelle de sa propre demande
```

## Avant/après

Pour toute correction de donnée sensible :

```txt
previousValue obligatoire
newValue obligatoire
```

Ne pas se contenter de :

```txt
editedFields: ["wasteKg", ...]
```

## Tests obligatoires

Ajouter ou compléter :

```txt
motif valide → accepté
motif absent sur opération sensible → 400
motif trop court → 400
ancienne valeur enregistrée
nouvelle valeur enregistrée
cible utilisateur enregistrée si applicable
utilisateur ordinaire ne peut pas créer un audit de modération
```

---

# 8. LOT 3 — Sécuriser les transitions de statut

## Priorité

**P0**

## Fichiers

```txt
apps/web/src/app/api/actions/route.ts
apps/web/src/app/api/actions/[actionId]/route.ts
apps/web/src/lib/actions/permissions.ts
apps/web/src/lib/actions/permissions.test.ts
apps/web/src/app/api/actions/[actionId]/route.test.ts
```

## Règle cible de création

### Pré-action publiée

```txt
utilisateur ordinaire → pending
admin-like sur sa propre action → approved
```

### Déclaration finale complète

```txt
utilisateur ordinaire → pending
admin-like sur sa propre action → approved
```

### Brouillon

```txt
pas de validation inutile
pas de publication publique
```

## Point à arbitrer explicitement dans le code

Le comportement actuel de soumission rapide peut produire :

```txt
quick → approved
```

même pour un utilisateur ordinaire.

Le backlog cible exige :

```txt
utilisateur ordinaire → pending
```

Donc :

- supprimer l’auto-approbation générique des quick submissions ordinaires ;
- conserver seulement une exception si une règle produit explicite, actuelle et testée l’exige réellement ;
- dans ce cas, documenter précisément cette exception.

## Route d’édition d’une action

Ne plus faire automatiquement :

```txt
post_action_complete → approved
```

pour n’importe quel créateur ou organisateur.

Utiliser une décision explicite :

```ts
const canAutoApprove = canAutoApproveOwnAction(...)
const canChangeStatus = canChangeActionStatus(...)
```

Contrat :

```txt
créateur ordinaire finalise → pending
organisateur ordinaire finalise → pending
admin-like finalise sa propre action → approved
admin-like modère une action tierce → route/commande explicite + audit
```

## Tests obligatoires

```txt
utilisateur crée pré-action → pending
admin crée sa pré-action → approved
utilisateur crée déclaration finale → pending
admin crée sa déclaration finale → approved
utilisateur finalise via PATCH → pending
organisateur finalise action d’un autre dans son périmètre → pending
admin finalise sa propre action → approved
utilisateur ordinaire ne peut pas appeler une transition globale admin
```

Mettre à jour les tests existants qui attendent actuellement une approbation automatique incompatible avec le contrat final.

---

# 9. LOT 4 — Masquage et restauration

## Priorité

**P0**

## But

Permettre de retirer une action des surfaces publiques sans perdre son historique.

## Ne pas faire

Ne pas transformer tous les cas de modération en :

```txt
status = rejected
```

Ne pas supprimer physiquement l’action par défaut.

## Modèle recommandé

Avant migration, vérifier qu’aucun champ équivalent n’est apparu depuis le dernier audit.

S’il n’existe toujours rien, ajouter une migration versionnée avec un modèle distinct de visibilité.

Exemple recommandé :

```sql
alter table public.actions
add column if not exists moderation_visibility text not null default 'visible'
  check (moderation_visibility in ('visible', 'hidden')),
add column if not exists hidden_at timestamptz,
add column if not exists hidden_by_clerk_id text,
add column if not exists hidden_reason text;
```

Pour une restauration :

```txt
moderation_visibility = visible
hidden_at = null
hidden_by_clerk_id = null
```

Le motif historique reste dans le journal d’audit.

## Types à mettre à jour

Selon les conventions réelles :

```txt
apps/web/src/lib/actions/types.ts
apps/web/src/lib/actions/data-contract.ts
apps/web/src/lib/actions/unified-source.ts
apps/web/src/types/database.ts
```

et tout générateur de types réellement utilisé.

## Commandes de modération

Réutiliser une route admin existante si elle convient.

Sinon créer une route unique et explicite, par exemple :

```txt
POST /api/actions/[actionId]/moderation
```

avec un schéma discriminé :

```ts
{
  operation: "hide_action" | "restore_action";
  reason: string;
}
```

## Permissions

```txt
admin-like seulement
```

Utiliser :

```ts
canUseAdminOverride(...)
```

ou le helper central approprié.

## Audit

### Masquage

Enregistrer :

```txt
operation = hide_action
reason
previousValue
newValue
actor
action
```

### Restauration

Enregistrer :

```txt
operation = restore_action
reason obligatoire si restauration après sanction
previousValue
newValue
actor
action
```

## Surfaces publiques à vérifier

Au minimum :

```txt
carte
/api/actions public
formulaires de groupe
page action publique
rapports publics concernés
statistiques publiques concernées
exports publics concernés
liens directs
```

## Règle

Une action masquée :

```txt
absente des listes publiques
absente de la carte
absente des formulaires de groupe
encore visible dans les surfaces admin autorisées
```

Une restauration :

```txt
ne rend l’action publique que si son statut et ses autres règles de publication l’autorisent
```

## Tests obligatoires

```txt
action visible apparaît sur carte
action masquée disparaît de la carte
action masquée disparaît des formulaires de groupe
action masquée reste disponible pour l’admin
lien public direct vers action masquée ne révèle pas le contenu
admin autorisé peut restaurer
utilisateur ordinaire ne peut ni masquer ni restaurer
restauration ne contourne pas pending/rejected
```

---

# 10. LOT 5 — Dérogations administratives vraiment séparées

## Priorité

**P0**

## But

Conserver le flux normal distinct de la modération.

## Flux normal à préserver

```txt
POST /api/actions/group-join
→ pending
→ group_form
```

même pour :

```txt
admin
elu
max
```

## Dérogation participant

La fonction existante :

```ts
addActionParticipationByAdmin(...)
```

est une bonne base, mais le contrat cible doit devenir explicite.

Renommer seulement si utile et sans casse inutile, par exemple :

```ts
addActionParticipationByAdminOverride(...)
```

## Exigences

Une dérogation admin doit :

```txt
vérifier rôle admin-like
être inaccessible au flux normal
exiger un motif si confirmation forcée
créer un audit
enregistrer la cible utilisateur
enregistrer ancien/nouvel état
utiliser une source dédiée et claire
```

## Source

Si le schéma permet d’ajouter proprement une valeur :

```txt
admin_override
```

préférer cette valeur à l’ambigu `admin`.

Mais ne pas casser des données historiques sans migration.

Si `admin` doit rester pour compatibilité :

- documenter que cette source signifie override administratif ;
- ne jamais l’utiliser pour un admin rejoignant normalement une action.

## Tests obligatoires

```txt
admin normal join → pending/group_form
elu normal join → pending/group_form
max normal join → pending/group_form
override sans motif → refusé
override par non-admin → 403
override par admin → confirmed/source dédiée
override → audit avec reason + targetUserId + before/after
```

---

# 11. LOT 6 — Correction d’impact et progression idempotente

## Priorité

**P0**

## But

Une correction admin d’impact ne doit jamais provoquer une double attribution.

## Champs concernés

Au minimum :

```txt
waste_kg
cigarette_butts
volunteers_count
duration_minutes
waste_breakdown
photos si elles influencent une estimation
vision_estimate si elle influence les calculs
```

## Architecture recommandée

Ne pas laisser une correction sensible se confondre avec une édition générique.

Préférer :

```txt
commande/route explicite de correction d’impact
```

par exemple :

```txt
POST /api/actions/[actionId]/moderation
operation = correct_impact
```

ou réutiliser une route admin existante si elle couvre correctement :

- permission ;
- motif ;
- transaction ;
- audit ;
- recalcul.

## Étapes obligatoires

Pour chaque correction :

1. charger la valeur actuelle ;
2. vérifier l’admin-like ;
3. valider le motif ;
4. valider les nouvelles valeurs ;
5. écrire la modification ;
6. recalculer les données dérivées ;
7. recalculer la progression de manière idempotente ;
8. rafraîchir les snapshots/caches pertinents ;
9. enregistrer avant/après dans l’audit.

## Gamification

Auditer les fonctions existantes avant d’en créer de nouvelles :

```txt
refreshProgressionProfile
progression_events
loadValidatedActionIdsForUser
buildPostActionRetentionLoop
trackNewPlaceVisited
```

Le résultat final doit garantir :

```txt
même action validée deux fois
→ pas de double récompense

correction d’impact
→ état final recalculé
→ pas d’événement dupliqué

restauration
→ pas de double récompense
```

Ne pas supprimer aveuglément tout l’historique de progression.

## Concurrence

Pour toute opération multi-étapes sensible :

- préférer transaction/RPC si le projet possède déjà le pattern ;
- sinon ajouter une protection idempotente explicite ;
- ne pas faire deux attributions indépendantes sans verrou logique.

## Tests obligatoires

```txt
correction waste_kg → impact dérivé cohérent
correction cigarette_butts → impact dérivé cohérent
correction volunteers_count → progression cohérente
correction duration_minutes → progression cohérente
même correction répétée → pas de double XP
restauration → pas de double XP
retrait participant → pas de double attribution restante si le contrat l’exige
audit contient before/after/reason
```

---

# 12. LOT 7 — Modération globale des actions

## Priorité

**P1**

## But

Couvrir proprement les opérations admin prévues par le produit.

## Capacités minimales

```txt
approve_action
reject_action
hide_action
restore_action
edit_action
change_organizer
correct_impact
admin_add_participant
admin_remove_participant
reopen_action si le modèle le permet
```

Ne pas ajouter de statut inexistant sans besoin réel.

## Endpoint

Avant création, auditer les routes admin actuelles.

Si aucune route canonique n’existe, créer une surface unique de modération, par exemple :

```txt
POST /api/actions/[actionId]/moderation
```

Schéma discriminé recommandé :

```ts
z.discriminatedUnion("operation", [
  ...
])
```

Chaque opération possède :

- payload minimal ;
- motif si obligatoire ;
- permission ;
- validation d’état ;
- audit ;
- test.

## Changement d’organisateur

Exiger :

```txt
admin-like
reason obligatoire
target user valide
before/after
audit
```

Ne pas écraser silencieusement les coorganisateurs.

## Rejet

Exiger :

```txt
reason obligatoire
transition valide
audit before/after
```

## Réouverture

Ne l’ajouter que si une notion réelle d’action clôturée existe.

Ne pas inventer un statut `closed` si le schéma actuel ne l’utilise pas.

---

# 13. LOT 8 — RLS et sécurité serveur

## Priorité

**P1**

## Auditer

```txt
actions
action_participants
action_organizers
journal d’audit utilisé
photos éventuelles
tables d’impact éventuelles
progression_events
```

## Vérifier

```txt
utilisateur ordinaire ne modifie pas le statut global directement
organisateur ne gère que ses actions
coorganisateur ne gère que ses actions
admin modère via un chemin serveur explicite
journal d’audit non modifiable par un utilisateur ordinaire
journal d’audit non supprimable par un modérateur standard sauf règle explicite
RPC sensibles correctement permissionnées
```

## Important

Le code serveur actuel peut utiliser un client service-role par défaut.

Donc les vérifications applicatives côté serveur sont obligatoires.

Ne pas considérer RLS seule comme protection suffisante si le handler contourne RLS avec `service_role`.

## Tests

Ajouter les tests RLS ou de permissions serveur adaptés aux patterns déjà présents dans le repo.

---

# 14. LOT 9 — Documentation

## Priorité

**P1**

Mettre à jour seulement après correction réelle.

## Fichiers minimum

Vérifier et mettre à jour les sources réellement canoniques :

```txt
documentation/security/AUTHZ.md
documentation/security/authz-authn-regles.md
documentation/pages_site/routes/02-agir/formulaire-de-groupe/formulaire-de-groupe-README.md
documentation des actions si une fiche canonique existe
backlog-codex-permissions-admin-moderation-actions.md
```

Ne pas dupliquer la même matrice dans plusieurs fichiers.

## Documenter clairement

```txt
parcours normal
dérogation admin
auto-validation admin de sa propre création
admin rejoignant normalement → pending/group_form
organisateur gère sa propre file
coorganisateur gère sa propre file
admin supervise toutes les files
motifs obligatoires
journalisation
masquage/restauration
correction d’impact
gamification idempotente
```

## Statut final du backlog

Ne passer à :

```txt
Reste à faire : aucun point bloquant
```

que lorsque tous les critères P0 sont validés et que les critères de la section 15 sont réellement cochés.

---

# 15. Critères d’acceptation finaux

Codex doit remplacer chaque case par `[x]` seulement après preuve réelle.

## Permissions

- [ ] rôles `admin`, `elu`, `max` centralisés ;
- [ ] créateur peut gérer sa propre file ;
- [ ] organisateur peut gérer sa propre file ;
- [ ] coorganisateur autorisé peut gérer sa propre file ;
- [ ] organisateur ne peut pas gérer une autre action ;
- [ ] participant simple ne peut pas modérer une file ;
- [ ] admin-like peut gérer toute file ;
- [ ] admin-like peut modifier toute action via un chemin autorisé ;
- [ ] utilisateur ordinaire ne peut pas changer directement le statut global.

## Participation

- [ ] utilisateur rejoint normalement → `pending` ;
- [ ] admin rejoint normalement → `pending` ;
- [ ] `elu` rejoint normalement → `pending` ;
- [ ] `max` rejoint normalement → `pending` ;
- [ ] source normale → `group_form` ;
- [ ] dérogation admin distincte du flux normal ;
- [ ] dérogation sans rôle adéquat → refusée ;
- [ ] dérogation sensible sans motif → refusée ;
- [ ] dérogation crée un audit complet.

## Création et statut

- [ ] pré-action ordinaire publiée → `pending` ;
- [ ] pré-action admin-like sur sa propre action → `approved` ;
- [ ] déclaration finale ordinaire → `pending` ;
- [ ] déclaration finale admin-like sur sa propre action → `approved` ;
- [ ] brouillon admin n’est pas inutilement soumis à validation ;
- [ ] finalisation par utilisateur ordinaire ne force pas `approved` ;
- [ ] rejet admin exige un motif ;
- [ ] transition globale non autorisée → refusée.

## Audit

- [ ] auteur enregistré ;
- [ ] action enregistrée ;
- [ ] opération enregistrée ;
- [ ] motif enregistré lorsqu’obligatoire ;
- [ ] ancienne valeur enregistrée lorsqu’une donnée change ;
- [ ] nouvelle valeur enregistrée lorsqu’une donnée change ;
- [ ] cible utilisateur enregistrée si nécessaire ;
- [ ] utilisateur ordinaire ne peut pas écrire arbitrairement dans le journal.

## Visibilité

- [ ] masquage admin implémenté ;
- [ ] restauration admin implémentée ;
- [ ] action masquée absente de la carte ;
- [ ] action masquée absente des formulaires de groupe ;
- [ ] action masquée absente des listes publiques ;
- [ ] action masquée reste accessible à l’admin ;
- [ ] lien direct public ne révèle pas une action masquée ;
- [ ] restauration ne contourne pas le statut de publication.

## Impact et gamification

- [ ] correction poids recalcule les données dépendantes ;
- [ ] correction mégots recalcule les données dépendantes ;
- [ ] correction volontaires recalcule les données dépendantes ;
- [ ] correction durée recalcule les données dépendantes ;
- [ ] correction d’impact est auditée avant/après ;
- [ ] correction d’impact exige un motif ;
- [ ] même correction répétée ne double pas les points ;
- [ ] restauration ne double pas les récompenses ;
- [ ] recalcul de progression est idempotent.

## Validation

- [ ] tests ciblés permissions passent ;
- [ ] tests ciblés group-join passent ;
- [ ] tests ciblés modération passent ;
- [ ] tests ciblés visibilité passent ;
- [ ] tests ciblés impact/gamification passent ;
- [ ] typecheck passe ;
- [ ] lint des fichiers modifiés passe ;
- [ ] suite de tests globale pertinente passe ;
- [ ] build passe ;
- [ ] documentation mise à jour.

---

# 16. Tests minimum à créer ou corriger

## Permissions

```txt
apps/web/src/lib/actions/permissions.test.ts
```

Couvrir :

```txt
admin
elu
max
benevole
créateur
organisateur
coorganisateur
extérieur
```

## Création

Compléter les tests de :

```txt
apps/web/src/app/api/actions/route.ts
```

pour :

```txt
pre_action ordinary → pending
pre_action admin → approved
post_action_complete ordinary → pending
post_action_complete admin → approved
quick ordinary → comportement explicitement décidé
```

## Édition et statut

```txt
apps/web/src/app/api/actions/[actionId]/route.test.ts
```

Couvrir :

```txt
creator ordinary finalise → pending
organizer ordinary finalise → pending
admin own action finalise → approved
ordinary cannot global status override
admin edit third-party action → audit
```

## File de participation

```txt
apps/web/src/app/api/actions/[actionId]/group-join/route.get.test.ts
apps/web/src/app/api/actions/[actionId]/group-join/route.post.test.ts
apps/web/src/app/api/actions/[actionId]/group-join/route.patch.test.ts
```

Couvrir :

```txt
creator
organizer
coorganizer
outsider
admin-like
audit admin tierce
```

## Flux normal

```txt
apps/web/src/app/api/actions/group-join/route.test.ts
```

Couvrir explicitement :

```txt
ordinary → pending/group_form
admin → pending/group_form
elu → pending/group_form
max → pending/group_form
```

## Modération

Créer ou compléter les tests de la route canonique retenue pour :

```txt
reject with reason
reject without reason
hide
restore
change organizer
admin add participant
admin remove participant
correct impact
unauthorized user rejected
audit before/after
```

## Visibilité

Ajouter des tests aux services qui alimentent réellement :

```txt
/api/actions
map
group forms
public action page
```

## Gamification

Ajouter des tests de non-régression pour :

```txt
same correction twice
same restoration twice
same validated action twice
participant removal if progression depends on participant
```

---

# 17. Ordre d’exécution recommandé

Exécuter strictement dans cet ordre :

```txt
LOT 0  Revalidation
LOT 1  File organisateur/coorganisateur
LOT 2  Motifs + audit
LOT 3  Statuts et auto-validation
LOT 4  Masquage/restauration
LOT 5  Overrides admin
LOT 6  Impact + gamification idempotente
LOT 7  Modération globale
LOT 8  RLS et sécurité serveur
LOT 9  Documentation
```

Ne pas commencer le gros chantier de visibilité avant d’avoir sécurisé la file et les motifs.

---

# 18. Commandes de validation

Commencer par les tests ciblés réellement présents.

Exemples :

```bash
npm test -- permissions
npm test -- group-join
npm test -- group-participation
npm test -- moderation
npm test -- action
```

Puis :

```bash
npm run typecheck
npm run lint
npm test
npm run test:security
npm run test:regression-gates
npm run build
```

Si le repo possède désormais une commande globale réellement complète :

```bash
npm run checks
```

Ne pas lancer plusieurs commandes lourdes en parallèle.

---

# 19. Rapport final obligatoire pour Codex

À la fin, produire un rapport concis avec :

```txt
1. commit de départ
2. fichiers modifiés
3. migrations créées
4. permissions ajoutées ou corrigées
5. comportement organisateur/coorganisateur
6. flux normal admin vs override
7. motifs obligatoires
8. audit avant/après
9. masquage/restauration
10. correction impact/gamification
11. tests ajoutés
12. commandes réellement exécutées
13. résultats
14. limites restantes
15. critères non cochés
```

Ne pas écrire « terminé » si une seule exigence P0 reste non satisfaite.

---

# 20. Définition stricte de terminé

Le backlog n’est terminé que si :

```txt
organisateur peut gérer sa file
coorganisateur autorisé peut gérer sa file
extérieur ne peut pas
admin normal join reste pending/group_form
override est séparé et audité
motifs obligatoires sont réellement validés
statuts globaux sont protégés
masquage/restauration fonctionne sur toutes les surfaces publiques
corrections d’impact recalculent correctement
aucune double progression n’est possible
tests passent
typecheck passe
lint passe
build passe
documentation est alignée
```

Toute autre situation doit rester :

```txt
Statut : actif / partiellement exécuté
```
