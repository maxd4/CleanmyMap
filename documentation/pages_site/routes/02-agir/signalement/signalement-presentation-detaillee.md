# Signalement déchets - Présentation détaillée

## Fiche canonique

- **Route** : `/signalement`
- **Dossier canonique** : `signalement`
- **Rôle** : permettre à un compte authentifié de créer une observation Trash Spotter et de suivre ses propres observations sans exposer celles d'un autre compte.
- **Périmètre** : le formulaire existant de `/signalement`, la section `#mes-observations` et la capacité propriétaire `GET /api/signalements/me`.
- **États à documenter** : liste en chargement, liste vide avec retour au formulaire, erreur retryable, liste récente avec statuts `new`, `validated`, `cleaned`, succès de création et partial success média.
- **Composants concernés** : `TrashSpotterOwnerLoop`, `TrashSpotterObservationForm`, `MyObservationsSection`, `SignalementMediaProofs`.
- **Contrat propriétaire** : `requireAuthenticatedAccess` détermine le `userId` côté serveur. La requête filtre exclusivement `created_by_clerk_id = userId`, borne la limite à 50 (20 par défaut), ne restitue pas les notes et désactive tout cache partagé.
- **Notes d'audit** : les médias sont chargés uniquement après activation explicite de `Voir les preuves photo`. La lecture propriétaire réutilise l'ownership backend média existant, y compris pour un parent `new`, et ne passe ni par `GET /api/actions` ni par un snapshot public.
