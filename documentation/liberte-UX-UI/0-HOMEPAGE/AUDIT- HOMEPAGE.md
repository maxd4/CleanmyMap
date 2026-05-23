# Audit UX/UI : Accueil

## Identification

**Bloc** : Accueil (page d'accueil publique)  
**Route** : `/`  
**Fichier principal** : `apps/web/src/app/page.tsx`

**Composants effectivement rendus**
- `HomeHero` -> `apps/web/src/components/accueil/accueil-hero.tsx`
- `HomeImpactSummary` -> `apps/web/src/components/accueil/accueil-impact-summary.tsx`
- `HomePillars` -> `apps/web/src/components/accueil/accueil-pillars.tsx`
- `HomeBenefits` -> `apps/web/src/components/accueil/accueil-benefits.tsx`
- `HomeCommunityActivity` -> `apps/web/src/components/accueil/accueil-community-activity.tsx`
- `OriginCredibility` -> `apps/web/src/components/accueil/OriginCredibility.tsx`
- `HomeFooter` -> `apps/web/src/components/accueil/accueil-footer.tsx`

---

## Version actuelle observée

L'accueil actuel n'est plus une succession verticale "Hero puis Impact Summary".  
Elle s'ouvre sur une **première bande en deux colonnes** :
- gauche : `HomeHero`
- droite : `HomeImpactSummary`

Ensuite, la page enchaîne dans cet ordre :
1. `HomePillars`
2. `HomeBenefits`
3. `HomeCommunityActivity`
4. `OriginCredibility`
5. `HomeFooter`

La composition générale est donc celle d'une **landing publique premium, dense et structurée**, avec un effort clair sur la continuité visuelle entre les sections.

---

## Structure visuelle actuelle

### 1. Fond global
- Fond continu sur toute la page
- Dégradé vertical principal :
  - `from-[#1e4a5f]`
  - `via-[#275566]`
  - `via-[#2f606d]`
  - `to-[#376b74]`
- L'ensemble crée un socle bleu-vert unifié, plus lumineux et plus institutionnel que l'ancienne logique `slate-950`.

### 2. Premier écran
- Bloc hero à gauche dans une card sombre arrondie
- Bloc impact à droite dans une card sombre arrondie avec barre accent supérieure
- Ratio visuel équilibré entre prise de parole produit et preuve chiffrée
- L'accueil assume un **split introductif fonctionnel** plutôt qu'un hero plein écran centré

### 3. Sections intermédiaires
- `HomePillars` : grille de 7 cartes en 4 + 3, très visible et structurante
- `HomeBenefits` : bande sombre plus profonde avec cartes 3x2
- `HomeCommunityActivity` : section plus narrative, avec colonne éditoriale + colonne activité
- `OriginCredibility` : bloc de réassurance le plus éditorial et le plus institutionnel
- `HomeFooter` : footer compact, lisible, orienté contact

---

## Direction UX actuelle

### Positionnement
L'accueil actuel sert moins à "faire rêver" qu'à :
- expliquer rapidement ce que fait CleanMyMap
- rendre l'offre tangible
- montrer des preuves d'usage et d'impact
- faire entrer vers des actions concrètes

### Logique de lecture
- **Hero** : proposition de valeur + 5 CTA directs
- **Impact Summary** : crédibilité par métriques
- **Pillars** : architecture du produit
- **Benefits** : valeur fonctionnelle
- **Community Activity** : preuve sociale et terrain
- **Credibility** : légitimité universitaire et trajectoire du projet
- **Footer** : contact et mantra

### Impression produite
- produit sérieux
- ton civique / institutionnel
- lecture fluide
- plus utilitaire que marketing

---

## Système de composants réellement utilisé

### Boutons
L'accueil utilise `CmmButton` comme bouton partagé.
Les boutons sont une exception visuelle aux règles de base et gardent 3 tons publics :
- `primary` : fond emerald, texte blanc
- `secondary` : fond blanc, texte slate
- `tertiary` : bouton discret, fond transparent

### Surfaces
Plusieurs sections utilisent le système maison :
- `HOME_CARD_SHELL`
- `HOME_CARD_SURFACE`
- `HOME_CARD_ACCENT`
- `HOME_CARD_ICON`

Ces tokens donnent :
- fonds en dégradés bleu-vert foncés
- bordures fines translucides
- ombres teintées vert / cyan
- arrondis larges

### Animation
Le site utilise `framer-motion`, mais l'accueil n'est pas une page "motion-first".  
Les animations servent surtout à :
- révéler les sections
- faire monter les cartes
- adoucir les entrées

---

## Palette actuelle par section

- `Hero` : cyan + teal + emerald pour les CTA primaires
- `Impact Summary` : bleu / emerald / amber par KPI
- `Pillars` :
  - Accueil = orange
  - Agir = cyan
  - Visualiser = emerald/teal
  - Apprendre = violet
  - Impacter = rose
  - Discuter = bleu
  - Piloter = rouge/rose sombre
- `Benefits` : fonds bleu nuit avec cartes teal / navy / green-blue
- `Community Activity` : cyan / emerald / violet
- `Credibility` : cyan / emerald / violet
- `Footer` : teal structurel avec accents emerald et violet

---

## État actuel du contenu

### Hero
- Titre : `Clean My Map`
- badge ligne : `Dépolluer · Cartographier · Impacter`
- paragraphe d'accroche long
- 5 CTA visibles :
  - `Se connecter`
  - `Tableau de bord`
  - `Voir la carte`
  - `Déclarer une action`
  - `Rapport d'impact`

### Impact Summary
- bloc `Impact terrain 2026`
- 6 KPI visibles en grille
- lien `Méthodologie`

### Community / Credibility
- l'accueil s'appuie fortement sur le registre "terrain réel"
- la preuve sociale et la crédibilité ne sont pas traitées comme des annexes
- ces deux sections structurent la seconde moitié de page

---

## Référence de capture actuelle

Capture mise à jour :
- `documentation/liberte-UX-UI/01-ACCUEIL/png/page-accueil.desktop.png`

Cette capture doit servir de base visuelle de référence pour les prochains audits de rubriques.


