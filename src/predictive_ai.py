import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def calculate_pollution_risk(city_df, weather_data=None):
    """
    Simule un modèle IA pour prédire le risque de pollution.
    Corrélation entre :
    - Historique (densité passée)
    - Météo (Pluie = concentration dans les égouts, Soleil = flux touristique)
    - Période (Week-end = pic de fréquentation)
    """
    if city_df.empty:
        return {"risk_score": 0, "level": "Low", "message": "Pas assez de données pour prédire."}
    
    # 1. Base : Moyenne de pollution historique (score_salete)
    # On imagine un score moyen par arrondissement ou global
    base_score = city_df['megots'].mean() / 100 if 'megots' in city_df.columns else 0
    
    # 2. Facteur Temporel (Week-end)
    now = datetime.now()
    is_weekend = now.weekday() >= 4 # Vendredi à Dimanche
    temporal_multiplier = 1.5 if is_weekend else 1.0
    
    # 3. Facteur Météo (Saisonnier et prévisionnel)
    weather_multiplier = 1.0
    if weather_data:
        temp = weather_data.get('temperature', 20)
        precip = weather_data.get('precipitation', 0)
        
        # Beau temps = plus de monde dehors = plus de mégots
        if temp > 22 and precip == 0:
            weather_multiplier = 1.4
        # Pluie = moins de monde mais drainage vers égouts = risque environnemental accru
        elif precip > 2:
            weather_multiplier = 1.2
            
    final_score = base_score * temporal_multiplier * weather_multiplier * 10
    final_score = min(100, int(final_score))
    
    level = "Critique" if final_score > 75 else "Élevé" if final_score > 50 else "Modéré" if final_score > 25 else "Faible"
    
    # Messages dynamiques (FR par défaut, géré par l'app pour EN)
    risk_messages = {
        "Critique": "⚠️ Vigilance maximale : Flux touristique et météo favorable suggèrent un pic de pollution imminent.",
        "Élevé": "🟠 Risque important : Forte probabilité de saturation des cendriers de rue ce week-end.",
        "Modéré": "🟡 Risque modéré : Situation sous contrôle, mais surveillance recommandée.",
        "Faible": "🟢 Risque faible : Conditions optimales."
    }
    
    return {
        "risk_score": final_score,
        "level": level,
        "message": risk_messages.get(level, "")
    }

def get_risk_recommendations(risk_data, lang="fr"):
    """Génère des recommandations basées sur l'IA."""
    level = risk_data['level']
    if lang == "fr":
        recoms = {
            "Critique": ["Organiser une Cleanwalk urgente", "Alerter les services de propreté", "Distribuer des cendriers de poche"],
            "Élevé": ["Planifier une action sous 48h", "Vider les points de collecte saturés"],
            "Modéré": ["Maintenir la veille habituelle", "Sensibilisation légère"],
            "Faible": ["Profiter du quartier propre !", "Documenter les bonnes pratiques"]
        }
    else:
        recoms = {
            "Critique": ["Organize an urgent Cleanwalk", "Alert city cleaning services", "Distribute pocket ashtrays"],
            "Élevé": ["Schedule an action within 48h", "Empty saturated collection points"],
            "Modéré": ["Continue normal monitoring", "Light awareness campaign"],
            "Faible": ["Enjoy the clean neighborhood!", "Document best practices"]
        }
    return recoms.get(level, [])
