# Audit Product : Messagerie & Stratégie Email (No-Email Policy)

## Vision
CleanMyMap adopte une stratégie de "Sobriété Numérique" radicale. Nous avons supprimé toutes les notifications par email automatiques au profit d'un système 100% In-App.

## 1. Messagerie PRO (In-App)
- **Canaux Dynamiques** : 
    - **Voisinage** : Basé sur l'adjacence géographique (arrondissement déclaré + voisins directs).
    - **Gouvernance** : Réservé aux Admins, Élus et Coordinateurs.
    - **Exécutif** : Réservé aux Administrateurs uniquement.
- **DMs (Messages Privés)** : Messagerie sécurisée 1v1 avec RLS (Row Level Security).
- **Mentions (@user)** : Système de tag automatique déclenchant une notification in-app immédiate.
- **Rétention de Données** : 
    - Messages : 6 mois max.
    - Médias (< 2Mo) : 1 mois max (purge automatique pour sobriété).

## 2. Stratégie Email vs Notifications
- **Zéro Email Auto** : Aucune alerte de validation, nouveau message ou relance n'est envoyée par email pour limiter l'empreinte carbone et l'encombrement des boîtes de réception.
- **NotificationBell (Centrale App)** : Hub central des alertes avec retour haptique (vibration) pour une expérience mobile-first premium.
- **Newsletter (Opt-in)** : Seul canal email maintenu, géré via une table de souscription dédiée pour une communication groupée et réfléchie.

## 3. Sécurité & Performance
- **Anti-Spam** : Système de quotas (Message Slots) avec cooldown de 30s.
- **Performance** : Polling intelligent de 30s permettant de simuler du temps réel sans les coûts d'infrastructure d'un socket permanent.
- **Handle Unique** : Support des pseudonymes uniques pour la confidentialité.
