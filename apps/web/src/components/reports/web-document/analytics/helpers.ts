import type { ActionListItem } from "@/lib/actions/types";

export function normalizeListType(item: ActionListItem): "action" | "spot" | "clean_place" {
  if (item.contract?.type) return item.contract.type;
  if (item.record_type === "clean_place") return "clean_place";
  if (item.record_type === "other") return "spot";
  return "action";
}

export function getWeatherAdvice(params: {
  temperature: number;
  rain: number;
  wind: number;
}): string {
  if (params.rain >= 3 || params.wind >= 40) {
    return "Niveau météo prudent: renforcer EPI, réduire durée et sécuriser les points d'appui.";
  }
  if (params.temperature >= 28) {
    return "Niveau météo chaud: prévoir eau, pauses et roulement de l'équipe.";
  }
  if (params.temperature <= 3) {
    return "Niveau météo froid: cycles courts et protection renforcée des mains.";
  }
  return "Niveau météo favorable: fenêtre opérationnelle standard.";
}
