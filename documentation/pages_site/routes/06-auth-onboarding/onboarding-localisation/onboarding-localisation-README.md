# Onboarding localisation

## Fiche canonique

- **Route** : `/onboarding/localisation`
- **Fichier(s) source(s)** :
- `apps/web/src/app/onboarding/localisation/page.tsx`
- **Type fonctionnel** : redirection
- **Famille / bloc fonctionnel** : Auth & Onboarding (hors bloc)
- **Statut** : redirection
- **Contexte nécessaire** : Aucun, la page redirige automatiquement
- **Objectif utilisateur principal** : Créer ou reprendre l'accès au compte puis initialiser le profil.
- **Action principale attendue** : Se connecter, s'inscrire ou continuer l'onboarding.
- **Palette attendue** : lavande claire / vert menthe clair
- **Scope** : hors scope
- **Terminée** : oui
- **Couleurs actuellement détectées** : auth — canvas #eef2ff, halo rgba(99, 102, 241, 0.24)
- **Incohérences de couleurs** : Écart détecté: attendu lavande claire / vert menthe clair, code actuel indigo / violet.
- **Risque de conflit avec les couleurs existantes** : moyen : éviter une dérive vers une esthétique admin ou cartographique.
- **Niveau de surcharge textuelle** : faible
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
- **Captures attendues** : desktop, mobile, état de redirection
- **Priorité de correction** : moyenne

## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
