# Mode École — Présentation détaillée

## Objectif

Donner à un enseignant ou animateur un kit immédiatement utilisable pour une séance collective autour des déchets, de l'environnement et des comportements.

## Parcours

```mermaid
flowchart TD
  A[Arrivée sur /learn/ecole] --> B[Lecture des repères]
  B --> C{Besoin}
  C --> D[Lancer le mode École]
  C --> E[Lancer la démo]
  C --> F[Consulter la fiche enseignant]
  C --> G[Consulter la fiche élève]
  D --> H[/learn/sentrainer mode=ecole]
```

## Contenu actuel

### Introduction

Quatre repères :

- public visé ;
- durée ;
- absence de compte élève ;
- fonctionnement classe entière.

### Lancement

Deux CTA :

- ouvrir le mode École ;
- lancer la démo.

### Aides de séance

- fiche enseignant ;
- fiche élève.

### Banque

Le code expose une première banque de 20 questions réparties en quatre sous-modes.

Les statuts de questions permettent notamment de distinguer :

- source disponible ;
- vérification nécessaire.

## Données personnelles

La page annonce :

```txt
Sans compte élève
Pas de connexion élève
Pas de donnée personnelle
```

Toute future fonctionnalité de suivi individuel doit donc déclencher une revue :

- produit ;
- confidentialité ;
- sécurité ;
- documentation.

## Accessibilité

À vérifier lors d'une revue UI explicite :

- focus clavier ;
- ordre de lecture ;
- contraste ;
- intitulés des CTA ;
- liens externes ;
- annonces des statuts « à vérifier ».

## Performance

La page doit rester légère.

Éviter :

- appels serveur inutiles ;
- chargement de médias lourds ;
- dépendances supplémentaires pour un simple affichage ;
- animations décoratives.

## Sécurité éditoriale

Chaque question doit avoir un état clair :

- vérifiée ;
- source attachée ;
- à vérifier.

Ne pas masquer une incertitude.

## Sources de vérité

```txt
apps/web/src/app/learn/ecole/page.tsx
apps/web/src/components/learn/quiz-school-kit-page.tsx
apps/web/src/lib/learning/quiz-school-kit.ts
documentation/pages_site/INDEX.md
documentation/design-system/BLOC_COLOR_SYSTEM_PREMIUM.md
```
