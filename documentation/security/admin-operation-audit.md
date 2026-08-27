# Audit des opérations administratives

Ce document définit le contrat canonique de journalisation des opérations administratives sensibles de CleanMyMap.

Il complète :

- [`authz-authn-regles.md`](./authz-authn-regles.md) pour l'AuthN/AuthZ et les dérogations ;
- [`authorization-capabilities.md`](./authorization-capabilities.md) pour les capacités et scopes ;
- `apps/web/src/lib/admin/README.md` pour la frontière de code du domaine admin.

Le journal d'audit n'accorde aucun droit. Il intervient **après** la décision AuthZ pour rendre une opération sensible traçable.

## 1. Finalité

Un audit admin doit permettre de répondre, sans exposer de données inutiles, aux questions suivantes :

```text
qui a agi ?
sur quelle ressource ?
quelle opération a été tentée ?
avec quel résultat ?
quel état pertinent existait avant ?
quel état pertinent existe après ?
à quelle étape un échec s'est-il produit ?
une mutation partielle a-t-elle réellement eu lieu ?
```

L'audit sert à la redevabilité, au diagnostic de sécurité et à la reconstruction d'une décision privilégiée.

Il ne remplace jamais :

- l'AuthN ;
- l'AuthZ ;
- l'ownership ;
- les validations métier ;
- les contraintes SQL/RLS ;
- les logs techniques ;
- les métriques métier.

## 2. Implémentation canonique

Journal transversal :

```text
apps/web/src/lib/admin/audit/operation-audit.ts
```

Adaptateur spécialisé pour les emails de test :

```text
apps/web/src/lib/admin/audit/email-test-audit.ts
```

Audit spécialisé du domaine Actions :

```text
apps/web/src/lib/actions/moderation-audit.ts
```

Persistence de production :

```text
public.admin_operations_audit
```

Le fallback fichier local n'est toléré que lorsque la politique de persistence runtime autorise explicitement ce mode de développement. Il n'est pas une persistence de production.

## 3. Frontière entre audit transversal et audit de domaine

`appendAdminOperationAudit(...)` est le mécanisme transversal de persistence.

Un domaine peut encapsuler ce mécanisme lorsqu'il doit garantir un contrat plus strict.

Exemple :

```text
Actions
→ appendActionModerationAudit(...)
→ appendAdminOperationAudit(...)
```

Cette encapsulation est souhaitable lorsque le domaine doit imposer :

- une liste d'opérations métier ;
- un motif obligatoire ;
- une cible utilisateur ;
- une allowlist before/after ;
- des règles de minimisation propres au domaine.

Ne pas déplacer `apps/web/src/lib/actions/moderation-audit.ts` dans `lib/admin`. Il reste une spécialisation du domaine Actions.

## 4. Structure canonique d'une entrée

Le type transversal actuel est `AdminOperationAuditEntry`.

Champs de premier niveau :

| Champ | Règle |
|---|---|
| `operationId` | identifiant unique de la tentative ou opération |
| `at` | horodatage ISO de l'audit |
| `actorUserId` | identifiant utilisateur canonique de l'acteur |
| `actorLabel` | enrichissement d'affichage non canonique |
| `operationType` | famille bornée d'opération |
| `outcome` | `success` ou `error` |
| `targetId` | identifiant de la ressource cible lorsque disponible |
| `details` | objet strictement borné au contrat de l'opération |

Familles actuellement supportées :

```text
moderation
import_dry_run
import_confirm
role_management
admin_operation
```

`operationType` ne doit pas être utilisé comme substitut à l'opération métier détaillée. Pour les opérations génériques, `details.operation` porte un identifiant métier borné.

## 5. Règle d'identité

L'acteur canonique provient de l'identité déjà autorisée côté serveur.

Exemple :

```ts
const access = await requireAdminAccess();

if (!access.ok) {
  return adminAccessErrorJsonResponse(access);
}

const actorUserId = access.userId;
```

Ne jamais utiliser comme acteur canonique :

- une valeur fournie par le client ;
- un email ;
- un display name ;
- un rôle ;
- une valeur de formulaire ;
- un header arbitraire ;
- `service_role`.

`service_role` est une identité technique de persistence, pas l'auteur utilisateur de l'opération.

## 6. Quand créer un audit

Une opération privilégiée mutable ou un effet externe sensible doit être auditée lorsqu'elle est exécutée dans un parcours administrateur.

Exemples :

- modération ;
- dérogation de participation ;
- changement de rôle ;
- décision de promotion ;
- publication ou correction d'une ressource administrée ;
- import confirmé ;
- capture ou snapshot manuel persistant ;
- persistence d'un rapport administrateur ;
- envoi d'un email de test par un admin ;
- mise à jour d'un contrôle runbook.

Les lectures administratives ordinaires ne nécessitent pas automatiquement un audit de mutation.

Exemples normalement non audités :

- dashboard en lecture seule ;
- métriques admin lues sans mutation ;
- export en lecture seule, sauf contrat spécifique ;
- GET de diagnostic ;
- requête refusée avant AuthZ.

La question canonique est :

```text
cette tentative autorisée peut-elle modifier un état durable
ou produire un effet externe privilégié ?
```

Si oui, un audit doit être envisagé.

## 7. Une tentative = un audit final pertinent

Pour une tentative admin autorisée, éviter les écritures d'audit intermédiaires qui produiraient plusieurs événements concurrents pour la même opération.

La cible est :

```text
tentative
→ mutation / effet
→ résultat connu
→ un audit final
```

Exceptions : un domaine peut avoir plusieurs opérations métier réellement distinctes dans une même requête. Dans ce cas, les identifiants et contrats doivent rendre cette distinction explicite.

Ne pas auditer une requête qui échoue avant d'avoir franchi le contrôle AuthZ, sauf contrat de sécurité séparé explicitement dédié aux refus d'accès.

## 8. Succès

Un audit `success` n'est écrit qu'après que l'effet considéré comme réussi par le contrat métier est connu.

Exemple :

```text
persistence réussie
→ outcome: success
```

Ne jamais produire `success` :

- avant l'écriture ;
- après une validation seulement ;
- lorsqu'une persistence obligatoire a échoué ;
- lorsqu'un effet externe requis n'a pas été confirmé ;
- lorsque le résultat réel est ambigu.

## 9. Erreur et stages bornés

Les erreurs d'audit utilisent des codes et des stages bornés.

Exemples de stages :

```text
validation
lookup
preparation
persistence
update
item_write
post_write
post_update
send
configuration
audit_finalize
```

La liste exacte appartient au contrat de l'opération. Ne pas créer une chaîne libre à partir d'un message d'exception.

Les codes d'erreur doivent également être bornés :

```text
invalid_json
invalid_payload
not_found
persistence_failed
send_failed
snapshot_not_persisted
```

Ne jamais recopier dans l'audit :

- `error.message` externe ;
- stack trace ;
- message Supabase brut ;
- message Resend brut ;
- réponse d'un fournisseur ;
- payload brut.

## 10. Mutation partielle

`partialMutation` signifie qu'une partie de la mutation durable a **réellement réussi** avant l'échec final.

Valeurs :

```text
false
→ aucune mutation durable connue comme réussie

true
→ au moins une mutation durable est connue comme réussie
   avant un échec ultérieur
```

Ne jamais utiliser `partialMutation: true` sur une simple hypothèse.

Exemples :

```text
lookup échoue
→ false

première écriture échoue
→ false

2 éléments d'un import sont persistés, le 3e échoue
→ true

upsert réussit, relecture post-write échoue
→ true
```

Si le code ne peut pas déterminer honnêtement si une écriture a eu lieu, il doit améliorer son contexte d'erreur plutôt que d'inventer une valeur.

Les services qui peuvent échouer après une écriture peuvent remonter un contexte typé contenant par exemple :

```ts
{
  stage: "post_write",
  partialMutation: true
}
```

## 11. Before / after

Les snapshots avant/après servent uniquement à reconstruire la modification pertinente.

Ils doivent être construits par **allowlist**.

Correct :

```json
{
  "previousValue": {
    "status": "pending"
  },
  "newValue": {
    "status": "approved"
  }
}
```

Incorrect :

```text
previousValue = ligne SQL complète
newValue = payload complet
```

Ne pas inclure un champ uniquement parce qu'il est disponible dans l'objet métier.

Pour une propriété volumineuse ou sensible, enregistrer au besoin un indicateur de changement plutôt que son contenu.

Exemple :

```text
notesChanged: true
```

au lieu de journaliser les notes.

## 12. Motif

Un motif est obligatoire uniquement lorsque le contrat métier classe l'opération comme dérogation sensible nécessitant une justification.

Le domaine Actions possède ses propres règles de motif.

Ne pas imposer artificiellement un motif à toutes les opérations admin : cela dégraderait le produit sans améliorer la traçabilité.

Lorsqu'un motif est requis :

- le valider côté serveur ;
- le normaliser ;
- lui appliquer les contraintes du domaine ;
- ne pas permettre à un objet `details` libre d'écraser le champ canonique.

## 13. Minimisation des données

Le journal admin n'est pas un second entrepôt métier.

Interdictions par défaut :

- email ;
- adresse ;
- téléphone ;
- contenu de message ;
- notes libres ;
- HTML ;
- sujet d'email ;
- payload de formulaire ;
- description longue ;
- identifiant fournisseur inutile ;
- secret ;
- token ;
- clé API ;
- stack trace ;
- erreur technique brute.

Préférer :

```text
identifiant canonique
code borné
compteur
booléen
enum
scope
stage
before/after allowlisté
```

Une donnée doit être présente parce qu'elle est nécessaire à la redevabilité de l'opération, pas parce qu'elle est facilement accessible.

## 14. Effets externes

Un effet externe admin, par exemple un email de test, suit le même principe :

```text
AuthZ admin
→ validation
→ effet externe
→ résultat borné
→ audit
```

L'audit peut conserver :

- type d'opération ;
- route ;
- stage ;
- nombre de destinataires ;
- statut de livraison borné ;
- code d'erreur borné.

Il ne doit pas conserver le destinataire, le sujet, le HTML ou le message fournisseur.

Un parcours local de développement autorisé par un token technique n'est pas artificiellement présenté comme une opération admin s'il ne possède pas d'acteur admin canonique.

## 15. Persistence et lecture

En production, `appendAdminOperationAudit(...)` persiste dans `admin_operations_audit`.

`listAdminOperationAudit(...)` lit le journal avec une limite bornée et peut filtrer par `targetId`.

L'identité canonique persistée est `actorUserId`. `actorLabel` est un enrichissement d'affichage et ne doit jamais devenir la clé d'identité.

Le journal n'est pas public. Toute surface de lecture doit appliquer le contrat AuthZ adapté.

Une erreur de persistence de l'audit ne doit jamais être décrite comme un rollback de la mutation métier si aucun rollback réel n'a eu lieu.

## 16. Contrat de route recommandé

Structure générale :

```text
AuthN/AuthZ
→ créer operationId
→ validation
→ lookup éventuel
→ mutation / effet
→ déterminer success/error
→ déterminer stage
→ déterminer partialMutation si pertinent
→ construire détails allowlistés
→ appendAdminOperationAudit
→ réponse HTTP
```

Le `operationId` doit rester stable sur toute la tentative.

## 17. Tests obligatoires pour une nouvelle mutation admin

Une nouvelle opération sensible doit couvrir au minimum les cas applicables :

- refus AuthZ : aucune mutation et aucun faux audit admin ;
- succès : un audit ;
- validation invalide : audit error après AuthZ si la tentative est pertinente ;
- not-found ;
- erreur de persistence ;
- erreur après écriture si le flux en comporte une ;
- `partialMutation` exact ;
- before/after allowlisté ;
- motif si obligatoire ;
- absence de PII et d'erreur brute ;
- absence de double audit.

Quand une route encapsule l'audit dans un helper de domaine, les tests peuvent vérifier ce helper plutôt que rechercher une chaîne textuelle directement dans le handler.

## 18. Revue de couverture

Une passe de couverture admin doit rechercher conjointement :

```text
requireAdminAccess
appendAdminOperationAudit
appendActionModerationAudit
```

Puis classifier les handlers mutables :

```text
POST
PATCH
PUT
DELETE
```

Chaque handler privilégié doit être classé comme :

```text
mutation auditée
effet externe audité
non-mutant malgré la méthode HTTP
hors parcours admin
service/cron avec contrat distinct
```

Un simple décompte de `requireAdminAccess` n'est pas une preuve de défaut.

## 19. Anti-patterns

Interdits :

```text
isAdmin ? allow : deny
```

sans vérifier la capacité/scope requis lorsque le domaine en exige un ;

```text
audit({ payload: body })
```

pour gagner du temps ;

```text
partialMutation: true
```

sans preuve d'écriture ;

```text
outcome: "success"
```

avant la persistence ;

```text
details: { error: String(error) }
```

avec une erreur fournisseur brute ;

```text
deux audits success/error pour la même tentative
```

sans opérations métier distinctes.

## 20. Checklist

Avant de livrer une nouvelle mutation admin :

- [ ] AuthN/AuthZ serveur corrects ;
- [ ] acteur canonique ;
- [ ] `operationId` stable ;
- [ ] opération métier bornée ;
- [ ] `targetId` lorsque pertinent ;
- [ ] `success` seulement après effet réussi ;
- [ ] stages bornés ;
- [ ] codes d'erreur bornés ;
- [ ] `partialMutation` fidèle ;
- [ ] before/after par allowlist ;
- [ ] motif uniquement lorsque le domaine le requiert ;
- [ ] aucune PII inutile ;
- [ ] aucune erreur externe brute ;
- [ ] une tentative = un audit final pertinent ;
- [ ] tests success/error/partial-write adaptés ;
- [ ] lecture du journal protégée.

## 21. Références de code

```text
apps/web/src/lib/admin/audit/operation-audit.ts
apps/web/src/lib/admin/audit/operation-audit.test.ts
apps/web/src/lib/admin/audit/email-test-audit.ts
apps/web/src/lib/actions/moderation-audit.ts
apps/web/src/lib/actions/moderation-audit.test.ts
apps/web/src/lib/admin/README.md
apps/web/src/lib/admin/audit/README.md
```
