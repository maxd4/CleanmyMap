# Historique des actions

## Fiche canonique

- **Route** : `/actions/history`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/actions/history/page.tsx`
- **Type fonctionnel** : page d'action
- **Famille / bloc fonctionnel** : Agir (bloc)
- **Statut** : protégé
- **Contexte nécessaire** : Compte connecté, parfois rôle ou profil spécifique
- **Objectif utilisateur principal** : Permettre l'action terrain, la déclaration et la préparation rapide.
- **Action principale attendue** : Lancer une action, signaler ou compléter un formulaire.
- **Palette attendue** : emerald
- **Scope** : à corriger
- **Terminée** : non
- **Couleurs actuellement détectées** : emerald — canvas #e8f8ef, halo rgba(34, 197, 94, 0.22)
- **Incohérences de couleurs** : Aucune incohérence de couleur détectée avec la règle actuelle.
- **Risque de conflit avec les couleurs existantes** : moyen : le vert doit rester distinct des panneaux de support et des surfaces techniques.
- **Niveau de surcharge textuelle** : moyen
- **Textes à conserver** :
- Titre de tâche
- champs utiles
- CTA principal
- validation et erreurs
- **Textes à réduire ou supprimer** :
- Aides répétées
- cartes descriptives redondantes
- contextes décoratifs
- **Bulles / cartes / contextes trop nombreux** : Les formulaires et cartes de guidance peuvent multiplier les micro-blocs.
- **Composants UI concernés** :
- Formulaires
- cards d'aide
- CTA
- résultats de validation
- navigation de section
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : faible

## Preuves terrain

La supervision de l'historique peut afficher les preuves photo associées à un
signalement `spot` ou `clean_place`. Les enregistrements `action` ne sont pas
concernés par ce bloc.

- Aucun média n'est chargé avec la liste ni lors d'un simple changement de
  sélection.
- Le chargement démarre uniquement après l'action explicite « Voir les preuves
  photo » et appelle `GET /api/signalements/{signalementId}/media`.
- Le résultat est conservé dans l'instance du panneau après une réponse vide
  ou réussie ; une erreur propose un retry explicite et un refus d'accès est
  distingué comme preuve non publique.
- Les règles d'accès restent celles du service média : auteur/admin pour un
  signalement `new`, lecture publique signée pour `validated`/`cleaned`.
- Les URLs signées sont éphémères et ne sont jamais persistées côté client.


## États à documenter

- **loading** : fond `slate`, skeletons sobres, loader discret, même largeur et mêmes espacements que les autres états.
- **empty state** : fond `slate` doux, ton encourageant, CTA utile unique.
- **access refused** : `slate` avec léger `red` / `orange`, ton neutre et professionnel, pas de dramatisation.
- **Architecture commune** : `SystemStateLayout`, `SystemStateIcon`, `SystemStateTitle`, `SystemStateDescription`, `SystemStateAction`, `SystemStateMeta`.
- **Variantes** : `variant="loading"`, `variant="empty"`, `variant="forbidden"`.
- **Règle** : aucune route de ce type ne doit avoir un état vide sans CTA utile.



## Références legacy

- [historique.md](../../../../6-PAGES-STANDALONE/historique.md)

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
