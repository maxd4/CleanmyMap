# Standard API & gestion des erreurs — CleanMyMap

Ce document définit les invariants transversaux des routes API. Il ne remplace
pas les contrats propres à chaque domaine ou route.

## 1. Contrats de réponse

CleanMyMap n'impose pas une enveloppe de succès unique à toutes ses API. Les
routes possèdent des contrats de réponse par domaine et par usage ; un
changement doit préserver la forme et les sémantiques consommées par ses
clients, tests et intégrations.

Les réponses de succès peuvent donc différer selon la route. Ne transforme pas
une réponse existante en `{ success, payload }` sans vérifier et faire évoluer
explicitement le contrat de tous ses consommateurs.

## 2. Contrat d'erreur courant

Le helper [apps/web/src/lib/http/api-errors.ts](../../apps/web/src/lib/http/api-errors.ts)
fournit les réponses d'erreur communes lorsque la route l'utilise. Leur forme
expose les champs suivants, avec des détails optionnels pour les erreurs de
validation :

```json
{
  "error": "Message sûr pour l'utilisateur",
  "kind": "permission",
  "referenceCode": "ERR-EXAMPLE",
  "status": "forbidden"
}
```

Le champ `status` du corps décrit l'état de l'erreur ; le statut HTTP est
retourné séparément par `NextResponse`. Ce helper ne normalise pas toutes les
réponses de succès et son usage ne supprime pas le contrat spécifique de la
route.

## 3. Invariants transversaux

Toute route API doit :

- retourner un statut HTTP correspondant au résultat réel (`2xx`, `4xx` ou
  `5xx`) ;
- valider les entrées avant l'appel métier ou la persistence ;
- vérifier l'AuthN et l'AuthZ adaptées à la surface (`public`, `authenticated`,
  `owner`, `admin-like`, service ou webhook signé) ;
- ne pas exposer de secrets, PII inutile, stack trace, payload brut ou détail
  technique d'un service externe dans la réponse client ;
- auditer les opérations sensibles selon le contrat du domaine.

Les routes sensibles restent derrière les contrôles serveur existants et ne
doivent pas contourner l'AuthZ pour atteindre directement la base.

## 4. Audit

Les opérations critiques — notamment suppression, validation d'action et export
de masse — doivent être tracées via
`apps/web/src/lib/admin/audit/operation-audit.ts`, sans exposer d'informations
techniques ou sensibles dans l'audit destiné à l'utilisateur.
