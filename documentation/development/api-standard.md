# API HTTP — standard transverse (`CURRENT`)

Ce contrat concerne les routes Next.js API de CleanMyMap. Les contrats par méthode, leurs consommateurs et la sécurité du domaine prévalent sur un diagramme générique. **Aucune enveloppe unique de succès** n'est imposée à toutes les API ; préserver le DTO exact de chaque route. L'ancienne fiche de vigilance API est absorbée ici pour éviter une logique de garde concurrente.

## Propriétaires

| Besoin | Owner |
|---|---|
| Inventaire de décisions AuthN/AuthZ par méthode | `apps/web/src/lib/auth/api-authorization-contract.ts` et fragments `api-authorization-contract.*.ts` |
| Vérification des méthodes et de leurs gardes | `apps/web/src/app/api/api-boundary.test.ts`, tests de handler concernés |
| Règles AuthN/AuthZ CURRENT | [`../security/authz-authn-regles.md`](../security/authz-authn-regles.md) |
| Modèle cible des capacités | [`../security/authorization-capabilities.md`](../security/authorization-capabilities.md) (`PLAN / TARGET`, pas permission effective) |
| Erreurs communes lorsqu'utilisées | `apps/web/src/lib/http/api-errors.ts` et `apps/web/src/lib/http/auth-responses.ts` |
| Entrées publiques et anti-abus | `apps/web/src/lib/security/validation.ts`, rate limit et BotID propres à la route |
| Journal des opérations privilégiées | `apps/web/src/lib/admin/audit/operation-audit.ts`, [`../security/admin-operation-audit.md`](../security/admin-operation-audit.md) |
| Modèle des données exposées | DTO du domaine, RLS, [`../architecture/data-governance.md`](../architecture/data-governance.md) |

## Décision à chaque méthode HTTP

```mermaid
flowchart TD
  A["Requête HTTP"] --> B{"Classe du handler ?"}
  B -- "public-safe / exception publique" --> C["Garde publique : payload borné, projection publique, anti-abus si applicable"]
  B -- "lecture privée / mutation authentifiée" --> D["AuthN serveur"]
  B -- "privilégié / service / webhook" --> E["AuthN ou vérification technique selon contrat"]
  D --> F["AuthZ : capacité, rôle, scope, relation, état"]
  E --> F
  F --> G["Validation de payload et invariants métier"]
  C --> G
  G --> H["Effet métier / accès données autorisé"]
  H --> I["Enregistrer le résultat d'audit réel si nécessaire"]
  I --> J["Réponse bornée, statut et cache adaptés"]
```

Ce schéma décrit des **frontières logiques**, pas un ordre uniforme d'implémentation. Certaines routes publiques valident les données sans session ; les webhooks utilisent une signature ; les routes admin exigent une autorisation renforcée. Les contrôles de taille de corps, rate limit, identité et validation métier doivent être placés avant les effets concernés, selon la sécurité réelle du flux. Un audit peut tracer un refus ou un échec ; **aucun succès n'est enregistré avant l'effet confirmé**.

## Réponses et erreurs

- Utiliser le code HTTP fidèle au résultat (`2xx`, `4xx`, `5xx`) ; préserver les champs JSON actuellement consommés, la sémantique et les en-têtes pertinents.
- Lorsqu'une route utilise `api-errors.ts`, son erreur commune inclut notamment `error`, `kind`, `referenceCode`, `status`, avec des détails de validation optionnels. Le `status` dans le JSON n'est **pas** le code de réponse HTTP.
- Ne pas transformer un retour existant en `{ success, payload }` sans modifier explicitement les contrats de tous ses consommateurs.
- Ne pas exposer dans le corps, l'URL, les logs ou un audit public de secret, stack trace, token, PII injustifiée, payload externe brut ou détail technique dangereux.
- Préserver les réponses `429` et leurs champs spécifiques au flux ; ne pas supposer une enveloppe identique pour toutes les routes.
- Une route qui pagine expose explicitement sa fenêtre et son état de
  continuation (`hasMore`/`nextCursor` lorsqu'ils appartiennent à son contrat).
  Le curseur doit être borné, validé côté serveur et lié au tri déterministe de
  la source ; une page ciblée par identifiant reste distincte d'une fenêtre
  paginée. Le champ `count` conserve la sémantique déjà consommée par la route
  et ne devient pas silencieusement un total global.
- Lorsqu'une même ressource expose plusieurs fenêtres ordonnées indépendantes,
  la fenêtre demandée est explicite dans le contrat (`phase` pour les
  événements communautaires) et le curseur doit lui correspondre. Chaque
  fenêtre conserve son propre `hasMore` et `nextCursor` ; une fenêtre future ne
  doit pas rendre une fenêtre passée inaccessible par un balayage implicite.

## Sécurité des données et opérations

1. Tout identifiant issu du client est une **adresse de ressource**, jamais une preuve d'ownership. Résoudre la ressource côté serveur, contrôler la relation, le scope, l'état et la projection de retour.
2. Les services `getSupabaseAdminClient()` ou `getSupabaseServerClient(true)` donnent un accès technique privilégié ; ils n'élargissent pas l'AuthZ de l'utilisateur HTTP. RLS et privilèges SQL restent vérifiés à leurs frontières réelles.
3. Un chemin Storage prévisible ne signe pas une pièce privée. Les exports agrégés excluent les identifiants individuels non nécessaires. Les mutations de compte n'écrivent que les champs explicitement admis par le schéma serveur.
4. Validation d'URL : parseur/allowlist selon le domaine, jamais un simple `startsWith` ; les expressions régulières sur entrées externes restent bornées.
5. Les formulaires publics peuvent nécessiter honeypot, timestamp, BotID, rate limit ou consentement selon la surface ; ne pas ajouter un garde qui exige une session sans base contractuelle.
6. Les mutations admin, modérations, imports et exports sensibles utilisent la journalisation prévue par leur contrat ; l'issue `success` appartient à un effet réellement confirmé.

## Preuves de modification

Lire le handler, la validation, le service, les DTO, les clients et les tests couvrant les cas autorisés **et interdits**. Le test d'inventaire statique d'API ne remplace pas des tests d'intégration AuthZ, RLS, Storage et de concurrence. Les commandes et niveaux de preuve appartiennent à [`TESTING.md`](./TESTING.md). Ne pas traiter une CI préexistante rouge comme une régression nouvelle sans comparaison du parent.

## Découverte des consommateurs Web et Mobile

Pour retrouver une route et ses méthodes, utiliser le registre AuthZ par
méthode et les analyseurs du test de frontière API, puis vérifier le handler.
Le rapport `npm run audit:vercel:api-routes` inventorie les fichiers route
mais ne constitue ni un contrat de méthode ni une décision d'autorisation.
Le graphe d'imports complète la découverte des services et tests directement
reliés ; les appels HTTP par chaîne ne sont pas des imports TypeScript.

Pour Mobile, partir de [l'architecture du workspace](../../apps/mobile/README.md)
et de `apps/mobile/shared/lib/mobile-api-client.ts`. Ce client HTTP ajoute
le Bearer Clerk et délègue aux contrats serveur existants. Examiner aussi les
appels fetch directs, les RPC et accès Supabase : une absence dans le graphe
HTTP ne prouve pas une absence de consommation.

| Famille | Client Mobile à examiner | Handler Web / frontière |
|---|---|---|
| Actions, participation, invitations, revue | `features/actions/mobile-actions-service.ts` | `api/mobile/actions/`, `api/actions/` |
| Signalements | même service et consommateurs du domaine | `api/spots/`, `api/signalements/` |
| Compte, profil actif, préférences | `features/account/mobile-account-service.ts` | `api/mobile/account/`, `api/account/`, `api/users/profile/`, `api/notifications/` |
| Légendes territoriales | `features/territorial-legends/mobile-territorial-legends-service.ts` | `api/gamification/territorial-leaderboard/overview/`, `api/users/profile/territorial-legend-consent/` |
| Mission liée et GPS | `features/tracking/linked-mission-service.ts`, `tracking-service.ts` | `api/missions/`, réconciliation, tables missions/gps_points et RLS |

Les chemins clients sont relatifs à `apps/mobile/` et les handlers à
`apps/web/src/app/`. Ce tableau oriente par famille, sans prétendre recenser
chaque appel. Par exemple, annuler une participation mobile et annuler une
action en tant qu'administrateur sont des opérations différentes.

Pour un inventaire généré, rattacher une occurrence au fichier source,
à la ligne, au motif de chemin et à la méthode déclarée ; conserver les
correspondances ambiguës ou dynamiques non résolues. Réutiliser le contrat
AuthZ et ses tests pour les méthodes serveur et les décisions de droits,
sans les déduire d'un préfixe d'URL, d'un nom de fonction ou d'un Bearer.
Les preuves de disponibilité, d'AuthZ et de compatibilité restent celles
des tests comportementaux et d'intégration concernés.
