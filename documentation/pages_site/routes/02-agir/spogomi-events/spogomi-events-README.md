# Mes événements SPOGOMI

## Fiche canonique

- **Route** : `/spogomi/mes-evenements`
- **Source** : `apps/web/src/app/(app)/spogomi/mes-evenements/page.tsx`
- **Type fonctionnel** : catalogue privé des événements gérables
- **Famille / bloc fonctionnel** : Agir
- **Accès / SEO** : `protected` ; `NOINDEX`, `INTERNAL_ONLY`, `NONE`
- **Autorisation** : la session est vérifiée côté serveur puis le catalogue est filtré par les relations et permissions organisateur existantes ; aucune donnée privée n'est ajoutée à la page publique
- **Navigation** : les événements autorisés ouvrent `/spogomi/[eventSlug]/espace` ; la création passe par `/spogomi/nouveau` ; `/dashboard/spogomi` reste une redirection de compatibilité
- **Limites** : aucun nouveau privilège, service métier ou modèle de donnée n'est introduit

Le contrat métier est [`documentation/features/spogomi.md`](../../../../features/spogomi.md).
