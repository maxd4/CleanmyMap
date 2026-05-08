import type { OperationalZone, WeatherRiskAssessment, InterventionWindow } from "@/lib/weather/ops-weather";

export interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number;
    precipitation?: number;
    wind_speed_10m?: number;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    precipitation?: number[];
    wind_speed_10m?: number[];
  };
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
    wind_speed_10m_max?: number[];
  };
}

export type WeatherPeriod = "now" | "j13" | "j7";

export interface WeatherPoint {
  time: string;
  temperature: number;
  rain: number;
  wind: number;
}

export interface WeatherDay {
  day: string;
  min: number;
  max: number;
  rain: number;
  wind: number;
}

export type PackType = "solo" | "team" | "school";

export interface KitState {
  checks: Record<string, boolean>;
  progress: number;
  ready: boolean;
  packType: PackType;
  packItems: string[];
}
