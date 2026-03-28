import streamlit as st
import pandas as pd
import requests
import matplotlib.pyplot as plt

def render_weather_tab(ctx):
    """
    Renders the 'Weather' tab.
    ctx: A dictionary or object containing required utilities and data.
    """
    render_tab_header = ctx['render_tab_header']
    i18n_text = ctx['i18n_text']
    all_public_df = ctx['all_public_df']
    log_exception = ctx['log_exception']

    render_tab_header(
        icon="🌦️",
        title_fr="Météo des sorties",
        title_en="Weather & Outings",
        subtitle_fr="Identifiez les meilleures fenêtres météo pour coordonner vos actions terrain.",
        subtitle_en="Identify the best weather windows to coordinate your field actions.",
        chips=[i18n_text("Prévision", "Forecast"), i18n_text("Organisation", "Planning")],
        compact=True,
    )


    @st.cache_data(ttl=1800)
    def get_weather_forecast(lat=48.8566, lon=2.3522):
        try:
            url = (f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
                   f"&daily=precipitation_sum,temperature_2m_max,windspeed_10m_max"
                   f"&hourly=temperature_2m,precipitation,windspeed_10m"
                   f"&past_days=3&timezone=Europe%2FParis&wind_speed_unit=kmh")
            response = requests.get(url, timeout=8)
            response.raise_for_status()
            return response.json()
        except Exception as exc:
            log_exception(
                component="app",
                action="get_weather_forecast",
                exc=exc,
                message="Weather API request failed",
                context={"lat": lat, "lon": lon},
                severity="warning",
            )
        return None

    weather_data = get_weather_forecast()
    col_w1, col_w2 = st.columns([2, 1])

    with col_w1:
        if weather_data and 'daily' in weather_data:
            daily = weather_data['daily']
            df_weather = pd.DataFrame({
                'Date': pd.to_datetime(daily.get('time', [])),
                'Pluie (mm)': [p if p is not None else 0 for p in daily.get('precipitation_sum', [])],
                'Temp. max': [t if t is not None else 0 for t in daily.get('temperature_2m_max', [])],
                'Vent max (km/h)': [w if w is not None else 0 for w in daily.get('windspeed_10m_max', [])],
            })
            df_weather['Optimal'] = (df_weather['Pluie (mm)'] < 2) & (df_weather['Temp. max'] > 8) & (df_weather['Vent max (km/h)'] < 30)

            fig_w, ax_p = plt.subplots(figsize=(9, 3.5))
            ax_t = ax_p.twinx()
            colors_bar = ['#22c55e' if o else '#f87171' for o in df_weather['Optimal']]
            ax_p.bar(df_weather['Date'].dt.strftime('%d/%m'), df_weather['Pluie (mm)'], color=colors_bar, alpha=0.7)
            ax_t.plot(df_weather['Date'].dt.strftime('%d/%m'), df_weather['Temp. max'], color='#f97316', marker='o', linewidth=2, label='Temp')
            ax_t.plot(df_weather['Date'].dt.strftime('%d/%m'), df_weather['Vent max (km/h)'], color='#2563eb', marker='s', linewidth=1.7, label='Vent')
            ax_p.set_ylabel('Pluie (mm)', fontsize=9); ax_t.set_ylabel('Temp. max (°C)', fontsize=9, color='#f97316')
            ax_p.axhline(2, color='#ef4444', linestyle='--', linewidth=1, alpha=0.6)
            ax_p.tick_params(axis='x', rotation=25, labelsize=8)
            plt.title("Fenêtres d'action (vert = idéal)", fontsize=11, fontweight='bold', color='#1e293b')
            fig_w.tight_layout(); st.pyplot(fig_w); plt.close(fig_w)

            best = df_weather[df_weather['Optimal'] & (df_weather['Date'] >= pd.Timestamp.today().normalize())]
            if not best.empty:
                nb = best.iloc[0]
                st.success(f"🌟 **Meilleure fenêtre** : {nb['Date'].strftime('%A %d %B')} - {nb['Temp. max']:.0f}°C, {nb['Pluie (mm)']:.1f}mm pluie, vent {nb['Vent max (km/h)']:.0f} km/h.")
            else:
                st.warning("⚠️ Pas de fenêtre idéale dans les 7 prochains jours. Consultez à nouveau dans quelques jours.")

            st.markdown("#### Créneaux recommandés cleanwalk (prochaines 24h)")
            hourly = weather_data.get("hourly", {})
            h_df = pd.DataFrame({
                "time": pd.to_datetime(hourly.get("time", []), errors="coerce"),
                "rain": pd.to_numeric(hourly.get("precipitation", []), errors="coerce"),
                "wind": pd.to_numeric(hourly.get("windspeed_10m", []), errors="coerce"),
                "temp": pd.to_numeric(hourly.get("temperature_2m", []), errors="coerce"),
            }).dropna(subset=["time"])
            now_ts = pd.Timestamp.now(tz=None)
            next_24h = h_df[(h_df["time"] >= now_ts) & (h_df["time"] <= now_ts + pd.Timedelta(hours=24))].copy()
            if not next_24h.empty:
                slots = next_24h[(next_24h["rain"] <= 0.5) & (next_24h["wind"] <= 25) & (next_24h["temp"].between(8, 32))]
                if slots.empty:
                    st.info("Aucun créneau optimal détecté dans les 24 prochaines heures.")
                else:
                    for _, slot in slots.head(6).iterrows():
                        st.markdown(f"- {slot['time'].strftime('%d/%m %H:%M')} : pluie {slot['rain']:.1f} mm, vent {slot['wind']:.0f} km/h, {slot['temp']:.0f}°C")

                next_48h = h_df[(h_df["time"] >= now_ts) & (h_df["time"] <= now_ts + pd.Timedelta(hours=48))]
                heavy_rain = next_48h["rain"].max() if not next_48h.empty else 0
                strong_wind = next_48h["wind"].max() if not next_48h.empty else 0
                if heavy_rain >= 4:
                    st.warning(f"🌧️ **Alerte pluie** : cumul horaire élevé détecté (max {heavy_rain:.1f} mm/h sur 48h).")
                if strong_wind >= 45:
                    st.warning(f"💨 **Alerte vent** : rafales fortes détectées (max {strong_wind:.0f} km/h sur 48h).")
        else:
            st.info("Données météo indisponibles (API Open-Meteo). Réessayez dans quelques instants.")

    with col_w2:
        st.markdown('<div class="premium-card">', unsafe_allow_html=True)
        st.subheader("📆 Historique mensuel")
        if not all_public_df.empty and 'date' in all_public_df.columns:
            df_hist = all_public_df.copy()
            df_hist['date_dt'] = pd.to_datetime(df_hist['date'], errors='coerce')
            monthly_count = df_hist.dropna(subset=['date_dt']).groupby(df_hist['date_dt'].dt.month).size()
            mn = {1:'Jan',2:'Fév',3:'Mar',4:'Avr',5:'Mai',6:'Jun',7:'Jul',8:'Aoû',9:'Sep',10:'Oct',11:'Nov',12:'Déc'}
            for m, cnt in monthly_count.items():
                bp = int(cnt / max(monthly_count) * 100)
                st.markdown(f"<div style='display:flex;align-items:center;gap:8px;margin-bottom:4px;'>"
                    f"<span style='width:32px;font-size:11px;color:#64748b;'>{mn.get(m,'?')}</span>"
                    f"<div style='flex:1;background:#f1f5f9;border-radius:4px;height:14px;'>"
                    f"<div style='width:{bp}%;background:#10b981;height:14px;border-radius:4px;'></div></div>"
                    f"<span style='font-size:11px;color:#1e293b;font-weight:600;'>{cnt}</span></div>", unsafe_allow_html=True)
        else:
            st.caption("Données historiques insuffisantes.")
        st.markdown('</div>', unsafe_allow_html=True)
