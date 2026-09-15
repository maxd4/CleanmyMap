# Missions - Présentation détaillée

## Fiche canonique

- **Route** : `/missions/[id]`
- **Dossier canonique** : `missions`
- **Rôle** : consulter une mission terrain existante et les données GPS enregistrées par l'application compagnon lorsqu'elles sont disponibles.
- **Périmètre** : route dynamique protégée ; lecture serveur de la mission et des points GPS, avec propriétaire `volunteer_id` ou profil admin-like (`admin`/`max`) autorisé. `elu` ne bénéficie d'aucun accès implicite.
- **États à documenter** : redirection vers la connexion, mission absente ou interdite sans distinction de contenu, mission en attente avec QR de démarrage, mission lue avec données horaires/mesures, absence de tracé GPS et erreur de lecture.
- **Composants concernés** : `readAuthorizedMission`, `PageHeader`, panneaux différés de QR et de carte, contrat de statut/formatage mission, `MissionMap`.
- **Notes d'audit** : l'autorisation et l'existence de la mission sont vérifiées avant la lecture des `gps_points`. Le QR renvoie vers le démarrage du suivi ; la carte n'affiche que les points enregistrés et indique « Aucun tracé enregistré » lorsqu'il n'y en a pas. La page ne déduit ni CO₂ ni eau, ne fabrique aucune mission ni statistique et ne publie pas ces données.
