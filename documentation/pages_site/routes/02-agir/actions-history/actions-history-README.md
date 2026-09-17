# Historique terrain

## Fiche canonique

- **Route** : `/actions/history`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/actions/history/page.tsx`
- **Type fonctionnel** : page d'action
- **Famille / bloc fonctionnel** : Agir (bloc)
- **Navigation** : workflow secondaire protégé hors navigation primaire
- **Statut** : protégé
- **Disponibilité registry** : `hidden` — non exposé dans la navigation primaire, sans signifier legacy ou désactivé.
- **Raccord Communauté** : Communauté renvoie vers cette route pour l'historique terrain ; elle reste la source canonique et n'est pas embarquée dans `/sections/community`.
- **Accès runtime** : route protégée par le proxy Clerk ; l'authentification est requise avant l'accès à la page. `ClerkRequiredGate` reste une défense/fallback interne et ne constitue pas un aperçu public.
- **Contexte nécessaire** : Compte Clerk connecté ; le rappel de complétion du compte reste non bloquant. Les fonctions de supervision et d'audit appliquent leurs autorisations propres.
- **Complétion du compte** : Un profil incomplet affiche un rappel non bloquant ; l'historique reste soumis à l'authentification et à ses contrôles propres.
- **Objectif utilisateur principal** : Consulter les enregistrements accessibles, leur qualité et les corrections à effectuer.
- **Action principale attendue** : Filtrer et inspecter les lignes, consulter le détail qualité/contexte, les preuves photo d'un signalement lorsque demandé, l'audit autorisé et exporter les lignes approuvées filtrées en PDF.
- **Palette attendue** : emerald
- **Scope** : historique et supervision des enregistrements d'actions et de signalements accessibles au compte connecté, avec filtres de statut/qualité, recherche, correction prioritaire, détail, preuves et export.
- **Terminée** : oui pour le périmètre actuellement livré ; les évolutions non implémentées restent dans la liste PLAN.
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



## Références historiques

- [historique.md](../../../../6-PAGES-STANDALONE/historique.md)

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
