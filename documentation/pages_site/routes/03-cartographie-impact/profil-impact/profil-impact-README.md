# Profil impact

## Fiche canonique

- **Route** : `/profil/impact`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/profil/impact/page.tsx`
- **Type fonctionnel** : page de bloc
- **Famille / bloc fonctionnel** : Cartographie & Impact (bloc)
- **Statut** : protégé
- **Contexte nécessaire** : Compte connecté, parfois rôle ou profil spécifique
- **Objectif utilisateur principal** : Consulter sa progression personnelle, ses badges, son rang et sa carte d'impact partageable.
- **Action principale attendue** : Exporter ou partager l'image de sa carte personnelle.
- **Règle de partage** : Le partage porte uniquement sur le fichier image PNG généré depuis la carte personnelle. Il ne crée pas de profil public, ne partage pas l'URL protégée `/profil/impact` et ne produit aucune donnée serveur ou token public.
- **Palette attendue** : amber / orange
- **Scope** : à corriger
- **Terminée** : non
- **Couleurs actuellement détectées** : amber — canvas #fff2df, halo rgba(249, 115, 22, 0.26)
- **Incohérences de couleurs** : Aucune incohérence de couleur détectée avec la règle actuelle.
- **Risque de conflit avec les couleurs existantes** : moyen : attention au chevauchement entre sky cartographique et rouge impact / alerte.
- **Niveau de surcharge textuelle** : fort
- **Textes à conserver** :
- Carte personnelle
- progression, rang et badges
- chiffres issus des actions validées
- lien vers la méthodologie et les rapports collectifs
- **Textes à réduire ou supprimer** :
- Commentaires de contexte
- badges de répétition
- cartes trop proches visuellement
- **Bulles / cartes / contextes trop nombreux** : Les indicateurs territoriaux, comparaisons globales et estimateurs de projet restent dans `/reports`; cette page ne duplique que la lecture personnelle.
- **Composants UI concernés** :
- Carte
- cards d'impact
- filtres
- legend
- tableaux / rapports
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : moyenne


## États à documenter

- **loading** : fond `slate`, skeletons sobres, loader discret, même largeur et mêmes espacements que les autres états.
- **empty state** : fond `slate` doux, ton encourageant, CTA utile unique.
- **access refused** : `slate` avec léger `red` / `orange`, ton neutre et professionnel, pas de dramatisation.
- **Architecture commune** : `SystemStateLayout`, `SystemStateIcon`, `SystemStateTitle`, `SystemStateDescription`, `SystemStateAction`, `SystemStateMeta`.
- **Variantes** : `variant="loading"`, `variant="empty"`, `variant="forbidden"`.
- **Règle** : aucune route de ce type ne doit avoir un état vide sans CTA utile.



## Références legacy

- [mon_profil_impact.md](../../../../3-BLOC-VISUALISER&IMPACTER/mon_profil_impact.md)

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
