export interface WeatherLocationSuggestion {
  label: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  importance: number | null;
}

export type WeatherLocation = WeatherLocationSuggestion;

export interface WeatherPoint {
  time: string;
  temperature: number;
  rain: number;
  precipitationProbability: number;
  wind: number;
  humidity: number;
  uv: number;
  weatherCode: number;
}

export type PackType = "solo" | "team" | "school";

export type WeatherDataStatus = "loading" | "ready" | "error" | "empty";
