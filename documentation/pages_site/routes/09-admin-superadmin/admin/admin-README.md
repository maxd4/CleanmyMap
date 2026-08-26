# Administration

## Fiche canonique

- **Route** : `/admin`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/admin/page.tsx`
- **Type fonctionnel** : administration
- **Famille / bloc fonctionnel** : Admin & Super-admin (hors bloc)
- **Statut** : technique
- **Contexte nécessaire** : Compte connecté, parfois rôle technique ou de supervision
- **Objectif utilisateur principal** : Piloter les réglages avancés, la modération et la supervision.
- **Action principale attendue** : Consulter un panneau d'administration ou agir sur une ressource.
- **Palette attendue** : amber / brun sombre
- **Scope** : à corriger
- **Terminée** : non
- **Couleurs actuellement détectées** : admin — canvas #15111d, halo rgba(245, 158, 11, 0.20)
- **Incohérences de couleurs** : Aucune incohérence de couleur détectée avec la règle actuelle.
- **Risque de conflit avec les couleurs existantes** : moyen à élevé : la palette doit rester technique et ne pas ressembler au pilotage.
- **Niveau de surcharge textuelle** : fort
- **Textes à conserver** :
- Accès de rôle
- tableaux
- actions critiques
- indicateurs de supervision
- **Textes à réduire ou supprimer** :
- Bannières techniques
- rappels de contexte
- textes non essentiels
- Le bloc `max` caché est intégré en fin de page et ne doit pas apparaître comme une surface autonome.
- **Bulles / cartes / contextes trop nombreux** : Les vues d'administration concentrent des panneaux, tables et actions à forte densité.
- **Composants UI concernés** :
- Dashboards admin
- tables
- actions de gestion
- tabs
- panneaux de contrôle
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : moyenne




## Modération Trash Spotter

La prévisualisation distingue les enregistrements `Action`, `Spot` et `Lieu
propre`. Lorsqu’un `spot` ou `clean_place` issu de `trash_spotter_spots` est
sélectionné, l’étape de confirmation affiche la section « Preuves terrain ».
Les actions n’affichent pas ce bloc.

- Les médias ne sont jamais chargés avec la page, la prévisualisation ou la
  sélection d’un enregistrement.
- La lecture démarre uniquement après « Voir les preuves photo », via la route
  média canonique, et conserve les états vide, erreur, refus d’accès et retry.
- L’absence d’une photo ne bloque pas la modération ; une photo ne déclenche
  aucune validation automatique.
- Le discriminator réseau historique `entityType="clean_place"` reste utilisé
  pour les signalements afin de préserver la compatibilité de l’API, sans
  imposer ce vocabulaire à l’interface.

### Accès depuis Cartographie & Impact

Le bloc « Cartographie & Impact » ouvre directement la file de modération via
`/admin?moderation=signalements#workflow-administration`, avec le filtre
« Signalements Trash Spotter » et le statut `pending` initialisés une seule
fois. Cette vue correspond aux signalements `spot` et `clean_place` en attente
(`new` côté `trash_spotter_spots`). Après une modification manuelle, les
filtres choisis par l’administrateur ne sont pas réimposés.

Le filtre de type permet ensuite de choisir « Tous », « Actions »,
« Signalements Trash Spotter », « Spot » ou « Lieu propre ». `/actions/map`
reste la surface publique de consultation et n’est pas une file de
modération.

## Références legacy

- [admin.md](../../../../6-PAGES-STANDALONE/admin.md)

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
