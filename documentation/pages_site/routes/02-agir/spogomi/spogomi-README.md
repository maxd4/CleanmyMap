# Découverte SPOGOMI

## Fiche canonique

- **Route** : `/spogomi`
- **Source** : `apps/web/src/app/(app)/spogomi/page.tsx`
- **Type fonctionnel** : découverte publique
- **Famille / bloc fonctionnel** : Agir
- **Statut** : CURRENT — orientation publique et compétitions publiées
- **Accès / SEO** : `public-visible` ; indexable seulement pour le contenu réellement rendu ; aucun brouillon n'est chargé
- **Parcours** : `PageHeader` conserve un sous-titre court et les deux actions publiques « Voir les compétitions » (`#spogomi-events`) et « Ouvrir le salon SPOGOMI ». Trois onglets accessibles exposent les actions Bénévoles, Arbitres & modération et Organisateurs, y compris avant authentification ; les liens privés transmettent uniquement une intention de parcours et ne modifient aucune permission. Les actions bénévoles d’inscription, d’équipe, de rattachement, d’assistance, de résultats, de contributions et d’attestations pointent vers des repères publics distincts qui expliquent leur condition d’accès.
- **Contenus secondaires** : la section « Comprendre SPOGOMI » expose les distinctions Casual, World Cup et « Règlement & sécurité » dans trois `CmmDisclosure` repliés par défaut. Les informations internationales sont regroupées en trois cartes compactes ; les actualités, sources, dates, statuts et filtres restent accessibles dans leurs disclosures respectifs.
- **Actions autorisées** : les bénévoles consultent les compétitions publiées et leurs fiches pour inscription, équipe, rattachement, contributions, attestations, résultats et discussion ; une participation privée liée sans fiche publique indique explicitement que le lien privé contextualisé remis par l’organisation est requis, sans basculer vers la gestion. Les arbitres choisissent dans `/spogomi/mes-evenements?parcours=referees` une édition liée à une habilitation active ; les organisateurs choisissent dans `/spogomi/mes-evenements?parcours=organizers` ou ouvrent `/spogomi/nouveau`. Les contrôles métier restent côté serveur et l’habilitation reste liée à une compétition précise.
- **Données** : parcours d'orientation, compétitions dont `public_visibility = published`, distinctions Casual/World Cup, présentation bilingue du mouvement, références officielles vérifiées, actualités éditoriales bornées et agenda externe prévisionnel/confirmé séparé des événements CleanMyMap
- **Overlays et identité** : les QR codes de partage utilisent le dialogue canonique `CmmDialog` (focus initial, Tab, Escape et restauration du focus) ; le rattachement SPOGOMI conserve son champ de code propriétaire avec `autocomplete="one-time-code"`, sans modifier les composants hébergés Clerk
- **État vide** : les compétitions privées, incomplètes ou annulées restent absentes et un état vide explicite est rendu
- **Limites** : aucun roster nominatif, classement, résultat ou score fictif ; l'agenda externe n'est pas exhaustif, ne crée pas d'action et ne publie pas de date non sourcée ; CleanMyMap ne revendique ni représentation mondiale ni partenariat officiel

Le contrat métier est [`documentation/features/spogomi.md`](../../../../features/spogomi.md).
