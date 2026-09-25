# Profil impact - Présentation détaillée

## Fiche canonique

- **Route** : `/profil/impact`
- **Dossier canonique** : `profil-impact`
- **Rôle** : carte d’impact personnelle exportable et partageable pour le compte connecté.
- **Périmètre** : actions validées, niveau, rang, badges, export PNG et partage du fichier ; aucune donnée collective ni URL publique.
- **Point d’entrée** : bloc « Progression & badges » de `/profil/[profile]`, CTA « Voir ma carte d’impact ».
- **Navigation** : `SECONDARY_NAV`, hors ruban principal.
- **États à documenter** : chargement, accès refusé, export réussi/échoué et partage annulé ou indisponible.
- **Composants concernés** : `ImpactProfilePage`, `ImpactCard`, `CmmButton`, `ClerkRequiredGate` et l’export PNG.
- **Frontière avec `/reports`** : `/reports` conserve les analyses collectives, comparaisons territoriales et exports collectifs ; aucune fusion de données personnelles n’est attendue.
- **Notes d'audit** : `/profil/impact` est l’unique implémentation URL de cette surface ; `/profil/[profile]` reste réservé aux profils/rôles acceptés par `isAppProfile`.
