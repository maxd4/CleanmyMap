# Plan d'Implémentation - Reformatage UX & Logique de Navigation (Phase 12)

Ce plan vise à transformer CleanMyMap d'une "collection de fonctionnalités techniques" en une plateforme citoyenne intuitive pour les bénévoles.

## 1. Diagnostic de la Structure Actuelle

> [!WARNING]
> **Surcharge Cognitive** : 19 onglets dans la barre latérale empêchent une action rapide.
> **Jargon Technique** : Des noms comme "Gamification", "Sandbox", et "ELUS" ne parlent pas aux bénévoles.
> **Actions Éclatées** : Déclarer, voir l'impact et consulter son profil sont trois actions séparées sans fil conducteur.

## 2. Nouvelle Logique de Navigation (6 Piliers d'Intention)

Nous regroupons les 19 onglets originaux sous **6 Piliers Stratégiques** basés sur les besoins réels de l'utilisateur.

### A. 🏠 Accueil (Vision Globale)
*   **Objectif** : Inspiration et chiffres clés.
*   **Contenu** : Compteurs d'impact, message de mission, actualités.

### B. 💪 Passer à l'action (Action Directe)
*   **Objectif** : Boîte à outils du terrain.
*   **Contenu** : 
    - **J'ai nettoyé !** (Anciennement Déclaration)
    - **Signaler un dépôt** (Anciennement Trash Spotter)
    - **Calcul d'itinéraire** (Outil intégré)

### C. 📍 Carte de l'impact (Visualisation)
*   **Objectif** : Comprendre le terrain sur une carte interactive.
*   **Contenu** : Filtres par type (Pollution, Zones propres, Partenariats).

### D. 🏆 Ma Communauté (Engagement)
*   **Objectif** : Reconnaissance et lien social.
*   **Contenu** :
    - **Mon Historique** (Mes actions)
    - **Défis & Badges** (Success)
    - **Rassemblements** (Événements & Forum)
    - **Acteurs Engagés** (Partenaires)

### E. 📚 Guide & Outils (Ressources)
*   **Objectif** : S'informer et s'éduquer.
*   **Contenu** :
    - **Outils & Kits de nettoyage**
    - **Guide de tri & Recyclage**
    - **Bilan d'Impact (PDF)**
    - **Météo & Climat**

### F. 🛡️ Espace Pro / Admin (Gestion)
*   **Objectif** : Outils de pilotage territoire et administration.
*   **Contenu** :
    - **Dashboard Territoires** (Anciennement ELUS)
    - **Modération des signalements**
    - **Monitoring & Exports**

---

## 3. Renommage des Labels (Vocabulaire Citoyen)

| Ancien Label | Nouveau Label | Justification |
| :--- | :--- | :--- |
| Declaration | **J'ai nettoyé !** | Langage d'action, impact direct. |
| Trash Spotter | **Signaler un dépôt** | Instruction claire et verbale. |
| Gamification | **Défis & Badges** | Plus humain et ludique. |
| ELUS | **Espace Territoires** | Professionnel sans être élitiste. |
| History | **Mes Actions** | Sentiment d'appartenance. |

---

## 4. Parcours Utilisateur Types (Flux Bénévoles)

1.  **Flux "Action Immédiate"** :
    - Arrivée -> **"Passer à l'action"** -> **"J'ai nettoyé !"**.
2.  **Flux "Analyse & Motivation"** :
    - Arrivée -> **"Carte de l'impact"** pour voir où intervenir.
3.  **Flux "Social & Récompense"** :
    - Arrivée -> **"Ma Communauté"** -> **"Défis & Badges"** pour voir ses progrès.

---

## 5. Recommandations Prioritaires

1.  **Refactoriser `app.py`** : Mettre en œuvre une navigation à deux niveaux (Piliers -> Sous-onglets).
2.  **Unifier les Headers** : Utiliser `render_tab_header` pour chaque onglet avec les nouveaux labels.
3.  **Optimisation Mobile** : Réduire la taille de la barre latérale pour privilégier l'action.

---

## 6. Prochaines Étapes Techniques

- [ ] Mise à jour de `src/ui/tab_config.py` (ou `app.py`) pour la nouvelle structure.
- [ ] Centralisation de l'I18n pour les nouveaux groupes de navigation.
- [ ] Tests de navigation E2E sur mobiles.
