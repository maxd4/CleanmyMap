# Revue de sécurité de migration — `20261122000004`

Statut : **revue versionnée**, limitée à l'ajout du rôle de catalogue
`welcome_contact`.

Le SQL publié ajoute ou met à jour une seule ligne de
`public.action_field_role_catalog`, identifiée par le code constant
`welcome_contact`. En conflit sur `code`, seuls `label`, `description` et
`sort_order` reçoivent leurs valeurs déclarées dans le même `INSERT`. La
migration ne modifie ni les attributions existantes, ni les permissions, RLS,
grants ou RPC. Le commentaire de migration précise que l'affectation reste
informative et ne donne aucun droit d'organisateur.

L'autorisation du préflight porte sur l'identifiant, le nom de fichier et le
SHA-256 du SQL normalisé en fins de ligne LF :

```text
852da682aaccb16f639f2c46f162ec7a6ffb1fc5af4840df5be32ec4400e2e11
```

Toute modification du SQL, tout DML supplémentaire ou une migration différente
reste soumise au blocage `MIGRATION_DATA_RISK`. Cette revue ne prouve ni le
rejeu PostgreSQL éphémère ni l'état d'application distant.
