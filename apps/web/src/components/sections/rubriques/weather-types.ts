export interface WeatherLocationSuggestion {
  label: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  importance: number | null;
}

export type WeatherLocationResolution = "resolved" | "unresolved";

export type WeatherLocation = WeatherLocationSuggestion & {
  resolution: WeatherLocationResolution;
};

export interface WeatherPoint {
  time: string;
  temperature: number | null;
  rain: number | null;
  precipitationProbability: number | null;
  wind: number | null;
  humidity: number | null;
  uv: number | null;
  weatherCode: number | null;
}

export type WeatherDataStatus = "loading" | "ready" | "error" | "empty";
