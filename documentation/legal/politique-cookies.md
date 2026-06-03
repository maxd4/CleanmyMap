# Politique des Cookies - CleanMyMap

**Dernière mise à jour :** 1 Juin 2026

---

## 1. Qu'est-ce qu'un Cookie ?

Un cookie est un petit fichier texte déposé sur votre appareil lors de la visite d'un site web. Il permet de mémoriser des informations relatives à votre navigation.

CleanMyMap utilise des cookies pour :
- Fonctionnement essentiel du site
- Amélioration de l'expérience utilisateur
- Analyse de la navigation (avec votre consentement)

---

## 2. Bannière de Consentement

Lors de votre première visite sur CleanMyMap, une bannière vous permet de choix :

| Option | Description |
|--------|-------------|
| **Accepter tout** | Active tous les cookies y compris analytiques |
| **Essentiels seulement** | Active uniquement les cookies nécessaires au fonctionnement |
| **Refuser** | Désactive tous les cookies non essentiels |

Votre choix est enregistré pour **1 an** dans `localStorage` sous `cleanmymap_cookie_consent` et synchronisé avec le cookie analytique `cleanmymap_analytics_consent`.

Vous pouvez modifier vos préférences à tout moment en :
- Cliquant sur le lien "Paramètres cookies" en bas de page
- Supprimant la clé `cleanmymap_cookie_consent` de `localStorage` et le cookie `cleanmymap_analytics_consent`

---

## 3. Types de Cookies Utilisés

### 3.1 Cookies Essentiels (Sans Consentement)

Ces cookies sont nécessaires au fonctionnement du site. Vous ne pouvez pas les désactiver.

| Service | Purpose | Durée |
|---------|---------|-------|
| **Clerk** | Authentification et session utilisateur | Session |
| **Next.js** | Fonctionnement technique (locale, display mode) | Session |
| **Supabase** | Gestion des requêtes base de données | Session |

Les préférences `cleanmymap.locale` et `cleanmymap.display_mode` sont également synchronisées via cookies `SameSite=Lax` lorsqu'elles sont actives. Le mode d'affichage en attente de synchronisation reste en `localStorage` (`cleanmymap.display_mode_pending_sync`).

### 3.2 Cookies Analytiques (Consentement Requis)

Ces cookies permettent d'analyser la navigation pour améliorer le service.

| Service | Description | Consentement |
|---------|-------------|---------------|
| **PostHog** | Analytics open-source, données UE | Requis |
| **Vercel Analytics** | Mesure de performance et Core Web Vitals | Requis |
| **Vercel Speed Insights** | Analyse des temps de chargement | Requis |
| **Sentry** | Suivi des erreurs techniques | Intérêt légitime (sécurité) |

---

## 4. Détail des Outils Analytiques

### PostHog
- **Type** : Analytics open-source auto-hébergé
- **Location** : Union Européenne (Autriche)
- **Données** : Événements de navigation anonymisés
- **Consentement** : Requis - désactivé si pas de consentement
- **Note** : le parrainage et les liens d'invitation ne reposent pas sur un cookie dédié ; ils sont suivis en base de données via le profil utilisateur.

### Vercel Analytics
- **Type** : Mesure de performance web
- **Location** : USA (Vercel)
- **Données** : Métriques de performance (FCP, LCP, CLS)
- **Consentement** : Requis - désactivé si pas de consentement

### Vercel Speed Insights
- **Type** : Analyse des temps de chargement
- **Location** : USA (Vercel)
- **Données** : Métriques de vitesse et performances
- **Consentement** : Requis - désactivé si pas de consentement

### Sentry
- **Type** : Monitoring et error tracking
- **Location** : USA
- **Données** : Erreurs techniques, stack traces, contexte utilisateur
- **Consentement** : Intérêt légitime (sécurité) - activé sans consentement explicite
- **Base légale** : Article 6.1.f RGPD - intérêt légitime pour la sécurité du service

---

## 5. Gestion des Cookies par Navigateur

Vous pouvez configurer votre navigateur pour :

### Chrome
1. Paramètres > Confidentialité > Cookies
2. Bloquer tous les cookies ou exceptions par site

### Firefox
1. Paramètres > Protection > Cookies
2. Gestion des exceptions

### Safari
1. Préférences > Confidentialité
2. Bloquer les cookies

### Edge
1. Paramètres > Cookies et autorisations
2. Gestion par site

**Note :** La désactivation des cookies peut limiter certaines fonctionnalités du site.

---

## 6. Cookies Tiers

CleanMyMap intègre des services tiers qui peuvent déposer leurs propres cookies :

- **Clerk** (authentification)
- **PostHog** (analytics)
- **Vercel** (hébergement)
- **Resend** (emails)

Nous n'avons pas de contrôle sur ces cookies tiers. Veuillez consulter leurs politiques de confidentialité respectives.

---

## 7. Durée de Conservation

| Type de cookie | Durée maximale |
|----------------|-----------------|
| Cookies essentiels | Session |
| Cookies analytiques | 13 mois |
| Consentement | 1 an |
| Logs techniques | 12 mois |

---

## 8. Mise à Jour de cette Politique

Cette politique peut être mise à jour pour refléter les changements dans nos services ou la réglementation.

En cas de modification substantielle, une notification sera affichée sur le site.

---

## 9. Contact

Pour toute question concernant cette politique de cookies :
- **Email** : maxence.drm@gmail.com

---

*Pour plus d'informations sur la protection des données personnelles, consultez notre Politique de Confidentialité.*
