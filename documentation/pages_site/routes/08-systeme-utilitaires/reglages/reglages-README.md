# Réglages

## Fiche canonique

- **Route** : `/reglages`
- **Fichier(s) source(s)** :
- `apps/web/src/app/reglages/page.tsx`
- **Type fonctionnel** : outil
- **Famille / bloc fonctionnel** : Système & Utilitaires (hors bloc)
- **Statut** : standalone
- **Contexte nécessaire** : Compte connecté ; redirection vers `/sign-in` si la session est absente.
- **Objectif utilisateur principal** : Gérer les préférences personnelles d'affichage, de langue, de localisation et de compte.
- **Action principale attendue** : Modifier une préférence ou une donnée de compte depuis cette surface canonique.
- **Palette attendue** : sky / slate
- **Scope** : surface secondaire protégée avec contrôles `SitePreferencesControls` pour la langue et le mode d'affichage, choix du nom affiché, localisation, confidentialité et demande de suppression ; absence de session redirigée vers `/sign-in`.
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

## Accessibilité du parcours

- La route n'est pas ajoutée au ruban principal.
- Le profil actif et le dashboard proposent un CTA secondaire `Ouvrir les réglages`.
- La localisation continue d'utiliser le workflow canonique `/onboarding/localisation`.
- Les libellés visibles et les textes d'assistance des contrôles sont disponibles en français et en anglais ; leurs aria-labels suivent la langue active.
- Les notifications ne sont pas présentées ici comme un réglage : leur lecture et
  leur gestion restent portées par `/dashboard#notifications`.




## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche documente une vraie page protégée, pas un alias technique.
- La redirection vers `/sign-in` ne s'applique qu'aux visiteurs non authentifiés.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
