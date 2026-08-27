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
- **Scope** : cockpit de supervision et files de modération
- **Terminée** : oui pour le périmètre UI du cockpit `/admin`
- **Couleurs actuellement détectées** : fond blanc chaud / pierre, accents amber et brun sombre
- **Incohérences de couleurs** : Aucune incohérence de couleur détectée avec la règle actuelle.
- **Risque de conflit avec les couleurs existantes** : moyen à élevé : la palette doit rester technique et ne pas ressembler au pilotage.
- **Niveau de surcharge textuelle** : modéré
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
- La page expose un seul `PageHeader`, avec l’état d’accès, le rôle actif et un unique lien vers le profil.
- L’ordre de lecture est : alerte et quatre KPI, files de modération en grille 2 × 2, workflow complet, outils d’administration, changement de profil si plusieurs profils sont disponibles, puis console `max` conditionnelle.
- Les cartes de file n’affichent plus les numéros de bloc et limitent les exemples visibles à deux éléments par file ; les états `Partiel` et `Indisponible` restent explicites.
- Le workflow conserve le filtrage, la prévisualisation, la confirmation, la journalisation et les exports. Son enveloppe adopte la variante claire et chaude du shell admin sans modifier le shell sombre de ses autres consommateurs.
- Le cockpit charge indépendamment les actions pending, les demandes de participation pending, les signalements pending, l’inbox créateur, les publications partenaires et le journal d’audit. Chaque source expose un état disponible ou indisponible ; une erreur n’est jamais convertie en zéro métier.
- Les quatre indicateurs opérationnels sont : `Agir à traiter` (actions + participations), `Signalements à traiter` (spots / lieux propres), `Réseau à traiter` (inbox créateur + publications pending_admin_review) et `Incidents récents` (audit outcome=error). Une dépendance indisponible est affichée comme `Partiel` ou `Indisponible`.
- L’alerte principale suit l’ordre indisponibilité des sources, incidents d’audit, backlog réel, puis absence d’urgence lorsque toutes les lectures ont réussi et que les files sont vides.
- Les blocs de modération conservés sont `Réseau & Discussions`, `Cartographie & Impact`, `Agir` et `Accueil & Pilotage`. Le journal utilise le deep-link `#workflow-administration`; Cartographie & Impact conserve `/admin?moderation=signalements#workflow-administration`.
- Les blocs fictifs `Apprendre` et `Classement global` ne font pas partie de cette surface.
- **Bulles / cartes / contextes trop nombreux** : la hiérarchie du cockpit a été resserrée dans ce lot ; les écrans détaillés de services, godmode et workflow restent volontairement denses.
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
