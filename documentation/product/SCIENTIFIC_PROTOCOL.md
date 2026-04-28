# Protocole Scientifique & Calculs d'Impact

Ce document détaille les sources, hypothèses et formules utilisées par CleanMyMap pour convertir les actions de dépollution en indicateurs d'impact environnemental.

## 1. Préservation de la Ressource en Eau

### Hypothèse
Un seul mégot de cigarette contient des substances toxiques (nicotine, cadmium, arsenic) capables de polluer entre **500 et 1000 litres d'eau**. CleanMyMap adopte une position prudente et standardisée.

### Formule
`Eau_Preservée (L) = Nombre_Mégots × 500`

### Source
- **ADEME** : Guide de la gestion des mégots.
- **Surfrider Foundation Europe** : Rapports sur les macro-déchets.

---

## 2. Émissions de CO2 Évitées

### Hypothèse
La collecte des déchets permet d'éviter les émissions liées à la dégradation anaérobie en milieu naturel (méthane) et favorise le recyclage, qui est moins énergivore que la production de matière vierge.

### Formule
`CO2_Évité (kg) = Poids_Déchets (kg) × Coefficient_Matière`

*Coefficients moyens utilisés (Source Base Carbone ADEME) :*
- Plastique : 2.5 kg CO2/kg
- Aluminium : 9.0 kg CO2/kg
- Mix déchets sauvages : **1.2 kg CO2/kg** (valeur par défaut)

---

## 3. Surface Nettoyée & Restauration

### Hypothèse
L'impact spatial dépend de la densité de pollution et de l'effort de prospection des bénévoles.

### Formule
`Surface (m²) = (Poids (kg) × 15) + (Temps (min) × 2)`

Cette formule hybride valorise à la fois la récolte de masse et le temps passé à scruter une zone.

---

## 4. Score de Pollution (Heatmap)

Le score de pollution affiché sur la carte est calculé via une pondération de la récurrence et de la dangerosité :

`Pollution_Score = (Densité_Mégots × 3) + (Densité_Plastiques × 2) + (Densité_Encombrants × 5)`

---

## 5. Gouvernance des Données
Les coefficients sont révisés tous les 6 mois par l'équipe scientifique de CleanMyMap pour s'aligner sur les dernières mises à jour de la **Base Empreinte de l'ADEME**.

> [!IMPORTANT]
> Toute modification des coefficients dans `impact-proxy-config.ts` doit être répercutée ici et sur la page `/methodologie`.
