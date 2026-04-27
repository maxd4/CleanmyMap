# Améliorations de la carte et du tracé - Formulaire de déclaration d'action

## Résumé des améliorations

La carte du formulaire de déclaration d'action a été considérablement améliorée pour offrir une meilleure expérience utilisateur avec une vraie carte lisible, des outils de tracé optimisés et une gestion intelligente des appareils mobiles.

## Modifications apportées

### 1. `action-drawing-map.tsx` - Composant carte principal

#### Amélioration du fond de carte
- **AVANT** : Carte CARTO sans labels (`light_nolabels`) - carte vide peu utile
- **APRÈS** : Carte OpenStreetMap France avec noms de rues (`osmfr`) - carte complète et lisible
- **URL** : `https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png`
- **Avantages** : Noms de rues, repères, lieux visibles pour aider l'utilisateur à se repérer

#### Détection et gestion des appareils mobiles
- **Fonction** : `isMobileDevice()` - détecte largeur d'écran ≤ 768px ou user agent mobile
- **Comportement** : Désactive automatiquement le tracé manuel sur mobile
- **Indicateur visuel** : Badge "📱 Tracé désactivé sur mobile" affiché sur les appareils mobiles
- **Logique** : `effectiveReadOnly = readOnly || isMobile`

#### Amélioration des outils de tracé
- **Polylines améliorées** :
  - Opacité ajustée (0.8) pour meilleure visibilité
  - Affichage de la longueur (`showLength: true`)
  - Pas de répétition automatique (`repeatMode: false`)
- **Polygones améliorés** :
  - Meilleure opacité (0.8) et remplissage (0.25)
  - Affichage de la surface (`showArea: true`)
  - Pas d'intersection autorisée (`allowIntersection: false`)
- **Outils d'édition** :
  - Options de sélection améliorées (`selectedPathOptions`)
  - Maintien de la couleur lors de l'édition (`maintainColor: true`)

#### Bouton d'annulation amélioré
- **Style** : Meilleur design avec padding, border-radius et ombre
- **Titre** : "Effacer le tracé" (plus explicite)
- **Taille** : Police réduite (16px) pour meilleure intégration

#### Gestion d'erreurs robuste
- **Try-catch** : Gestion des erreurs lors du snap automatique des polylines
- **Fallback** : Utilisation des coordonnées brutes si le snap OSRM échoue
- **UX** : Curseur "wait" pendant le traitement, restauré en cas d'erreur

#### Dimensions optimisées
- **Hauteur** : Augmentée de 360px à 400px pour meilleure visibilité
- **Zoom initial** : Augmenté de 12 à 13 pour plus de détails

### 2. `action-declaration-form.tsx` - Formulaire principal

#### Textes et labels améliorés
- **Section** : "Aperçu & tracé" → "Carte & tracé"
- **Description mode rapide** : Mention explicite de la "carte avec noms de rues"
- **Description mode complet** : "🖥️ Tracez votre parcours directement sur la carte (desktop/tablette uniquement)"
- **Message d'aide** : "💡 Saisissez un lieu ou un départ pour voir l'aperçu sur la carte avec noms de rues"

#### Renforcement du champ description du parcours
- **Label** : "📢 Description détaillée du parcours *" (obligatoire)
- **Placeholder** : Exemple détaillé avec rues précises
- **Taille** : Hauteur augmentée (120px) et limite étendue (1000 caractères)
- **Attribut** : `required` ajouté pour validation côté client
- **Encadré d'information** :
  - Fond amber avec bordure pour attirer l'attention
  - "⚠️ Important pour les administrateurs"
  - Explication de l'importance pour le tracé précis par les admins

## Avantages des améliorations

### 🗺️ Carte plus utile
- **Noms de rues visibles** : Les utilisateurs peuvent se repérer facilement
- **Repères géographiques** : Monuments, parcs, stations de métro affichés
- **Meilleure résolution** : Zoom initial plus proche pour plus de détails

### 📱 Compatibilité mobile optimisée
- **Tracé désactivé sur mobile** : Évite les erreurs de manipulation tactile
- **Interface adaptée** : Indicateur visuel clair du comportement
- **Performance** : Pas de chargement d'outils inutiles sur mobile

### ✏️ Outils de tracé améliorés
- **Polygones précis** : Peuvent suivre les contours réels des lieux
- **Polylines optimisées** : Snap automatique sur le réseau routier
- **Édition facilitée** : Outils d'édition et suppression intuitifs
- **Feedback visuel** : Longueurs et surfaces affichées

### 📝 Description renforcée
- **Champ obligatoire** : Garantit une description pour les administrateurs
- **Guidance claire** : Exemple détaillé et explication de l'importance
- **Validation** : Contrôle côté client et serveur

### 🔧 Robustesse technique
- **Gestion d'erreurs** : Fallback en cas d'échec du snap automatique
- **Performance** : Détection intelligente des capacités de l'appareil
- **Accessibilité** : Labels et descriptions améliorés

## Impact utilisateur

### Pour les utilisateurs desktop/tablette
- Carte lisible avec noms de rues pour se repérer
- Outils de tracé précis pour dessiner parcours et zones
- Interface claire avec feedback visuel

### Pour les utilisateurs mobiles
- Carte consultable avec noms de rues
- Pas de confusion avec des outils de tracé non fonctionnels
- Focus sur la description textuelle du parcours

### Pour les administrateurs
- Descriptions détaillées pour tracer précisément les parcours
- Tracés manuels de meilleure qualité quand disponibles
- Validation facilitée des actions déclarées

## Validation technique

- ✅ Compilation réussie (seule erreur pré-existante non liée)
- ✅ Détection mobile fonctionnelle
- ✅ Nouvelle couche de tuiles opérationnelle
- ✅ Outils de tracé améliorés
- ✅ Validation du champ description renforcée