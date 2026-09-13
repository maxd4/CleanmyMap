# Dashboard

## Fiche canonique

- **Route** : `/dashboard`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/dashboard/page.tsx`
- **Type fonctionnel** : page de bloc
- **Famille / bloc fonctionnel** : Accueil & Pilotage (bloc)
- **Statut** : protégé
- **Contexte nécessaire** : Compte connecté, parfois rôle ou profil spécifique
- **Objectif utilisateur principal** : Lire sa situation immédiate, ses alertes et sa prochaine action depuis un cockpit court.
- **Action principale attendue** : Déclarer une action ou ouvrir un raccourci utile du quotidien.
- **Palette attendue** : amber / orange
- **Scope** : à corriger
- **Terminée** : non
- **Couleurs actuellement détectées** : amber — canvas #fff2df, halo rgba(249, 115, 22, 0.26)
- **Incohérences de couleurs** : Aucune incohérence de couleur détectée avec la règle actuelle.
- **Risque de conflit avec les couleurs existantes** : moyen : la frontière rouge doit rester nette pour éviter la confusion avec les blocs d'impact et d'alerte.
- **Niveau de surcharge textuelle** : fort
- **Textes à conserver** :
- Titre de page
- cartes métriques
- CTA de navigation
- indicateurs prioritaires
- **Textes à réduire ou supprimer** :
- Rappels redondants
- badges de contexte répétés
- blocs d'aide trop verbeux
- **Bulles / cartes / contextes trop nombreux** : Le dashboard ne porte ni le workflow d'export/modération ni les comparaisons cartographiques détaillées, réservés aux surfaces dédiées.
- **Composants UI concernés** :
- Titre
- cards métriques
- CTA
- nav secondaire
- sidebar / ribbon
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : moyenne

## Notifications

- La section canonique est disponible à l’ancre `/dashboard#notifications`.
- Elle lit exclusivement `public.app_notifications` via le client existant,
  avec une page initiale de 20 notifications puis des pages supplémentaires
  de 20 éléments.
- La pagination suit un curseur stable sur `created_at DESC` puis `id DESC`;
  l’historique complet n’est jamais chargé en une seule requête et aucun
  polling supplémentaire n’est activé dans le Dashboard.
- Chaque notification affiche son type et son pictogramme, son état lu/non
  lu, son titre et son contenu complets, sa date et son heure ainsi qu’une
  date relative. Le champ `payload` brut n’est pas affiché.
- Le bouton `Afficher plus` charge la page suivante jusqu’à l’épuisement de
  l’historique. L’état vide, le chargement, l’erreur et la fin de liste sont
  explicitement rendus.
- L’ouverture de la section ne marque aucune notification automatiquement;
  le marquage reste individuel et conserve les permissions Clerk/Supabase.


## États à documenter

- **loading** : fond `slate`, skeletons sobres, loader discret, même largeur et mêmes espacements que les autres états.
- **empty state** : fond `slate` doux, ton encourageant, CTA utile unique.
- **access refused** : `slate` avec léger `red` / `orange`, ton neutre et professionnel, pas de dramatisation.
- **Architecture commune** : `SystemStateLayout`, `SystemStateIcon`, `SystemStateTitle`, `SystemStateDescription`, `SystemStateAction`, `SystemStateMeta`.
- **Variantes** : `variant="loading"`, `variant="empty"`, `variant="forbidden"`.
- **Règle** : aucune route de ce type ne doit avoir un état vide sans CTA utile.



## Références legacy

- [dashboard.md](../../../../6-PAGES-STANDALONE/dashboard.md)

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
