# Réglages

## Fiche canonique

- **Route** : `/reglages`
- **Fichier(s) source(s)** :
- `apps/web/src/app/reglages/page.tsx`
- `apps/web/src/components/account/account-settings-editor.tsx`
- `apps/web/src/app/api/account/identity/route.ts`
- `apps/web/src/app/api/account/locations/route.ts`
- **Type fonctionnel** : outil
- **Famille / bloc fonctionnel** : Système & Utilitaires (hors bloc)
- **Statut** : standalone
- **Contexte nécessaire** : Compte connecté ; redirection vers `/sign-in` si la session est absente.
- **Objectif utilisateur principal** : Modifier les informations du compte, l'identité publique, les localisations et les préférences depuis cette surface canonique.
- **Action principale attendue** : Enregistrer une rubrique ciblée et obtenir un état confirmé, en attente de synchronisation ou en erreur récupérable.
- **Palette attendue** : sky / slate
- **Scope** : surface protégée en cinq rubriques : informations personnelles Clerk, identité publique et handle Supabase, localisations indépendantes `residence`/`work` dans `territoryPreferences`, préférences de navigateur et de compte, puis sécurité et données. Les mutations sont ciblées : identité via `/api/account/identity`, localisations via `/api/account/locations`, handle via `/api/users/profile/handle`, mode d'affichage via `/api/users/profile/display-name-mode`, consentement classement via `/api/users/profile/leaderboard-opt-in`, activité via `/api/account/activity-status` et notifications via `/api/notifications/preferences`. Une projection Clerk réussie sans confirmation Supabase renvoie un état récupérable `clerk_updated_supabase_sync_pending` et n'est jamais présenté comme un succès complet. L'espace Compte mobile consomme une projection Bearer bornée et réutilise les mutations canoniques ; il ne crée pas une seconde logique d'écriture.
- **Terminée** : oui pour le périmètre actuellement livré
- **Couleurs actuellement détectées** : sky / slate — fond clair sky et cartes de réglages neutres ; `AccountSettingsSection` et la variante light de `SitePreferencesControls` suivent cette palette.
- **Exception de couleur documentée** : la variante compacte de `AccountSettingsSection`, réutilisée dans les cartes dashboard/profil, conserve une ambiance ambre pour rester cohérente avec ces surfaces parentes ; elle n'est pas rendue sur `/reglages`.
- **Exception sémantique documentée** : la suppression de compte conserve rose/rouge pour signaler une action destructive ; cette couleur ne constitue pas une seconde palette de page.
- **Incohérences de couleurs** : Aucune incohérence sur la surface `/reglages`.
- **Risque de conflit avec les couleurs existantes** : moyen : garder une mood layer autonome et éviter tout retour aux couleurs de bloc principales.
- **Niveau de surcharge textuelle** : moyen
- **Textes à conserver** :
- Contrôles
- résultats
- messages système
- CTA utilitaires
- **Textes à réduire ou supprimer** :
- Explications longues
- duplication d'état
- cartes de contexte inutiles
- **Bulles / cartes / contextes trop nombreux** : Les outils peuvent accumuler des états et des micro-interfaces.
- **Composants UI concernés** :
- Outils
- tableaux de bord
- panneaux système
- prévisualisations
- contrôles
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : critique

## Contrats d'interface et de données

- Le prénom et le nom sont modifiables ensemble ; l'email, la photo et les méthodes de connexion restent gérés par les contrôles natifs Clerk effectivement disponibles.
- L'aperçu public montre le nom complet et le handle réellement utilisés. Le choix pseudonyme ne rend pas les contributions anonymes par défaut.
- Résidence et travail sont enregistrés et supprimés séparément. Une valeur absente est une absence explicite, pas une redirection vers l'onboarding complet.
- Le rôle attribué et les capacités restent pilotés par Clerk ; les réglages personnels ne modifient jamais `GRANTED_ROLE`.
- `/profil` reste une surface de consultation, de progression et d'activité. Il propose un accès à `/reglages`, mais ne remplace pas la surface de modification.

## Accessibilité du parcours

- La route n'est pas ajoutée au ruban principal.
- Le profil actif et le dashboard proposent un CTA secondaire `Ouvrir les réglages`.
- La localisation des réglages réutilise directement le modèle canonique `territoryPreferences` sans rediriger l'utilisateur vers `/onboarding`.
- Les libellés visibles et les textes d'assistance des contrôles sont disponibles en français et en anglais ; leurs aria-labels suivent la langue active.
- Les notifications et le consentement au classement sont présentés comme des préférences de compte ; leur écriture reste portée par leurs routes serveur canoniques.
- Les états `Enregistrement`, `Enregistré`, `Synchronisation en attente` et `Erreur` sont annoncés avec des régions accessibles ; les boutons sont désactivés pendant leur propre mutation.




## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche documente une vraie page protégée, pas un alias technique.
- La redirection vers `/sign-in` ne s'applique qu'aux visiteurs non authentifiés.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
