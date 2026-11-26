# Gouvernance

## Fiche canonique

- **Route** : `/sections/elus`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/sections/[sectionId]/page.tsx`
- **Type fonctionnel** : surface secondaire — gouvernance
- **Famille / bloc fonctionnel** : Accueil & Pilotage (bloc)
- **Accès runtime** : `auth-disabled-gate` ; le contenu est verrouillé avant connexion et l'accès aux données de pilotage reste soumis aux habilitations du contrat concerné.
- **Contrat SEO** : `ACCESS=PRIVATE`, `SEARCH=NOINDEX`, `DISCOVERY=INTERNAL_ONLY`, `CANONICAL=NONE`. Les données institutionnelles et arbitrages restent protégés.
- **Objectif utilisateur principal** : Donner un accès direct à la lecture territoriale, aux arbitrages et aux repères de gouvernance.
- **Action principale attendue** : Consulter les priorités et arbitrages de gouvernance.
- **Palette attendue** : amber / orange, famille Accueil & Pilotage
- **Scope** : lecture protégée des agrégats des actions publiques terminées, sans attribution territoriale implicite.
- **Terminée** : non
- **Couleurs actuellement détectées** : amber / brun — à vérifier lors d'une capture de référence
- **Incohérences de couleurs** : aucune incohérence bloquante ; le rendu utilise le socle sombre gouvernance avec accents bleu/sable du pilotage.
- **Risque de conflit avec les couleurs existantes** : faible : surface secondaire reliée au même socle décisionnel que `/pilotage`.
- **Niveau de surcharge textuelle** : moyen
- **Textes à conserver** :
- titre de page
- repères de gouvernance
- CTA de bascule vers le pilotage
- synthèse KPI, période de lecture et états de données dans la locale active
- titres, justifications et recommandations dynamiques du résumé localisés par
  message complet, sans corruption des valeurs ni remplacement de fragments
- neutralité rendue sans flèche descendante ni couleur de régression
- **Textes à réduire ou supprimer** :
- doublons de KPI
- rappels trop longs
- explications répétées
- **Bulles / cartes / contextes trop nombreux** : synthèse, KPI, priorités de zones, référentiel méthodologique et cluster de navigation ; ne pas dupliquer les mêmes indicateurs dans chaque onglet.
- **Composants UI concernés** :
- titre
- cartes de synthèse
- CTA
- onglets secondaires
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : faible

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

- Cette fiche documente la surface secondaire `/sections/elus`, visible depuis le cluster décisionnel du pilotage.
- La navigation cible expose cette page aux rôles actifs élu et IMU, sans autorisation supplémentaire implicite.

## Contrat cible de la refonte

Lecture serveur pour les rôles actifs élu et IMU, corpus global strict des actions publiques terminées. Aucun droit sur un territoire ou sur des données privées n'est déduit du rôle. Trois vues : synthèse, zones et priorités, méthodes et rapports. Entrée du bloc pour les rôles concernés et lien depuis Pilotage ; le contrat d'autorisation du pilotage organisé ne change pas. Garder le SEO privé.
