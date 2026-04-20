export type WeatherData = {
  temperature: number;
  windSpeed: number;
  weatherCode: number;
  isRaining: boolean;
  isWindy: boolean;
  riskScore: "none" | "low" | "medium" | "high";
  message: string | null;
};

/**
 * Open-Meteo Weather Codes (Selection):
 * 0: Clear sky
 * 51, 53, 55: Drizzle
 * 61, 63, 65: Rain
 * 80, 81, 82: Rain showers
 * 95, 96, 99: Thunderstorm
 */
export async function fetchCurrentWeather(lat: number, lng: number): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error("Météo indisponible");
  
  const data = await response.json();
  const current = data.current_weather;
  const code = current.weathercode;
  const wind = current.windspeed;

  const isRaining = code >= 51;
  const isWindy = wind > 25; // Speed in km/h

  let riskScore: WeatherData["riskScore"] = "none";
  let message: string | null = null;

  if (code >= 95) {
    riskScore = "high";
    message = "Orage détecté : Évitez les sorties terrain immédiatement.";
  } else if (isRaining) {
    riskScore = "medium";
    message = "Pluie détectée : Attention, les mégots sont difficiles à collecter (dissolution) et le sol est glissant.";
  } else if (isWindy) {
    riskScore = "low";
    message = "Vent fort (>25km/h) : Risque de dispersion des déchets légers (plastiques, sachets).";
  }

  return {
    temperature: current.temperature,
    windSpeed: wind,
    weatherCode: code,
    isRaining,
    isWindy,
    riskScore,
    message
  };
}
