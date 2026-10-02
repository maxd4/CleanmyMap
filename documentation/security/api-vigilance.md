# API vigilance

## Decision tree authz / input validation / journalisation
```mermaid
flowchart TD
  A[Requete API entrante] --> B{Session/AuthN valide ?}
  B -- Non --> B1[401 Unauthorized]
  B -- Oui --> C{Endpoint sensible ?}
  C -- Oui --> D{Role autorise (AuthZ) ?}
  C -- Non --> E[Continuer controle input]
  D -- Non --> D1[403 Forbidden]
  D -- Oui --> E
  E --> F{Payload valide (schema/borne/type) ?}
  F -- Non --> F1[400 Bad Request]
  F -- Oui --> G{Operation sensible ?}
  G -- Oui --> H[Journalisation obligatoire]
  G -- Non --> I[Execution metier]
  H --> I
  I --> J[Reponse API + metriques]
```
Fallback statique:
```md
![API vigilance decision tree fallback](../archive/fallback-api-vigilance-decision.png)
```

## Gardes minimales
- Validation d'entree stricte
- Controle de role avant operations sensibles
- Journalisation des operations admin
- Sur les formulaires publics, anti-spam deterministe (`honeypot`, `submittedAt`)
- Reponses 429 homogenes sur les surfaces publiques
- Permissions minimales sur les jobs CI qui appellent ces routes

Les honeypots mentionnés ici participent au traitement anti-abus des formulaires
publics ; ils ne sont pas des honeytokens, decoys ou canaries de cybersécurité.
Ces contrôles actifs distincts suivent le contrat `CURRENT` de
[`SECURITY.md`](./SECURITY.md#contr%C3%B4les-de-deception-et-anti-abus) et son
registre exécutable.

## Zones sensibles
- `/api/admin/*`
- endpoints d'import/export data
- endpoints de moderation et classement

Le classement public Gamification est une exception explicitement nommée :
`PUBLIC_LEADERBOARD_EXCEPTION`. Sa route dédiée borne les paramètres côté
serveur, applique un rate limit de lecture et ne renvoie qu'une projection
sanitizée. Elle ne doit jamais être utilisée comme source d'AuthZ ni être
confondue avec le leaderboard authentifié CURRENT.
