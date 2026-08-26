# Signalement déchets

## Fiche canonique

- **Route** : `/signalement`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/signalement/page.tsx`
- **Type fonctionnel** : page d'action
- **Famille / bloc fonctionnel** : Agir (bloc)
- **Statut** : protégé
- **Contexte nécessaire** : Compte connecté, parfois rôle ou profil spécifique
- **Objectif utilisateur principal** : Permettre l'action terrain, la déclaration et le suivi propriétaire des observations récentes.
- **Action principale attendue** : Lancer une action, signaler ou compléter un formulaire.
- **Boucle propriétaire** : La section `#mes-observations`, sous le formulaire, lit exclusivement les lignes `trash_spotter_spots` créées par le compte Clerk courant via `GET /api/signalements/me`. Elle affiche uniquement les types `spot` et `clean_place`, avec les statuts `new`, `validated` et `cleaned`, dans l'ordre du plus récent au plus ancien.
- **Preuves photo** : Aucun média n'est chargé avec la liste. Chaque observation conserve le contrôle explicite `Voir les preuves photo` de `SignalementMediaProofs`; l'auteur peut consulter ses preuves même lorsque le signalement est `new`.
- **Après création** : La création réussie rafraîchit cette liste sans recharger la page ni la carte globale et expose un CTA vers `#mes-observations`. Le retry photo et le partial success restent inchangés.
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


## États à documenter

- **loading** : fond `slate`, skeletons sobres, loader discret, même largeur et mêmes espacements que les autres états.
- **empty state** : fond `slate` doux, ton encourageant, CTA utile unique.
- **access refused** : `slate` avec léger `red` / `orange`, ton neutre et professionnel, pas de dramatisation.
- **Architecture commune** : `SystemStateLayout`, `SystemStateIcon`, `SystemStateTitle`, `SystemStateDescription`, `SystemStateAction`, `SystemStateMeta`.
- **Variantes** : `variant="loading"`, `variant="empty"`, `variant="forbidden"`.
- **Règle** : aucune route de ce type ne doit avoir un état vide sans CTA utile.
- **États de Mes observations** : le chargement est discret, l'état vide renvoie vers le formulaire situé plus haut et l'erreur propose une nouvelle tentative.



## Références legacy

- [signalement_dechets.md](../../../../2-BLOC-AGIR/signalement_dechets.md)

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
