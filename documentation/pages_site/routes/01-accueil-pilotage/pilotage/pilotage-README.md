# Pilotage

## Fiche canonique

- **Route** : `/pilotage`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/pilotage/page.tsx`
- **Type fonctionnel** : page de bloc
- **Famille / bloc fonctionnel** : Accueil & Pilotage (bloc)
- **Accès proxy** : `clerk-context` ; le proxy prépare le contexte Clerk sans appeler `auth.protect()` pour cette route.
- **Présentation anonyme** : `auth-disabled-gate` ; un visiteur voit l'écran de verrouillage et aucun overview métier n'est chargé.
- **Accès métier** : seul `activeRole=coordinateur` peut charger l'overview métier via `getCurrentUserEffectiveAccess().canAccessPilotage`. `admin` reste redirigé vers `/admin`, `max` est refusé sur cette surface et `elu` reste refusé tant que le pilotage territorial canonique n'est pas implémenté.
- **Objectif utilisateur principal** : Donner aux profils habilités un accès rapide aux vues de synthèse, au pilotage et aux lectures décideurs/gouvernance via trois onglets.
- **Action principale attendue** : Consulter l'état du compte ou arbitrer une action.
- **Palette attendue** : amber / brun
- **Scope** : corpus serveur des actions dont le coordinateur est créateur ou organisateur/coorganisateur canonique. Overview, KPI, comparaisons, zones, priorités et opérations communautaires restent dans ce corpus ; aucune relation ne donne un fallback global. L'organisation et le territoire restent des cibles distinctes, l'élu étant `TARGET / NOT_IMPLEMENTED`.
- **Terminée** : non
- **Couleurs actuellement détectées** : pilotage — canvas #f1d5b0, halo rgba(180, 83, 9, 0.24)
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
- **Bulles / cartes / contextes trop nombreux** : Le bloc mélange des cartes de lecture et des CTA, la densité doit rester maîtrisée. Trois onglets structurent maintenant la lecture: décideurs, pilotage, gouvernance.
- **Composants UI concernés** :
- Titre
- cards métriques
- CTA
- nav secondaire
- sidebar / ribbon
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : moyenne

## Opérations communautaires

Lorsque l'overview est disponible, le cockpit réservé aux profils autorisés
peut afficher les agrégats communautaires issus des mêmes calculateurs que le
reste du produit : staffing à venir, relances RSVP, boucles post-événement et,
pour le profil qui satisfait le contrat de l'endpoint, export funnel.

L'accès à ces agrégats suit `canAccessPilotage` (`coordinateur` scoped par ses
actions organisées, avec redirection de l'admin vers `/admin`). L'export funnel conserve en
plus le contrôle `requireAdminAccess` de son endpoint. Les capacités personnelles
de l'organisateur ordinaire, notamment la présence et le post-mortem de sa
propre mission, restent dans le détail Communauté et ne sont pas déplacées
derrière `/pilotage`.


## États à documenter

- **loading** : fond `slate`, skeletons sobres, loader discret, même largeur et mêmes espacements que les autres états.
- **empty state** : fond `slate` doux, ton encourageant, CTA utile unique.
- **access refused** : `slate` avec léger `red` / `orange`, ton neutre et professionnel, pas de dramatisation.
- **Architecture commune** : `SystemStateLayout`, `SystemStateIcon`, `SystemStateTitle`, `SystemStateDescription`, `SystemStateAction`, `SystemStateMeta`.
- **Variantes** : `variant="loading"`, `variant="empty"`, `variant="forbidden"`.
- **Règle** : aucune route de ce type ne doit avoir un état vide sans CTA utile.



## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
