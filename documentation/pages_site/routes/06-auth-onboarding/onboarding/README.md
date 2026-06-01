# Onboarding

## Fiche canonique

- **Route** : `/onboarding`
- **Fichier(s) source(s)** :
- `apps/web/src/app/onboarding/page.tsx`
- **Type fonctionnel** : onboarding
- **Famille / bloc fonctionnel** : Auth & Onboarding (hors bloc)
- **Statut** : auth
- **Contexte nécessaire** : Page d'entrée d'authentification ou de configuration initiale
- **Objectif utilisateur principal** : Créer ou reprendre l'accès au compte puis initialiser le profil.
- **Action principale attendue** : Se connecter, s'inscrire ou continuer l'onboarding.
- **Palette attendue** : lavande claire / vert menthe clair
- **Scope** : à corriger
- **Terminée** : non
- **Couleurs actuellement détectées** : auth — canvas #eef2ff, halo rgba(99, 102, 241, 0.24)
- **Incohérences de couleurs** : Écart détecté: attendu lavande claire / vert menthe clair, code actuel indigo / violet.
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
- CTA
- helpers
- progression onboarding
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : moyenne




## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
