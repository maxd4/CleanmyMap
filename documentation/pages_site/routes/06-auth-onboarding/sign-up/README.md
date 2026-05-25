# Inscription

## Fiche canonique

- **Route** : `/sign-up`
- **Fichier(s) source(s)** :
- `apps/web/src/app/sign-up/[[...sign-up]]/page.tsx`
- **Type fonctionnel** : authentification
- **Famille / bloc fonctionnel** : Auth & Onboarding (hors bloc)
- **Statut** : auth
- **Contexte nécessaire** : Page d'entrée d'authentification ou de configuration initiale
- **Objectif utilisateur principal** : Créer ou reprendre l'accès au compte puis initialiser le profil.
- **Action principale attendue** : Se connecter, s'inscrire ou continuer l'onboarding.
- **Palette attendue** : lavande claire / vert menthe clair
- **Scope** : terminé
- **Terminée** : oui
- **Couleurs actuellement détectées** : auth — canvas lavande claire -> vert menthe clair, carte Clerk violet nuit / indigo foncé, bulles indigo / violet / vert profond
- **Incohérences de couleurs** : Aucune incohérence détectée après réalignement visuel.
- **Risque de conflit avec les couleurs existantes** : moyen : éviter une dérive vers une esthétique admin ou cartographique.
- **Niveau de surcharge textuelle** : moyen
- **Textes à conserver** :
- Formulaire
- CTA principal
- validation
- liens de bascule auth
- **Textes à réduire ou supprimer** :
- Marketing de contexte
- explications répétées
- bandeaux auxiliaires
- **Bulles / cartes / contextes trop nombreux** : L'auth doit rester focalisée sur l'action et éviter les panneaux multiples.
- **Composants UI concernés** :
- Formulaire auth
- inputs
- boutons auth / Clerk
- CTA
- helpers
- progression onboarding
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : faible




## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
- Les boutons auth sont inclus dans le lot UI et doivent suivre la même ambiance de surfaces et d'accents.

## Captures officielles

- Desktop: [photo/desktop/sign-up-desktop.webp](../photo/desktop/sign-up-desktop.webp)
- Mobile: [photo/mobile/sign-up-mobile.webp](../photo/mobile/sign-up-mobile.webp)
