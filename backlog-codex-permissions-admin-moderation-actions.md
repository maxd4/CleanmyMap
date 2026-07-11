# Backlog Codex — Permissions administrateur et modération des actions

## Contexte projet

Dépôt unique autorisé :

`C:\Users\sophi\Desktop\MAXENCE\business\CleanmyMap-main`

Respecter strictement `AGENTS.md` :

- ne créer aucun dossier projet parallèle ;
- ne créer aucun worktree ;
- ne pas modifier le header global ni le footer global ;
- conserver la palette et les composants UI existants ;
- privilégier des modifications ciblées, typées, testées et documentées ;
- ne pas contourner silencieusement les règles métier.

Ce backlog complète le backlog consacré aux membres manuels et aux formulaires de groupe.

---

# 1. Objectif

Mettre en place une politique cohérente de permissions pour :

- les utilisateurs ordinaires ;
- les organisateurs ;
- les participants ;
- les rôles de modération `admin`, `elu` et `max`.

Principe général :

> Les utilisateurs suivent le parcours normal. Les administrateurs peuvent intervenir à tout moment en aval en cas d’abus, d’erreur, de litige ou de correction, avec journalisation obligatoire.

L’administrateur ne doit pas être automatiquement exempté des règles lorsqu’il agit comme utilisateur ordinaire.

Exemples :

- un admin qui rejoint l’action d’un tiers passe par la file normale ;
- un admin qui publie son propre formulaire peut être auto-validé ;
- un admin qui modifie une action existante utilise un pouvoir de modération explicite et traçable.

---

## État d'avancement

### Déjà exécuté

- centralisation initiale des permissions d'action dans un helper dédié ;
- auto-validation des pré-actions créées par un utilisateur de modération sur son propre compte ;
- normalisation du parcours de participation: le bouton normal de join reste en attente pour tous les profils ;
- centralisation de l'accès à la route d'édition d'action sur créateur, organisateurs et profils de modération ;
- réutilisation du helper central dans les routes de revue et d'audit des actions ;
- complément de la matrice de permissions côté backend avec `canModerateAnyAction` ;
- mise à jour de la documentation d'autorisation et du parcours Formulaire de groupe ;
- journalisation des dérogations admin sur l'édition d'action, l'ouverture/fermeture du formulaire de groupe et la modération de participants ;
- tests ciblés et lint ciblé passés sur le lot permissions/modération.

### Reste à faire

- aucun point bloquant identifié à ce stade dans ce backlog.

---

# 2. Règles métier définitives

## 2.1 Création et validation d’un formulaire

### Utilisateur ordinaire

- brouillon privé : aucune validation admin ;
- publication comme formulaire de groupe : statut `pending` ;
- déclaration finale destinée à la carte, aux statistiques ou à l’impact : statut `pending` ;
- apparition publique uniquement après validation selon les règles existantes.

### Admin, élu ou max

- brouillon privé : aucune validation ;
- publication de son propre formulaire : validation automatique ;
- déclaration finale créée par lui-même : validation automatique ;
- ne jamais demander à un admin de valider manuellement son propre formulaire.

La validation automatique doit être explicite dans le code et testée.

## 2.2 Gestion normale d’un groupe

L’organisateur ou un coorganisateur autorisé doit pouvoir :

- voir les demandes de participation ;
- accepter une demande ;
- refuser une demande ;
- ajouter un membre manuellement ;
- retirer un membre ;
- ouvrir ou fermer les inscriptions ;
- consulter les participants confirmés ;
- modifier les informations opérationnelles de son action dans les limites autorisées.

Un admin conserve les mêmes droits sur toutes les actions, mais en tant que superviseur.

## 2.3 Admin rejoignant une action

Lorsqu’un admin rejoint l’action organisée par un autre utilisateur via le bouton normal :

- créer une participation `pending` ;
- utiliser la source normale `group_form` ;
- placer la demande dans la file de l’organisateur ;
- ne pas confirmer automatiquement ;
- ne pas utiliser la source `admin`.

Le rôle admin ne doit pas donner automatiquement une place dans une action privée ou organisée par un tiers.

## 2.4 Membres ajoutés manuellement

Pour le flux normal :

- l’organisateur ajoute un membre ;
- la participation est créée avec un statut à confirmer par le membre, si ce statut est implémenté ;
- aucune validation admin n’est requise ;
- l’admin n’a pas à examiner chaque membre ajouté.

Si le projet conserve provisoirement le statut `confirmed` pour la première version, documenter cette limite et ne pas prétendre qu’un consentement a été obtenu.

## 2.5 Dérogation administrative

Un admin peut effectuer une action directe uniquement via une commande de modération explicite.

Exemples :

- confirmer un participant sans passer par la file normale ;
- ajouter un participant dans le cadre d’une correction historique ;
- modifier un organisateur ;
- corriger une donnée d’impact ;
- masquer une action ;
- restaurer une action ;
- rejeter une action ;
- rouvrir ou fermer les inscriptions ;
- retirer un contenu abusif.

Toute dérogation doit :

- exiger une autorisation admin ;
- être séparée du parcours utilisateur normal ;
- demander un motif pour les opérations sensibles ;
- créer une entrée dans le journal de modération.

---

# 3. Matrice de permissions

Implémenter ou documenter la matrice suivante.

| Opération | Participant | Organisateur | Admin / élu / max |
|---|---:|---:|---:|
| Voir une action publique | Oui | Oui | Oui |
| Modifier son propre profil de participation | Oui | Non | Oui |
| Demander à rejoindre | Oui | Oui si non organisateur | Oui, mais file normale |
| Annuler sa propre demande | Oui | Oui | Oui |
| Voir les demandes de l’action | Non | Oui | Oui |
| Accepter ou refuser une demande | Non | Oui | Oui |
| Ajouter un membre manuellement | Non | Oui | Oui |
| Retirer un participant | Non | Oui | Oui |
| Ouvrir ou fermer les inscriptions | Non | Oui | Oui |
| Modifier les informations courantes de l’action | Non | Oui, si propriétaire | Oui |
| Modifier les données d’impact après validation | Non | Limité ou nouvelle validation | Oui |
| Changer le statut global | Non | Non | Oui |
| Masquer ou restaurer une action | Non | Non | Oui |
| Modifier les organisateurs | Non | Limité | Oui |
| Corriger une attribution de points | Non | Non | Oui |
| Supprimer ou masquer une photo abusive | Non | Limité sur sa propre action | Oui |
| Consulter le journal de modération | Non | Éventuellement son action | Oui |

Ne pas coder la matrice uniquement dans le frontend.

---

# 4. Audit initial obligatoire

Avant modification, inspecter au minimum :

- `apps/web/src/lib/authz.ts`
- `apps/web/src/lib/profiles.ts`
- `apps/web/src/app/api/actions/route.ts`
- `apps/web/src/app/api/actions/[actionId]/route.ts`
- `apps/web/src/app/api/actions/group-join/route.ts`
- `apps/web/src/app/api/actions/[actionId]/group-join/route.ts`
- `apps/web/src/lib/actions/group-participation.ts`
- `apps/web/src/lib/actions/group-participation.helpers.ts`
- `apps/web/src/lib/actions/organizers.ts`
- `apps/web/src/lib/actions/store.ts`
- `apps/web/src/lib/actions/types.ts`
- `apps/web/src/lib/validation/action.ts`
- composants de modération ou d’administration existants ;
- pages d’historique et de gestion des actions ;
- migrations Supabase relatives à :
  - `actions`
  - `action_participants`
  - `action_organizers`
  - journaux d’audit existants.

Identifier :

- la fonction actuelle qui reconnaît `admin`, `elu` et `max` ;
- les endroits où `isAdminLikeProfile` provoque une validation automatique ;
- les endroits où un admin est confirmé automatiquement comme participant ;
- les endpoints réservés uniquement aux admins alors qu’ils devraient aussi autoriser l’organisateur ;
- les mécanismes de journalisation déjà présents ;
- les contrôles RLS Supabase concernés ;
- les surfaces UI déjà prévues pour modérer une action.

Ne pas créer un nouveau système d’autorisation parallèle si un système central existe déjà.

---

# 5. Centralisation des permissions

Créer ou compléter un module central de permissions.

Exemple de fonctions attendues :

```ts
canAutoApproveOwnAction(identity, action)
canManageAction(identity, action, organizerIds)
canReviewActionParticipants(identity, action, organizerIds)
canUseAdminOverride(identity)
canModerateAnyAction(identity)
canEditValidatedImpact(identity, action)
canChangeActionStatus(identity)
canViewModerationAudit(identity)
```

Contraintes :

- éviter les comparaisons de rôles dispersées ;
- éviter les chaînes `"admin"`, `"elu"` et `"max"` répétées dans plusieurs routes ;
- réutiliser `isAdminLikeProfile` ou créer une fonction unique équivalente ;
- distinguer :
  - permission normale de l’organisateur ;
  - permission globale de l’admin ;
  - dérogation explicite de modération.

Ne jamais utiliser uniquement un booléen envoyé par le client pour accorder une permission.

---

# 6. Correction du flux de création

Dans `POST /api/actions` :

## 6.1 Utilisateur ordinaire

- pré-action publiée : `pending` ;
- déclaration finale : `pending`, sauf règle métier existante explicitement documentée ;
- brouillon : non public et sans validation.

## 6.2 Admin-like

Si l’utilisateur courant est `admin`, `elu` ou `max` :

- sa propre pré-action publiée peut être créée `approved` ;
- sa propre déclaration finale peut être créée `approved` ;
- conserver une trace indiquant que la validation était automatique en raison du rôle.

Ne pas valider automatiquement une action créée au nom d’un tiers sans vérifier le contexte.

Ajouter des tests précis pour les pré-actions, car le comportement actuel peut forcer `pending` même pour un admin.

---

# 7. Correction du flux « rejoindre une action »

Supprimer le comportement où un admin est automatiquement confirmé lorsqu’il utilise le parcours normal.

Le flux normal doit toujours appeler :

```ts
joinActionParticipation(...)
```

avec le même comportement de statut pour tous les utilisateurs :

```ts
participationStatus: "pending"
participationSource: "group_form"
```

Le rôle admin ne doit pas modifier ce résultat.

Conserver une fonction séparée pour une dérogation administrative, par exemple :

```ts
addActionParticipationByAdminOverride(...)
```

Cette fonction doit :

- vérifier le rôle ;
- demander un motif ;
- journaliser l’opération ;
- utiliser une source claire, par exemple `admin_override` ;
- ne pas être appelée depuis le bouton normal « Rejoindre ».

Ne pas réutiliser la source `admin` pour une participation normale d’un administrateur.

---

# 8. Correction de la file de participation

Les endpoints de consultation et de traitement de la file doivent autoriser :

- l’organisateur principal ;
- les coorganisateurs autorisés ;
- les rôles admin-like.

Actuellement, vérifier si certaines branches n’autorisent que les rôles admin-like.

Réutiliser une vérification centralisée :

```ts
canReviewActionParticipants(...)
```

L’organisateur doit pouvoir :

- voir `pendingRequests` ;
- voir `confirmedParticipants` ;
- accepter ;
- refuser ;
- ajouter un participant ;
- retirer un participant.

L’admin doit pouvoir faire la même chose sur toute action.

Les actions de l’admin doivent être journalisées lorsqu’elles modifient l’action d’un tiers.

---

# 9. Supervision administrative en aval

Un admin doit pouvoir modifier toute action après création.

Prévoir au minimum :

## 9.1 Contenu du formulaire

- titre ;
- description ;
- date ;
- horaires ;
- lieu ;
- coordonnées ;
- zone cible ;
- consignes ;
- accessibilité ;
- matériel ;
- logistique ;
- statut de publication.

## 9.2 Organisation

- organisateur principal ;
- coorganisateurs ;
- participants ;
- demandes en attente ;
- ouverture ou fermeture des inscriptions.

## 9.3 Résultats et impact

- poids collecté ;
- mégots ;
- catégories de déchets ;
- nombre de bénévoles ;
- durée ;
- photos ;
- notes ;
- calculs d’impact dérivés ;
- attribution de points ou progression, si recalcul nécessaire.

## 9.4 Statut et visibilité

- `pending` ;
- `approved` ;
- `rejected` ;
- masqué ;
- restauré ;
- annulé ;
- clôturé.

Avant d’ajouter de nouveaux statuts, auditer le modèle existant.

Éviter de surcharger `rejected` pour tous les cas si un champ de visibilité ou de modération existe déjà.

---

# 10. Journal de modération

## 10.1 Table

Réutiliser une table d’audit existante si elle convient.

Sinon créer une migration Supabase versionnée pour une table similaire à :

```sql
create table public.action_moderation_audit (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.actions(id) on delete cascade,
  admin_user_id text not null,
  operation text not null,
  reason text,
  previous_value jsonb,
  new_value jsonb,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now())
);
```

Adapter les types et les identifiants au schéma réel.

## 10.2 Opérations à journaliser

Journalisation obligatoire pour :

- approbation ;
- rejet ;
- masquage ;
- restauration ;
- annulation ;
- modification des données d’impact ;
- modification d’un organisateur ;
- ajout ou retrait administratif d’un participant ;
- confirmation administrative sans consentement ;
- suppression ou masquage d’une photo ;
- modification du nombre de volontaires ;
- correction de points ou progression ;
- réouverture d’une action clôturée.

## 10.3 Motif obligatoire

Le motif est obligatoire pour :

- rejet ;
- masquage ;
- suppression ;
- retrait d’un participant ;
- changement d’organisateur ;
- modification d’impact ;
- dérogation de confirmation ;
- correction de points ;
- restauration après sanction.

Validation :

```ts
reason.trim().length >= 5
```

ou règle cohérente avec le projet.

## 10.4 Contenu du journal

Enregistrer :

- action concernée ;
- admin auteur ;
- opération ;
- ancienne valeur ;
- nouvelle valeur ;
- motif ;
- date ;
- éventuelle cible utilisateur ;
- identifiant de requête ou contexte technique si disponible.

Ne pas enregistrer de secrets, jetons ou données sensibles inutiles.

---

# 11. Interface de modération

Auditer les surfaces admin existantes avant de créer une nouvelle page.

Ajouter des contrôles sobres et ciblés :

- « Approuver »
- « Rejeter »
- « Modifier »
- « Masquer »
- « Restaurer »
- « Gérer les organisateurs »
- « Gérer les participants »
- « Corriger l’impact »
- « Voir l’historique de modération »

Pour les actions sensibles :

1. ouvrir une modale ;
2. afficher clairement la cible ;
3. demander un motif ;
4. afficher les conséquences ;
5. confirmer l’opération.

Ne pas afficher les contrôles admin aux utilisateurs non autorisés.

Ne pas se contenter de masquer les boutons : sécuriser aussi les endpoints.

---

# 12. Gestion des modifications d’impact

Lorsqu’un admin modifie une donnée servant aux calculs :

- recalculer les indicateurs dérivés ;
- recalculer les points ou la progression si nécessaire ;
- éviter les doubles attributions ;
- journaliser les valeurs avant et après ;
- rafraîchir les snapshots ou caches publics concernés ;
- vérifier les rapports et exports dépendants.

Ajouter des tests de non-régression sur :

- poids ;
- mégots ;
- volontaires ;
- durée ;
- impact environnemental ;
- gamification.

---

# 13. Suppression, masquage et restauration

Préférer une suppression logique ou un masquage lorsque le contenu doit rester auditable.

Comportement recommandé :

- `masqué` : retiré des surfaces publiques, conservé en base ;
- `rejected` : refusé par modération ;
- `restauré` : rendu visible après correction ;
- suppression physique uniquement dans les cas explicitement prévus.

Vérifier l’impact sur :

- carte ;
- page des formulaires de groupe ;
- historique ;
- statistiques ;
- exports ;
- rapports ;
- gamification ;
- liens directs.

---

# 14. Sécurité serveur

Toutes les opérations sensibles doivent vérifier côté serveur :

- identité Clerk ;
- rôle actuel ;
- propriété de l’action ;
- appartenance aux organisateurs ;
- état courant de l’action ;
- validité de la transition ;
- présence du motif si nécessaire.

Prévenir :

- élévation de privilèges par payload ;
- modification d’une action par simple connaissance de son ID ;
- auto-confirmation admin via le flux normal ;
- accès organisateur à une action qu’il ne gère pas ;
- double traitement d’une demande ;
- double attribution de points ;
- modification concurrente écrasant une correction récente.

Utiliser une transaction ou une RPC pour les opérations multi-étapes sensibles si possible.

---

# 15. RLS Supabase

Auditer les politiques RLS des tables :

- `actions`
- `action_participants`
- `action_organizers`
- table de journal de modération
- éventuelles tables de photos ou d’impact.

S’assurer que :

- les routes serveur utilisent le client adapté ;
- un utilisateur ordinaire ne peut pas modifier directement le statut ;
- un organisateur ne peut gérer que ses actions ;
- un admin peut modérer toutes les actions via le chemin serveur prévu ;
- le journal d’audit n’est pas modifiable par un utilisateur ordinaire ;
- les entrées d’audit ne sont pas supprimables par les modérateurs standards, sauf règle explicite.

---

# 16. Tests obligatoires

## 16.1 Création

- utilisateur crée une pré-action publiée → `pending` ;
- admin crée sa pré-action publiée → `approved` ;
- utilisateur crée une déclaration finale → `pending` ;
- admin crée sa déclaration finale → `approved` ;
- admin créant un brouillon → aucun passage inutile en validation.

## 16.2 Rejoindre

- utilisateur rejoint → `pending`, source `group_form` ;
- admin rejoint l’action d’un tiers via le bouton normal → `pending`, source `group_form` ;
- admin ne contourne pas la file ;
- dérogation admin explicite → `confirmed`, source dédiée, audit créé ;
- utilisateur non autorisé ne peut pas appeler la dérogation.

## 16.3 File de participation

- organisateur voit la file de son action ;
- organisateur accepte ;
- organisateur refuse ;
- organisateur ne voit pas la file d’une autre action ;
- admin voit toute file ;
- admin traite une demande ;
- action admin sur action tierce → audit créé.

## 16.4 Modération d’action

- admin modifie une action tierce ;
- utilisateur ordinaire est refusé ;
- organisateur modifie seulement les champs autorisés ;
- rejet avec motif ;
- rejet sans motif refusé ;
- masquage ;
- restauration ;
- changement d’organisateur ;
- correction d’impact ;
- retrait administratif d’un participant ;
- journal avant/après correct.

## 16.5 Visibilité

- action masquée absente de la carte ;
- action masquée absente des formulaires de groupe ;
- action masquée conservée dans l’admin ;
- action restaurée réapparaît selon son statut ;
- lien direct vers contenu masqué respecte les permissions.

## 16.6 Gamification et impact

- correction d’impact recalcule les données ;
- pas de double XP ;
- retrait d’un participant corrige l’attribution si prévu ;
- restauration ne double pas les récompenses.

## 16.7 Audit

- auteur admin enregistré ;
- motif enregistré ;
- ancienne valeur enregistrée ;
- nouvelle valeur enregistrée ;
- cible utilisateur enregistrée si nécessaire ;
- utilisateur ordinaire ne peut pas écrire ou modifier le journal.

---

# 17. Documentation à mettre à jour

Mettre à jour au minimum :

- documentation des actions ;
- documentation des formulaires de groupe ;
- documentation de sécurité ;
- règles d’authentification et d’autorisation ;
- documentation de modération ;
- éventuelle matrice des rôles.

Documenter :

- différence entre parcours normal et dérogation admin ;
- auto-validation des contenus créés par un admin ;
- absence d’auto-confirmation lorsqu’un admin rejoint une action ;
- droits de l’organisateur sur sa file ;
- capacités de supervision globale ;
- journalisation ;
- motifs obligatoires ;
- conséquences sur l’impact et la gamification.

---

# 18. Critères d’acceptation

Le ticket est terminé uniquement si :

- [ ] les rôles admin-like sont centralisés ;
- [ ] un admin peut modifier toute action en aval ;
- [ ] les opérations sensibles sont journalisées ;
- [ ] un motif est obligatoire pour les opérations définies ;
- [ ] l’organisateur peut gérer la file de sa propre action ;
- [ ] l’organisateur ne peut pas gérer une autre action ;
- [ ] un admin peut gérer toutes les files ;
- [ ] un admin rejoignant normalement une action passe en `pending` ;
- [ ] la source de sa demande normale reste `group_form` ;
- [ ] une dérogation admin utilise un endpoint ou une commande séparée ;
- [ ] une dérogation crée un audit ;
- [ ] une pré-action publiée par un admin est auto-validée ;
- [ ] une déclaration finale créée par un admin est auto-validée ;
- [ ] un utilisateur ordinaire ne peut pas changer le statut global ;
- [ ] une action masquée disparaît des surfaces publiques ;
- [ ] une action restaurée respecte les règles de visibilité ;
- [ ] les corrections d’impact recalculent les données dérivées ;
- [ ] aucune double attribution de points n’est introduite ;
- [ ] les tests ciblés passent ;
- [ ] le typecheck passe ;
- [ ] le lint des fichiers modifiés passe ;
- [ ] la documentation est à jour.

---

# 19. Ordre d’exécution recommandé

1. Auditer les rôles et permissions existants.
2. Écrire la matrice de permissions dans le code et la documentation.
3. Centraliser les helpers d’autorisation.
4. Corriger l’auto-validation des créations admin.
5. Supprimer l’auto-confirmation admin dans le flux normal de participation.
6. Autoriser les organisateurs à gérer leur file.
7. Séparer la dérogation admin du parcours normal.
8. Créer ou adapter le journal de modération.
9. Ajouter les actions de supervision admin.
10. Sécuriser les endpoints.
11. Auditer et corriger les RLS.
12. Ajouter les tests de permissions.
13. Ajouter les tests d’impact et de gamification.
14. Mettre à jour la documentation.
15. Exécuter la validation finale.

---

# 20. Commandes de validation

Adapter les commandes aux scripts réellement disponibles.

Exécuter au minimum :

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Commencer par les tests ciblés si disponibles :

```bash
npm test -- group-join
npm test -- group-participation
npm test -- action
npm test -- authz
npm test -- moderation
```

Collecter toutes les erreurs du périmètre avant de conclure.

---

# 21. Rapport final demandé à Codex

À la fin, produire un rapport concis contenant :

1. permissions ajoutées ou modifiées ;
2. endpoints modifiés ;
3. migration créée ;
4. journalisation ajoutée ;
5. flux admin normal versus dérogation ;
6. tests ajoutés ;
7. commandes exécutées ;
8. résultats ;
9. limites restantes ;
10. tickets complémentaires éventuels.

Ne pas annoncer que le travail est terminé si :

- un admin rejoint encore automatiquement une action ;
- un organisateur ne peut toujours pas gérer sa propre file ;
- une opération admin sensible n’est pas journalisée ;
- les endpoints reposent seulement sur le masquage frontend ;
- les corrections d’impact peuvent doubler la gamification ;
- les tests de permissions ne passent pas.
