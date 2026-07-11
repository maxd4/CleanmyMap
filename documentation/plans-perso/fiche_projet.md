# Fiche projet — CleanMyMap

## Identité du projet

**Nom du projet :** CleanMyMap (cleanmymap.fr)
**Nature :** Plateforme web d'organisation, de cartographie, de communication et de valorisation des cleanwalk (ramassages des déchets de l'espace public) à l'échelle nationale, en groupe (association, entreprise, évènement) ou en solitaire (action spontanée)
**Porteur :** Maxence DEROOME
**Initiative** : projet étudiant bénévole dans le cadre du diplome universitaire "Engagement" de Sorbonne Université  
**Date de début** : 20 février 
** Mise à jour de la fiche :** 21 mai 2026  

CleanMyMap est un projet d'intérêt général à vocation nationale qui transforme des actions bénévoles de nettoyage en informations utiles, lisibles et partageables.

---

## Contexte et besoin

Des actions citoyennes de ramassage sont organisées régulièrement, mais les données restent souvent dispersées (messages, feuilles de calcul, comptes-rendus non homogènes). Cette dispersion limite :

- la planification des prochaines actions ;
- la capacité à comparer les zones dans le temps ;
- la preuve d'impact auprès des partenaires publics et privés ;
- l'orientation des budgets vers des aménagements efficaces.

CleanMyMap répond à ce besoin en réunissant collecte, cartographie, suivi et restitution dans un seul outil.

---

## Structure du site web

### Par blocs

### Par rubriques


## Finalités du projet

### Action terrain
Aider les bénévoles à savoir **où**, **quand** et **comment** intervenir, avec des informations concrètes et exploitables.

### Pilotage associatif
Permettre aux associations de prioriser les zones à traiter, d'organiser les équipes et de suivre la régularité des interventions.

### Culture citoyenne
Rendre accessibles des contenus pédagogiques (guides, bonnes pratiques, ressources locales, sensibilisation environnementale).

### Plaidoyer institutionnel
Produire des indicateurs fiables pour objectiver l'impact des actions et soutenir des décisions d'investissement public (prévention, équipements, propreté, biodiversité).

### Valorisation des acteurs engagés
Mettre en avant les associations, commerces, entreprises, collectivités et collectifs impliqués dans des démarches utiles au territoire, quel que soit le niveau local.

---

## État réel du projet (au 21/05/2026)

### Fait
- formulaire bénévole
- ruban de navigation
- identité UI des blocs 
- homepage
- bloc accueil
- méthodologie
- rapport d'impact environnemental et social de l'utilsiation de l'IA dans le projet
- services web principaux
- socle de compatibilité territoire national avec lecture des anciens champs et écriture des nouveaux champs

### A faire 
- compagnon app pour le suivi GPS par uen application mobile
- Finir le développement de toutes les pages du site
- vérifier UX et UI de chaque page du site
- Rendre les espaces d'interaction entre les utilisateurs utilisables notamment les groupes de discussion
- résolution des warning et erreurs de tout type sur le repo et sur les services web (vercel, github)
- page de méthodologie
- application mobile du site pour Android et IOS une fois le site stable et utilisé
- demande de partenariat avec des structures de cleanwalk locales et nationales

---

## Livrables déjà disponibles

### Application web
Routes principales : `/dashboard`, `/reports`, `/admin`, `/actions/new`, `/actions/map`, `/actions/history`.

### Cartographie interactive
Visualisation des actions et signalements, avec filtres de lecture territoriale nationaux et compatibilité arrondissements pour les comptes historiques.

### API métier
API opérationnelle pour collecte, affichage carte, export, modération et flux communautaires, avec support des anciens champs de localisation.

### Reporting et exports
Indicateurs clés + exports CSV/JSON pour exploitation externe.

### Documentation et maintenance
Plan de travail versionné, scripts de vérification, documentation technique consolidée.

---

## Publics bénéficiaires

### Bénéficiaires directs
- bénévoles individuels ;
- collectifs de cleanwalk ;
- associations environnementales.

### Bénéficiaires indirects
- collectivités territoriales ;
- habitants ;
- partenaires institutionnels et économiques.

---

## Gouvernance et méthode de travail

Le pilotage repose sur :

- une priorisation stricte des besoins terrain ;
- des évolutions par lots pour limiter les régressions ;
- des validations systématiques (tests, build, checks) ;
- une documentation continue pour garantir la lisibilité du projet.

### Décision actée — Module data-quality
Le niveau retenu pour la qualité de données est **complet** (et non MVP).  
Ce choix couvre un périmètre renforcé :

- scoring qualité global (complétude, cohérence, fraîcheur) ;
- typologie d'anomalies détaillée ;
- règles avancées de détection ;
- workflows de correction (détection -> assignation -> correction -> validation -> clôture) ;
- historique des corrections (traçabilité) ;
- priorisation des actions de remédiation.

Ce choix améliore la robustesse du pilotage sur la durée, avec un coût assumé : une mise en œuvre plus longue et plus complexe, pouvant décaler des livrables moins prioritaires.

---

## Budget prévisionnel

### Dépenses déjà engagées
- Abonnement Codex : 40 € (2 mois) ;
- Nom de domaine `.fr` : 10 €/an.

### Projection de montée en charge
En cas de dépassement des offres gratuites (hébergement, authentification, base de données, email), passage progressif vers des offres payantes.

### Scénario financier simplifié

| Poste | Niveau actuel | Hypothèse montée en charge |
|---|---:|---:|
| Hébergement web | Gratuit / faible coût | ~20 €/mois |
| Authentification | Gratuit / faible coût | ~20 €/mois |
| Base de données | Gratuit / faible coût | ~20 €/mois |
| Email transactionnel | Gratuit / faible coût | ~20 €/mois |
| Domaine `.fr` | 10 €/an | 10 €/an |

### Sources de financement envisagées
- autofinancement ;
- contributions de partenaires ;
- subventions locales ;
- appels à projets ;
- cofinancements associatifs/municipaux.

---

## Calendrier prévisionnel

| Période | Objectif principal | Résultat attendu |
|---|---|---|
| Avril 2026 | Stabilisation post-E09 | Base technique propre, documentation alignée |
| Mai 2026 | Lancement des lots E10-E12 | Améliorations visibles côté pilotage et terrain |
| Juin 2026 | Lots E13-E17 | Fonctions admin avancées (qualité, observabilité, partenariats) |
| Juillet 2026 | Lots E18-E20 | Runbooks, matrice de tests, traçabilité documentaire |
| Septembre 2026 | Consolidation usage terrain | Meilleure adoption locale et retours utilisateurs structurés |
| T4 2026 | Préparation diffusion élargie | Dossier prêt pour partenaires institutionnels et financeurs |

---

## Risques principaux et réponses

| Risque | Impact | Réponse prévue |
|---|---|---|
| Qualité de données hétérogène | Décisions moins fiables | Contrôles, modération, routines qualité |
| Complexité du module data-quality complet | Délai de livraison potentiellement plus long | Séquencement par lots, jalons intermédiaires, arbitrage continu des priorités |
| Dépendance à des services tiers | Interruption partielle de service | Supervision, procédures de secours |
| Charge forte sur petite équipe | Ralentissement de la roadmap | Priorisation stricte, automatisation |
| Financement insuffisant | Limitation du déploiement | Budget par paliers, cofinancement |
| Adoption terrain trop faible | Impact réduit | Parcours simple, communication ciblée |

---

## Conclusion

CleanMyMap dispose d'un socle web stable et d'une utilité claire : transformer l'engagement bénévole en impact mesurable, compréhensible et mobilisable.

La priorité n'est plus de « faire de la technique pour la technique », mais d'amplifier l'usage réel et de renforcer la valeur collective pour tous les territoires suivis par le site.

---

## Glossaire (vulgarisé)

**Action** : intervention de nettoyage réalisée sur le terrain.  
**API** : passerelle qui permet à deux logiciels d'échanger des informations.  
**Architecture technique** : organisation globale du système et de ses composants.  
**Authentification** : vérification de l'identité d'un utilisateur.  
**Back-end** : partie invisible qui traite les données et applique les règles.  
**Base de données** : espace où les informations sont stockées et organisées.  
**Build** : étape technique qui prépare le site avant publication.  
**CSV** : format de fichier simple pour exporter des tableaux.  
**Dashboard** : écran de pilotage avec les indicateurs principaux.  
**Déploiement** : mise en ligne d'une nouvelle version du site.  
**Endpoint** : adresse précise d'une API (ex. `/api/actions`).  
**Export** : fichier généré pour partage ou analyse.  
**Front-end** : partie visible du site utilisée par le public.  
**Géolocalisation** : positionnement d'informations sur une carte.  
**JSON** : format standard de données lisible par les logiciels.  
**KPI** : indicateur chiffré pour suivre les résultats.  
**Legacy** : ancienne partie technique devenue obsolète.  
**Lint** : contrôle automatique de qualité du code.  
**Modération** : vérification des informations avant validation.  
**Next.js** : technologie web principale utilisée pour CleanMyMap.  
**PDF** : document prêt à partager ou imprimer.  
**Quota** : limite d'utilisation d'une offre gratuite.  
**Reporting** : présentation structurée des résultats.  
**RLS** : règles de sécurité qui limitent l'accès aux données.  
**Route** : adresse d'une page (ex. `/reports`).  
**Runtime** : version active du système en fonctionnement.  
**Script** : petit programme qui automatise une tâche.  
**Stack** : ensemble des technologies utilisées.  
**Supabase** : service de base de données et d'accès aux données.  
**Test** : vérification automatique du bon fonctionnement.  
**TypeScript** : langage utilisé pour réduire les erreurs de développement.  
**Vercel** : plateforme d'hébergement du site web.  
**Webhook** : message automatique reçu lorsqu'un événement externe survient.  
**Workflow** : enchaînement d'étapes pour réaliser un processus.
