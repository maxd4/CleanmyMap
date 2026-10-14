# Nouvelle compétition SPOGOMI

## Fiche canonique

- **Route** : `/spogomi/nouveau`
- **Source** : `apps/web/src/app/(app)/spogomi/nouveau/page.tsx`
- **Type fonctionnel** : création privée d'une édition SPOGOMI
- **Famille / bloc fonctionnel** : Agir
- **Accès / SEO** : `protected` ; `NOINDEX`, `INTERNAL_ONLY`, `NONE`
- **Autorisation** : l'authentification est exigée côté serveur ; l'API existante conserve l'AuthZ, l'idempotence et la visibilité privée par défaut
- **Navigation** : après création, l'édition est reprise dans `/spogomi/mes-evenements` et son espace canonique est `/spogomi/[eventSlug]/espace`
- **Compatibilité** : `/dashboard/spogomi` redirige vers la liste ; les slugs `nouveau` et `mes-evenements` sont réservés aux nouvelles éditions, sans renommer les anciennes lignes
- **Limites** : aucun nouveau privilège, service métier ou modèle de donnée n'est introduit

Le contrat métier est [`documentation/features/spogomi.md`](../../../../features/spogomi.md).
