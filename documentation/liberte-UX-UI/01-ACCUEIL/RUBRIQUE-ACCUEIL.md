# Audit Rubrique : Hero Section

## Identification

**Rubrique** : Hero Section  
**Bloc parent** : Accueil  
**Fichier** : `apps/web/src/components/accueil/accueil-hero.tsx`  
**Route** : `/` (colonne gauche du premier écran)

---

## État actuel observé

Le hero actuel est rendu dans une **card sombre large** occupant la colonne gauche du premier écran.
Il n'est pas traité comme un hero plein écran indépendant : il partage la bande d'ouverture avec `HomeImpactSummary`.

### Composition actuelle
- grand titre centré : `Clean My Map`
- contrôle de langue en haut à droite (`SitePreferencesControls`, variante locale)
- ligne-badge :
  - `Dépolluer`
  - `Cartographier`
  - `Impacter`
- paragraphe de présentation
- 5 CTA visibles répartis sur 2 lignes

### CTA actuellement présents
**Ligne 1**
- `Se connecter`
- `Tableau de bord`

**Ligne 2**
- `Voir la carte`
- `Déclarer une action`
- `Rapport d'impact`

### Composant de bouton réellement utilisé
Le hero utilise `HomeButton` et non `CmmButton`.

---

## Direction UX actuelle du hero

Le hero actuel ne cherche pas le spectaculaire pur.  
Il sert à faire trois choses immédiatement :
- nommer le produit
- poser la promesse
- offrir plusieurs points d'entrée immédiats

Il combine donc :
- un registre de **marque**
- un registre de **navigation**
- un registre de **conversion**

Le hero actuel est plus **fonctionnel** que narratif.

---

## Structure visuelle actuelle

### Conteneur
- card sombre :
  - `rounded-[2.5rem]`
  - `border-slate-700/40`
  - `bg-slate-800/70`
  - ombre large sombre

### Fond interne
- halo radial cyan / emerald en arrière-plan
- rendu sobre, pas d'image
- pas d'illustration métier

### Titre
- très grand
- centré dans la colonne
- blanc
- fort poids visuel

### Badge de promesse
- petite ligne décorative à gauche
- capsule cyan sombre avec texte uppercase espacé

### CTA
- `HomeButton primary` :
  - gradient cyan -> teal -> emerald
- `HomeButton secondary` :
  - gradient indigo -> violet -> purple

Le hero mélange donc deux familles de CTA colorés :
- primaire turquoise / vert
- secondaire violet / rose froid

---

## Ce que le hero communique aujourd'hui

### Signal principal
`Clean My Map` est présenté comme une plateforme d'action environnementale structurée.

### Signal secondaire
Le bloc oriente immédiatement vers plusieurs actions concrètes :
- connexion
- accès dashboard
- carte
- déclaration
- impact

### Ton perçu
- sérieux
- technologique
- engagé
- plus orienté outil que campagne

---

## Forces actuelles

- premier écran immédiatement identifiable
- titre fort et propre
- bon équilibre entre promesse et action
- CTA visibles dès le premier écran
- cohérence visuelle avec le bloc impact à droite
- hiérarchie simple à comprendre

---

## Fragilités actuelles

- 5 CTA dans le hero créent une concurrence forte
- `Se connecter` et `Tableau de bord` tirent le hero vers une logique produit authentifié
- la colonne hero peut paraître dense fonctionnellement
- la proposition de valeur repose encore beaucoup sur le paragraphe, pas seulement sur la structure
- le hero n'a pas de visuel métier fort autre que les gradients et la composition

---

## Rôle exact dans l'accueil actuel

Dans la version actuelle, le hero n'est pas une rubrique autonome complète.  
Il fonctionne comme la **moitié gauche du module d'ouverture**.

Son efficacité dépend donc du dialogue avec :
- `HomeImpactSummary` à droite
- la grille `HomePillars` juste en dessous

La lecture réelle du premier écran est :
1. `Clean My Map`
2. impact 2026
3. CTA
4. architecture produit

---

## Référence visuelle actuelle

Capture d'accueil à jour :
- `documentation/liberte-UX-UI/01-ACCUEIL/png/page-accueil.desktop.png`

Pour le hero, cette capture doit être lue comme référence de structure :
- hero gauche
- impact summary droite
- continuité visuelle dans la même bande d'ouverture

---

## Référence technique actuelle

### Dépendances directes du hero
- `SitePreferencesControls`
- `HomeButton`
- `framer-motion`

### Comportement constaté
- révélations `motion` sur le titre, le badge, le paragraphe et les CTA
- aucune image lazy-load
- aucun média externe
- aucun état skeleton ou fallback spécifique au hero dans l'implémentation actuelle

---

## Conclusion

Le hero actuel est un **hero produit orienté action**.
La base de référence actuelle est :
- une card sombre
- un très grand titre
- une promesse courte
- plusieurs CTA fonctionnels
- une intégration directe avec le bloc impact dans la même ouverture de page


