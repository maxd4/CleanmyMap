import type { OpenMeteoForecastResponse } from "@/lib/weather/open-meteo-client";

export type OpenMeteoResponse = OpenMeteoForecastResponse;

export type WeatherPeriod = "now" | "j13" | "j7";

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

export interface WeatherDay {
  day: string;
  min: number;
  max: number;
  rain: number;
  wind: number;
  uv: number;
  weatherCode: number;
}

export interface WeatherForecastDay {
  date: string;
  label: string;
  subtitle: string;
  min: number;
  max: number;
  rain: number;
  wind: number;
  uv: number;
  weatherCode: number;
  hours: WeatherPoint[];
}

export type PackType = "solo" | "team" | "school";

export interface KitState {
  checks: Record<string, boolean>;
  progress: number;
  ready: boolean;
  packType: PackType;
  packItems: string[];
}

export type WeatherDataStatus = "loading" | "ready" | "error" | "empty";
