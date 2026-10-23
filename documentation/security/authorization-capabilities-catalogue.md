# Catalogue des capacités métier

> Module associé à [authorization-capabilities.md](./authorization-capabilities.md). Statut : PLAN / TARGET.

## 6. Capacités métier canoniques

Les noms ci-dessous constituent le vocabulaire cible. Ils peuvent être implémentés par des helpers existants ou futurs sans imposer un moteur générique unique.

### Actions

```txt
actions.create
actions.view_public
actions.view_own
actions.edit_own
actions.manage_organized
actions.view_organization
actions.view_territory
actions.moderate_territory
actions.moderate_global
actions.edit_validated_impact
actions.view_moderation_audit
```

### Participations

```txt
participants.join_self
participants.cancel_self
participants.manage_organized
participants.admin_override
```

### Signalements et données terrain

```txt
signalements.create
signalements.view_own
signalements.edit_own
signalements.review_scoped
signalements.moderate_global
```

### Rapports et analyse

```txt
reports.view_personal
reports.view_organization
reports.view_territory
reports.view_global
reports.export_personal
reports.export_organization
reports.export_territory
reports.export_global
analytics.view_sanitized
analytics.export_sanitized
```

### Annuaire et partenaires

```txt
directory.view_public
directory.manage_own
directory.manage_organization
directory.review_global
partners.manage_requests
```

### Communauté

```txt
community.use
community.manage_own
community.moderate_global
```

### Administration

```txt
admin.view_backoffice
admin.run_operational_tools
admin.view_audit
roles.assign_self_service
roles.assign_privileged
platform.admin
```

Cette liste est un vocabulaire de conception. Ne pas créer des helpers inutilisés uniquement pour matérialiser chaque chaîne.
