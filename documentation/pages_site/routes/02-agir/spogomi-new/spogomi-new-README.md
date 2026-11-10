# Nouvelle compétition SPOGOMI

## Fiche canonique

- **Route** : `/spogomi/nouveau`
- **Source** : `apps/web/src/app/(app)/spogomi/nouveau/page.tsx`
- **Type fonctionnel** : création privée d'une édition SPOGOMI
- **Famille / bloc fonctionnel** : Agir
- **Accès / SEO** : `protected` ; `NOINDEX`, `INTERNAL_ONLY`, `NONE`
- **Autorisation** : seule une identité dont le rôle actif (`ACTIVE_ROLE`) est `admin` ou `max` peut créer une édition ; l'alias historique `/dashboard/spogomi` reste accessible à toute identité authentifiée et redirige vers la liste relationnelle. La page et l'API de création réévaluent séparément `admin|max` côté serveur.
- **Refus d'accès** : une identité authentifiée dont le rôle actif n'est pas `admin|max` conserve une réponse 404 et l'état visuel privé « Cette page n'est pas accessible » ; aucune information de création n'est rendue. Une session absente reste redirigée vers Clerk.
- **Navigation** : après création, l'édition est reprise dans `/spogomi/mes-evenements` et son espace canonique est `/spogomi/[eventSlug]/espace`
- **Localisation et dates** : le formulaire exige une adresse sélectionnée ou un point choisi sur la carte ; l’étiquette de lieu reste distincte de la paire `latitude`/`longitude` portée par l’action CleanMyMap canonique. La carte accepte la recherche d’adresse, le lien Google Maps, le clic et le déplacement de l’épingle. Une nouvelle création transmet toujours `endsAt: null` ; `spogomi_events.ends_at` reste nullable pour l’historique et la future clôture.
- **Compatibilité** : `/dashboard/spogomi` redirige vers la liste ; les slugs `nouveau` et `mes-evenements` sont réservés aux nouvelles éditions, sans renommer les anciennes lignes
- **Limites** : aucun nouveau privilège, service métier ou modèle de donnée n'est introduit

Le contrat métier est [`documentation/features/spogomi.md`](../../../../features/spogomi.md).
