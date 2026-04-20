"use client";

import { useEffect, useState } from "react";
import { fetchCurrentWeather, WeatherData } from "@/lib/pilotage/weather-service";
import { CloudRain, Wind, AlertTriangle, X } from "lucide-react";

export function WeatherWarningBar() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Attempt only if we have geo permission or silently fail
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const weather = await fetchCurrentWeather(
              position.coords.latitude,
              position.coords.longitude
            );
            if (weather.riskScore !== "none") {
              setData(weather);
              setIsVisible(true);
            }
          } catch (err) {
            console.error("Météo fetch error:", err);
            setError(true);
          }
        },
        () => {
          // User denied GPS or error, silent
        },
        { timeout: 5000 }
      );
    }
  }, []);

  if (!isVisible || !data) return null;

  const bgClass = data.riskScore === "high" ? "bg-rose-600" : "bg-amber-600";
  const Icon = data.isRaining ? CloudRain : data.isWindy ? Wind : AlertTriangle;

  return (
    <div className={`relative z-[60] flex items-center justify-between px-4 py-2 text-white shadow-lg animate-in slide-in-from-top duration-500 ${bgClass}`}>
      <div className="flex items-center gap-3">
        <Icon size={18} className="animate-pulse" />
        <p className="text-xs font-bold uppercase tracking-wide">
          <span className="hidden sm:inline">ALERTE OPÉRATIONNELLE : </span>
          {data.message}
        </p>
      </div>
      <button 
        onClick={() => setIsVisible(false)}
        className="p-1 hover:bg-white/20 rounded transition"
      >
        <X size={16} />
      </button>
    </div>
  );
}
