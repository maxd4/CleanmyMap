# Plan d'Implémentation — Architecture de Navigation Bénévole CleanMyMap

> **Objectif** : Transformer la navigation de CleanMyMap pour qu'elle reflète la logique d'usage quotidien des bénévoles, et non la structure technique interne du code.

---

## 1. Diagnostic de la Structure Actuelle

### 1.1 Ce qui fonctionne bien

- La **navigation à deux niveaux** (Pilier → Sous-onglet) est en place et fonctionnelle.
- Le **deep linking par URL** (`?pillar=…&tab=…`) permet de partager des vues spécifiques.
- Les **boutons d'accès rapide** « Signaler » et « Déclarer » dans la sidebar sont pertinents.
- La **page d'accueil** offre des compteurs d'impact, des actions récentes et une mini-carte : c'est un bon point d'entrée.
- Les **en-têtes de page** sont uniformes (`render_tab_header`) et les labels ont été naturalisés en français.

### 1.2 Problèmes identifiés

#### A. Surcharge du pilier « 📚 Guide & Outils » (8 sous-onglets)

Le pilier « Guide & Outils » contient **8 sous-onglets** aux vocations très différentes :

| Sous-onglet | Usage réel |
| :--- | :--- |
| 🧰 Outils & Kits | Préparer une sortie (QR, templates) |
| 📑 Mon Bilan PDF | Exporter un rapport formel |
| ♻️ Guide de Tri | Apprendre à trier les déchets |
| 🌍 Climat | Culture scientifique générale |
| 🌦️ Météo | Choisir le bon créneau de sortie |
| 📊 Comparateur | Analyse territoriale avancée |
| 📖 Mode d'emploi | Onboarding pour nouveaux |
| 🧪 Labo | Tests sans risque |

**Problèmes** :
- Mélange de **contenus opérationnels** (Météo, Kits) et de **contenus éducatifs** (Climat, Tri, Mode d'emploi).
- Mélange de **contenus courants** (Météo, Kits) et de **contenus rares** (Comparateur, Bilan PDF, Labo).
- La Météo, outil de **planification de sortie**, est enterrée dans « Guide & Outils » alors qu'elle devrait être accessible avant une action.
- Le Comparateur est un **outil d'analyse avancée** destiné aux coordinateurs, pas aux bénévoles de base.
- Le Labo (sandbox) est un outil de **test/entraînement** qui ne relève ni du guide ni des outils opérationnels.
- 8 sous-onglets imposent un **temps de lecture visuelle** trop long dans le radio-menu.

#### B. Confusion dans le pilier « 🏆 Ma Communauté » (4 sous-onglets)

| Sous-onglet | Usage réel |
| :--- | :--- |
| 🤝 Rassemblements | Événements et coordination |
| 🏅 Défis & Badges | Gamification personnelle |
| 📜 Mes Actions | Historique personnel |
| 🤝 Acteurs Engagés | Annuaire de partenaires |

**Problèmes** :
- **« Mes Actions » est personnel** (historique filtrable, reprise), mais il est dans « Ma Communauté » au lieu d'être dans un espace personnel.
- **« Acteurs Engagés »** est un annuaire statique de partenaires sans rapport avec la communauté d'action. C'est une ressource informationnelle.
- L'icône 🤝 est utilisée **deux fois** (Rassemblements ET Acteurs Engagés) → confusion visuelle.
- « Défis & Badges » et « Classements » forment ensemble la gamification, mais les classements sont intégrés dans Défis & Badges plutôt que d'être combinés avec l'historique.

#### C. Pilier « 💪 Passer à l'action » — bon mais incomplet

Le pilier contient : Déclaration, Signalement, Itinéraire.

**Problèmes** :
- La **Météo des sorties** est un prérequis à l'action terrain mais elle est dans « Guide & Outils ».
- L'**Itinéraire de nettoyage** est un prototype incomplet (l'IA d'optimisation n'est pas câblée) — il crée une attente non satisfaite.
- Il manque un lien vers la **Carte** pour choisir une zone d'intervention.

#### D. Doublons et contenus redondants

- La **page d'accueil** affiche une mini-carte interactive ET le pilier « Carte de l'impact » est une carte interactive séparée → doublon partiel qui dilue l'attention.
- Le **Bilan PDF** et le **Comparateur** sont deux formes d'analyse d'impact qui pourraient être regroupées.
- Le **Mode d'emploi** (onboarding) et le message « Parcours recommandé » sur l'accueil remplissent le même rôle de guidage.

#### E. Pilier « 🛡️ Espace Pro » — terminologie peu claire

- « Espace Pro » ne signale pas clairement qu'il s'agit d'un espace réservé aux **administrateurs et décideurs territoriaux**.
- « Territoires » et « Administration » n'indiquent pas clairement le niveau de permission requis.

#### F. Labels restant perfectibles

| Label actuel | Problème |
| :--- | :--- |
| « Choisir un univers » | Trop abstrait — un bénévole cherche une action, pas un « univers ». |
| « Sélectionnez une action » | Prometteur mais faux quand les sous-onglets sont informationnels (Climat,  Guide de Tri). |
| « Passer à l'action » | Bon label mais le pilier ne contient pas la Météo ni la Carte, ce qui brise le flux « je veux agir ». |
| « Ma Communauté » | Mélange le perso (mes actions) et le collectif (rassemblements, acteurs). |

---

## 2. Proposition de Nouvelle Architecture de Navigation

### 2.1 Principes directeurs

1. **Chaque pilier correspond à une intention utilisateur**, pas à un type de contenu.
2. **Les onglets fréquents doivent être à 1 clic** (max 2 niveaux de navigation).
3. **Réduire à 5 sous-onglets maximum par pilier** pour limiter le temps de scan visuel.
4. **Séparer les contenus quotidiens des contenus rares** : l'éducatif et l'analytique ne doivent pas polluer les flux d'action.
5. **Réserver un espace personnel clair** pour que le bénévole retrouve ses propres données.

### 2.2 Nouvelle structure proposée (5 Piliers)

```
🏠  Tableau de bord
    └── (page unique : compteurs, actions récentes, carte live, parcours recommandé)

⚡  Agir
    ├── ✨  Déclarer un nettoyage
    ├── 🚩  Signaler un dépôt
    ├── 🌦️  Météo des sorties
    └── 🗺️  Planifier un itinéraire

📍  Explorer
    ├── 🗺️  Carte interactive
    ├── ♻️  Guide de tri
    ├── 🌍  Comprendre le climat
    └── 🤝  Annuaire solidaire

👤  Mon espace
    ├── 📜  Mes actions
    ├── 🏅  Mes badges & défis
    └── 📑  Mon bilan PDF

🏛️  Coordination
    ├── 📆  Événements & sorties
    ├── 📊  Analyse territoriale
    ├── 🧰  Kit organisateur
    ├── 🏦  Espace collectivités
    └── ⚙️  Administration
```

**Supprimé / Fusionné** :
- **📖 Mode d'emploi** → Fusionné dans un panneau d'onboarding contextuel sur la page « Tableau de bord » (déjà le « Parcours recommandé » existant). Un lien « Besoin d'aide ? » dans le footer sidebar pointe vers le contenu. On ne supprime pas le code, on le rend accessible autrement.
- **🧪 Le Labo** → Déplacé dans « Coordination » seulement si l'utilisateur est identifié comme organisateur ou admin, sinon masqué. Alternative : accessible via un lien discret en bas de « Mon espace ».

### 2.3 Justification des changements structurels

| Changement | Raison |
| :--- | :--- |
| **Météo déplacée dans « Agir »** | La météo est une étape de planification directement liée à l'action terrain. Un bénévole qui veut agir regarde la météo AVANT de déclarer. |
| **Séparation « Explorer » / « Mon espace »** | Distingue le collectif (carte, ressources partagées) du personnel (mes actions, mes badges, mon bilan). Réduit la confusion du pilier « Ma Communauté » actuel. |
| **Création du pilier « Coordination »** | Regroupe tout ce qui relève de l'organisation d'équipe, de l'analyse territoriale et de l'administration. C'est le pilier des « organisateurs », pas des « simples bénévoles ». |
| **Événements déplacés dans « Coordination »** | Créer un événement est un acte d'organisateur. Les bénévoles qui cherchent un événement le trouvent aussi via la Carte ou le Tableau de bord. |
| **Annuaire solidaire déplacé dans « Explorer »** | Les partenaires sont des ressources informationnelles, comme la carte ou le guide de tri. Ils n'ont rien de « communautaire » au sens d'une action commune. |
| **Pilier réduit à 5 max** | Aucun pilier ne dépasse 5 sous-onglets → scan rapide du radio-menu. |

---

## 3. Renommage des Labels

### 3.1 Labels de navigation principaux

| Actuel | Proposé | Raison |
| :--- | :--- | :--- |
| « Choisir un univers » | **« Que souhaitez-vous faire ? »** | Plus naturel. Pose une question qui oriente l'utilisateur. |
| « Sélectionnez une action » | **« Choisir »** | Plus court. Évite la promesse erronée d'« action » quand le contenu est informatif. |
| « 🏠 Accueil » | **« 🏠 Tableau de bord »** | « Accueil » est passif. « Tableau de bord » indique que c'est un point de pilotage actif. |
| « 💪 Passer à l'action » | **« ⚡ Agir »** | Plus court, plus percutant, moins de charge cognitive. |
| « 📍 Carte de l'impact » | **« 📍 Explorer »** | Le pilier contient désormais plus que la carte (guide de tri, climat, annuaire). « Explorer » couvre l'ensemble. |
| « 🏆 Ma Communauté » | **« 👤 Mon espace »** | Le contenu personnel (mes actions, mes badges) est désormais isolé. C'est un espace « à moi ». |
| « 📚 Guide & Outils » | *(Supprimé — éclaté entre « Explorer », « Agir » et « Coordination »)* | Pilier fourre-tout qui disparaît au profit d'une distribution logique. |
| « 🛡️ Espace Pro » | **« 🏛️ Coordination »** | Plus clair et moins intimidant. Signale un rôle d'organisateur ou de gestionnaire, pas une exclusivité « pro ». |

### 3.2 Labels des sous-onglets

| Pilier | Actuel | Proposé | Raison |
| :--- | :--- | :--- | :--- |
| Agir | « ✨ J'ai nettoyé ! » | **« ✨ Déclarer un nettoyage »** | Plus explicite sur l'action concrète. « J'ai nettoyé ! » est festif mais ne dit pas quoi faire. |
| Agir | « 🚩 Signaler un dépôt » | *(inchangé)* | Clair et actionnable. |
| Agir | « 🌦️ Météo des sorties » | *(inchangé, déplacé ici)* | Bien nommé, juste mal placé. |
| Agir | « 🗺️ Itinéraire » | **« 🗺️ Planifier un parcours »** | Plus explicite. « Itinéraire » seul est vague. |
| Explorer | « 📍 Carte de l'impact » | **« 🗺️ Carte interactive »** | « Carte interactive » est plus descriptif et moins abstrait. |
| Explorer | « ♻️ Guide de Tri » | *(inchangé)* | Clair et compréhensible. |
| Explorer | « 🌍 Climat & Écologie » | **« 🌍 Comprendre le climat »** | Invite à l'apprentissage, plus engageant. |
| Explorer | « 🤝 Acteurs Engagés » | **« 🤝 Annuaire solidaire »** | Plus fonctionnel : c'est un annuaire, pas une page communautaire. |
| Mon espace | « 📜 Mes Actions » | *(inchangé)* | Clair, personnel, direct. |
| Mon espace | « 🏅 Défis & Badges » | **« 🏅 Mes badges & classements »** | Insiste sur le côté personnel et inclut les classements déjà intégrés. |
| Mon espace | « 📑 Mon Bilan PDF » | **« 📑 Mon bilan »** | Plus simple, le format (PDF) est secondaire. |
| Coordination | « 🤝 Rassemblements » | **« 📆 Événements & sorties »** | Plus descriptif. « Rassemblements » est vague. « Sorties » ancre dans le quotidien des cleanwalks. |
| Coordination | « 📊 Comparateur » | **« 📊 Analyse territoriale »** | Vocation réelle de l'outil : pas « comparer » en abstrait mais analyser un territoire. |
| Coordination | « 🧰 Outils & Kits » | **« 🧰 Kit organisateur »** | Cible mieux l'usage : outil de coordination terrain, pas outil générique. |
| Coordination | « 🏦 Territoires » | **« 🏦 Espace collectivités »** | Plus explicite : c'est pour les élus et techniciens de mairies. |
| Coordination | « ⚙️ Administration » | *(inchangé)* | Clair et restrictif de manière appropriée. |

---

## 4. Parcours Bénévoles Principaux

### 4.1 Flux « Première visite » (onboarding)

```
Tableau de bord (compteurs + parcours recommandé)
    → Callout « Parcours recommandé » avec 3 étapes
    → « Agir » → « Déclarer un nettoyage » (formulaire guidé en 3 étapes)
    → Retour Tableau de bord pour voir son action sur la carte
```

**Amélioration** : Le Mode d'emploi actuel (onboarding détaillé) est accessible via un lien « 📖 Besoin d'aide ? » en bas de la sidebar plutôt qu'un onglet entier rarement consulté.

### 4.2 Flux « Action récurrente » (bénévole régulier)

```
Agir → Météo des sorties (vérifier le créneau)
    → Déclarer un nettoyage (ou Signaler un dépôt)
    → Mon espace → Mes actions (vérifier que c'est enregistré)
```

**Amélioration** : La Météo est maintenant à 1 clic du formulaire au lieu de 3. Le flux est linéaire sans sauter entre piliers.

### 4.3 Flux « Préparation d'événement » (organisateur)

```
Coordination → Événements & sorties (créer un événement)
    → Kit organisateur (QR code + template équipe)
    → Agir → Météo (choisir la date)
    → Partager le lien deep-link vers l'événement
```

**Amélioration** : Kit et Événements sont dans le même pilier « Coordination ». L'organisateur n'a plus à naviguer entre 3 piliers différents.

### 4.4 Flux « Consultation rapide » (curieux / presse / élu)

```
Tableau de bord (chiffres clés en 5 secondes)
    → Explorer → Carte interactive (visualiser l'impact géographique)
    → Mon espace → Mon bilan (export PDF à envoyer)
```

### 4.5 Flux « Suivi personnel » (bénévole motivé)

```
Mon espace → Mes actions (filtrer par période / zone)
    → Mes badges & classements (voir sa progression)
    → Mon bilan (générer un rapport pour l'année)
```

**Amélioration** : Tout est dans un seul pilier « Mon espace ». Pas de fragmentation.

---

## 5. Raccourcis et Accès Rapide

### 5.1 Sidebar — Boutons d'accès rapide (existants, à enrichir)

Maintenir les deux boutons rapides existants :
- **🚩 Signaler** → `?pillar=action&tab=trash_spotter`
- **✨ Déclarer** → `?pillar=action&tab=declaration`

Ajouter un troisième :
- **🗺️ Carte** → `?pillar=explore&tab=map`

### 5.2 Tableau de bord — Cartes d'action contextuelle

Ajouter sous les compteurs d'impact des **cartes cliquables** :
- « Déclarer mon nettoyage » → redirige vers Agir / Déclaration
- « Voir la carte » → redirige vers Explorer / Carte
- « Créer un événement » → redirige vers Coordination / Événements

Ces cartes remplacent le texte « Parcours recommandé » actuel par des **boutons d'action visuels**.

---

## 6. Plan d'Action Prioritaire

### Phase A — Restructuration des piliers (Impact : ★★★★★)

> [!IMPORTANT]
> C'est le changement le plus impactant. Le dictionnaire `PILLARS` dans `app.py` doit être réécrit.

**Fichier** : `app.py` (lignes 84-91 + 115-133)

Réécrire le dictionnaire `PILLARS` :
```python
PILLARS = {
    "dashboard": {"label": "🏠 Tableau de bord", "tabs": ["home"]},
    "action":    {"label": "⚡ Agir", "tabs": ["declaration", "trash_spotter", "weather", "route"]},
    "explore":   {"label": "📍 Explorer", "tabs": ["map", "recycling", "climate", "actors"]},
    "me":        {"label": "👤 Mon espace", "tabs": ["history", "gamification", "pdf"]},
    "coord":     {"label": "🏛️ Coordination", "tabs": ["community", "compare", "kit", "elus", "admin"]},
}
```

Mettre à jour `tab_format_map` :
```python
tab_format_map = {
    "declaration":   "✨ Déclarer un nettoyage",
    "trash_spotter": "🚩 Signaler un dépôt",
    "weather":       "🌦️ Météo des sorties",
    "route":         "🗺️ Planifier un parcours",
    "map":           "🗺️ Carte interactive",
    "recycling":     "♻️ Guide de tri",
    "climate":       "🌍 Comprendre le climat",
    "actors":        "🤝 Annuaire solidaire",
    "history":       "📜 Mes actions",
    "gamification":  "🏅 Mes badges & classements",
    "pdf":           "📑 Mon bilan",
    "community":     "📆 Événements & sorties",
    "compare":       "📊 Analyse territoriale",
    "kit":           "🧰 Kit organisateur",
    "elus":          "🏦 Espace collectivités",
    "admin":         "⚙️ Administration",
}
```

Mettre à jour les labels de la sidebar :
- `"Choisir un univers"` → `"Que souhaitez-vous faire ?"`
- `"Sélectionnez une action"` → `"Choisir"`

**Estimation** : 30 minutes. Aucune modification des fichiers de tabs, uniquement `app.py`.

---

### Phase B — Ajout du lien « Besoin d'aide » et gestion du Mode d'emploi (Impact : ★★★☆☆)

Le tab `guide_tab.py` (Mode d'emploi) ne disparaît pas du code mais n'est **plus dans la navigation principale**. On le rend accessible via :
1. Un lien texte en bas de la sidebar : `st.sidebar.markdown("[📖 Besoin d'aide ?](?pillar=help&tab=guide)")`
2. Un pilier invisible `"help"` qui n'apparaît pas dans le selectbox mais qui rend `guide_tab` quand accédé par URL.

Même chose pour le **Labo (sandbox)** : accessible par URL `?pillar=help&tab=sandbox` et via un petit lien discret dans la sidebar.

**Fichier** : `app.py`

**Estimation** : 20 minutes.

---

### Phase C — Enrichissement du Tableau de bord avec cartes d'action (Impact : ★★★★☆)

**Fichier** : `src/ui/tabs/home_tab.py`

Remplacer le callout texte « Parcours recommandé » par 3 colonnes de boutons visuels :
- « ✨ Déclarer mon nettoyage »
- « 🗺️ Voir la carte »
- « 📆 Événements à venir »

Chaque bouton utilise `st.query_params` + `st.rerun()` pour naviguer.

**Estimation** : 30 minutes.

---

### Phase D — Ajout du 3e raccourci « Carte » dans la sidebar (Impact : ★★☆☆☆)

**Fichier** : `app.py` (lignes 149-162)

Passer de 2 colonnes à 3 colonnes dans la section "Accès Rapide" :
```python
col_q1, col_q2, col_q3 = st.sidebar.columns(3)
```

Ajouter le bouton `🗺️ Carte` qui redirige vers `?pillar=explore&tab=map`.

**Estimation** : 5 minutes.

---

### Phase E — Mise à jour des headers de tabs modifiés (Impact : ★★☆☆☆)

Mettre à jour les en-têtes des tabs dont le label a changé :

| Fichier | Champ `title_fr` actuel | Nouveau `title_fr` |
| :--- | :--- | :--- |
| `declaration_tab.py` | « J'ai nettoyé ! » | « Déclarer un nettoyage » |
| `route_tab.py` | « Itinéraire de nettoyage » | « Planifier un parcours » |
| `map_tab.py` | « Carte de l'impact » | « Carte interactive » |
| `climate_tab.py` | « Climat & Écologie » | « Comprendre le climat » |
| `actors_tab.py` | « Acteurs Engagés » | « Annuaire solidaire » |
| `gamification_tab.py` | « Défis & Badges » | « Mes badges & classements » |
| `report_tab.py` | « Mon Bilan PDF » | « Mon bilan » |
| `community_tab.py` | « Rassemblements » | « Événements & sorties » |
| `compare_tab.py` | « Comparateur » | « Analyse territoriale » |
| `kit_tab.py` | « Outils & Kits » | « Kit organisateur » |
| `elus_tab.py` | « Territoires » | « Espace collectivités » |

**Estimation** : 20 minutes (changements mécaniques).

---

### Phase F — Mise à jour des tests E2E (Impact : ★★★☆☆)

Les tests Playwright (`e2e/tests/critical-flows.spec.js`) utilisent probablement les anciens labels de navigation. Mettre à jour :
- Les sélecteurs qui référencent les noms de piliers.
- Les assertions qui vérifient les en-têtes de page.

**Estimation** : 30 minutes.

---

## 7. Risques et Points de Vigilance

### 7.1 Risque : Liens partagés cassés

> [!WARNING]
> Les deep links existants utilisant `?pillar=home`, `?pillar=resources`, `?pillar=community` ou `?pillar=pro` cesseront de fonctionner.

**Mitigation** : Ajouter un mapping de redirection dans `app.py` :
```python
PILLAR_REDIRECTS = {
    "home": "dashboard",
    "resources": "explore",  # ou "action" selon le tab demandé
    "community": "me",       # ou "coord" selon le tab demandé
    "pro": "coord",
}
```

### 7.2 Risque : Perte de repères pour les utilisateurs existants

Les bénévoles habitués à « Passer à l'action » ou « Ma Communauté » pourraient être désorientés temporairement.

**Mitigation** :
- Ajouter un **message de bienvenue temporaire** (callout d'information) pendant 2 semaines : « La navigation a évolué pour mieux vous servir ! Voici ce qui a changé… »
- Le Mode d'emploi (guide_tab) inclura une section « Nouvelle navigation ».

### 7.3 Risque : Le Labo (sandbox) devient quasi invisible

En le retirant de la navigation principale, les nouveaux utilisteurs ne le trouveront peut-être jamais.

**Mitigation** : Mentionner le Labo dans le Mode d'emploi et dans le message de bienvenue du formulaire de déclaration (callout « Envie de tester d'abord ? Essayez le Labo »).

### 7.4 Risque : Le Mode d'emploi perd en visibilité

Actuellement c'est un onglet dédié. En le rendant accessible uniquement par lien, il est moins découvrable.

**Mitigation** :
- Le lien « 📖 Besoin d'aide ? » est **toujours visible** en bas de la sidebar.
- Le callout d'onboarding sur le Tableau de bord continue de guider les nouveaux.
- Si les métriques UX montrent que personne ne clique, on pourra toujours le remettre dans « Explorer ».

---

## 8. Ordonnancement et Calendrier Recommandé

| Phase | Priorité | Estimation | Dépendances |
| :--- | :--- | :--- | :--- |
| **A. Restructuration PILLARS** | 🔴 Critique | 30 min | Aucune |
| **B. Liens « Aide » et « Labo »** | 🟡 Haute | 20 min | Phase A |
| **C. Cartes d'action Tableau de bord** | 🟡 Haute | 30 min | Phase A |
| **D. 3e raccourci sidebar** | 🟢 Simple | 5 min | Phase A |
| **E. Headers de tabs** | 🟡 Haute | 20 min | Phase A |
| **F. Tests E2E** | 🟡 Haute | 30 min | Phases A + E |

**Total estimé** : ~2h30 de travail concentré.

---

## 9. Résumé Structurel — Avant / Après

### Avant (6 piliers, 19 onglets)

```
🏠 Accueil (1)
💪 Passer à l'action (3) : Déclaration, Signalement, Itinéraire
📍 Carte de l'impact (1)
🏆 Ma Communauté (4) : Rassemblements, Défis, Historique, Acteurs
📚 Guide & Outils (8) : Kit, PDF, Tri, Climat, Météo, Comparateur, Guide, Labo
🛡️ Espace Pro (2) : Territoires, Admin
```

### Après (5 piliers, 16 onglets en nav + 2 accessibles par lien)

```
🏠 Tableau de bord (1)
⚡ Agir (4) : Déclaration, Signalement, Météo, Parcours
📍 Explorer (4) : Carte, Tri, Climat, Annuaire
👤 Mon espace (3) : Mes actions, Badges, Bilan
🏛️ Coordination (5) : Événements, Analyse, Kit, Collectivités, Admin
---
📖 Aide (accessible par lien) : Mode d'emploi
🧪 Labo (accessible par lien) : Sandbox
```

**Gains mesurables** :
- **-1 pilier** (6 → 5) : moins de choix au premier niveau.
- **-3 onglets visibles** dans la navigation principale : réduction de la charge cognitive.
- **Max 5 sous-onglets par pilier** (contre 8 avant) : scan visuel rapide.
- **Météo à 1 clic de l'action** au lieu de 3.
- **Flux « action récurrente » linéaire** : Météo → Déclarer → Mes actions.
- **Flux « organisateur » cohérent** : tout dans « Coordination ».
