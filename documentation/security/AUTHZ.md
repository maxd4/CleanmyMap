# `AUTHZ.md` — façade de compatibilité

> **Statut : `COMPATIBILITY`**

Ce chemin historique est conservé parce qu'il est consommé par les skills et
par des références existantes. Il ne constitue pas une troisième source de
vérité et ne contient pas de matrice de permissions.

## Sources AuthZ

### Runtime actuel — `CURRENT`

Le contrat effectivement applicable est
[`authz-authn-regles.md`](./authz-authn-regles.md). Il décrit AuthN, AuthZ,
`GRANTED_ROLE`, `ACTIVE_ROLE`, les frontières d'accès, les exceptions runtime
documentées et les validations à appliquer aux surfaces existantes.

Le code et les tests sur `main` restent l'autorité finale lorsqu'une divergence
est constatée. Une session valide ne suffit jamais : le serveur doit vérifier
l'identité, la capacité, le rôle compatible, le scope ou ownership, l'état
métier et la projection de données nécessaire.

### Modèle de convergence — `PLAN / TARGET`

Le modèle par capacités et périmètres est dans
[`authorization-capabilities.md`](./authorization-capabilities.md). Il guide
la convergence future et ne doit jamais être présenté comme une description du
runtime actuel.

## Rappels de compatibilité

- `Role`, `GRANTED_ROLE`, `ACTIVE_ROLE`, `Parcours`, `Capability` et `Scope`
  restent distincts.
- `activeRole` est borné par le rôle obtenu ; `activeProfile` ne constitue
  jamais une preuve d'autorisation.
- Le client peut adapter l'interface, mais seul le serveur décide l'accès.
- Le proxy ne remplace pas le contrôle du handler ou du service serveur.
- `service_role` est une identité technique de persistence côté serveur, pas un
  rôle utilisateur ni une preuve d'AuthZ HTTP.

Pour les audits de mutations privilégiées, consulter
[`admin-operation-audit.md`](./admin-operation-audit.md). Pour l'entrée de tout
chantier sécurité, revenir à [`README.md`](./README.md).
