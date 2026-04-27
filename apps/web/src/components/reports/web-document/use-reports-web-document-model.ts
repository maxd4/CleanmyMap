"use client";

import { useEffect, useMemo, useState } from"react";
import useSWR from"swr";
import { fetchActions, fetchMapActions } from"@/lib/actions/http";
import { fetchCommunityEvents } from"@/lib/community/http";
import { swrRecentViewOptions } from"@/lib/swr-config";
import { computeReportModel, getWeatherAdvice } from"./analytics";
import {
 buildReportScopeOptions,
 computeReportAccountScopeCoverage,
 filterCommunityEventsByScope,
 filterReportScopeItems,
 formatReportScopeLabel,
 normalizeReportScope,
 type ReportScopeKind,
} from"@/lib/reports/scope";

export function useReportsWebDocumentModel() {
 const [scopeKind, setScopeKind] = useState<ReportScopeKind>("global");
 const [scopeValue, setScopeValue] = useState<string>("");

 const actionsAll = useSWR(
 ["report-web-actions-all"],
 () =>
 fetchActions({
 status:"all",
 limit: 200,
 days: 365,
 types:"all",
 }),
 swrRecentViewOptions,
 );
 const actionsApproved = useSWR(
 ["report-web-actions-approved"],
 () =>
 fetchActions({
 status:"approved",
 limit: 200,
 days: 365,
 types:"all",
 }),
 swrRecentViewOptions,
 );
 const mapAll = useSWR(
 ["report-web-map-all"],
 () =>
 fetchMapActions({
 status:"all",
 limit: 300,
 days: 365,
 types:"all",
 }),
 swrRecentViewOptions,
 );
 const community = useSWR(
 ["report-web-community-events"],
 () => fetchCommunityEvents({ limit: 240 }),
 swrRecentViewOptions,
 );
 const weather = useSWR(["report-web-weather"], async () => {
 const response = await fetch(
"https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&current=temperature_2m,precipitation,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Europe%2FParis",
 { cache:"no-store" },
 );
 if (!response.ok) throw new Error("weather_unavailable");
 return (await response.json()) as {
 current?: {
 temperature_2m?: number;
 precipitation?: number;
 wind_speed_10m?: number;
 };
 };
 });

 const isLoading =
 actionsAll.isLoading ||
 actionsApproved.isLoading ||
 mapAll.isLoading ||
 community.isLoading;
 const hasError = Boolean(
 actionsAll.error || actionsApproved.error || mapAll.error || community.error,
 );

 const scopeOptions = useMemo(
 () =>
 buildReportScopeOptions([
 ...(actionsAll.data?.items ?? []),
 ...(mapAll.data?.items ?? []),
 ]),
 [actionsAll.data?.items, mapAll.data?.items],
 );

 const accountScopeCoverage = useMemo(
 () => computeReportAccountScopeCoverage(actionsAll.data?.items ?? []),
 [actionsAll.data?.items],
 );

 useEffect(() => {
 if (scopeKind ==="global") {
 if (scopeValue !=="") {
 setScopeValue("");
 }
 return;
 }
 const options =
 scopeKind ==="account"
 ? scopeOptions.accounts
 : scopeKind ==="association"
 ? scopeOptions.associations
 : scopeOptions.arrondissements;
 if (options.length === 0) {
 if (scopeValue !=="") {
 setScopeValue("");
 }
 return;
 }
 const hasValue = options.some((option) => option.value === scopeValue);
 if (!hasValue) {
 setScopeValue(options[0].value);
 }
 }, [scopeKind, scopeOptions, scopeValue]);

 const scope = useMemo(
 () => normalizeReportScope({ kind: scopeKind, value: scopeValue }),
 [scopeKind, scopeValue],
 );

 const scopedActionsAll = useMemo(
 () => filterReportScopeItems(actionsAll.data?.items ?? [], scope),
 [actionsAll.data?.items, scope],
 );
 const scopedActionsApproved = useMemo(
 () => filterReportScopeItems(actionsApproved.data?.items ?? [], scope),
 [actionsApproved.data?.items, scope],
 );
 const scopedMapAll = useMemo(
 () => filterReportScopeItems(mapAll.data?.items ?? [], scope),
 [mapAll.data?.items, scope],
 );
 const scopedCommunity = useMemo(
 () => filterCommunityEventsByScope(community.data?.items ?? [], scope),
 [community.data?.items, scope],
 );

 const report = useMemo(
 () =>
 computeReportModel({
 allItems: scopedActionsAll,
 approvedItems: scopedActionsApproved,
 mapItems: scopedMapAll,
 events: scopedCommunity,
 }),
 [scopedActionsAll, scopedActionsApproved, scopedCommunity, scopedMapAll],
 );

 const exportRows = useMemo(
 () =>
 scopedActionsApproved.map((item) => ({
 Date: item.action_date,
 Lieu: item.location_label,
 Compte: item.created_by_clerk_id ?? item.actor_name ??"Inconnu",
 Association: item.association_name ??"Sans association",
 Masse_Kg: Number(item.waste_kg ?? 0),
 Megots: Number(item.cigarette_butts ?? 0),
 Bénévoles: Number(item.volunteers_count ?? 0),
 Durée_Min: Number(item.duration_minutes ?? 0),
 Type: item.record_type ?? item.contract?.type ??"action",
 Source: item.source ?? item.contract?.source ??"web_form",
 })),
 [scopedActionsApproved],
 );

 const weatherAdvice = useMemo(() => {
 const temperature = Number(weather.data?.current?.temperature_2m ?? 0);
 const rain = Number(weather.data?.current?.precipitation ?? 0);
 const wind = Number(weather.data?.current?.wind_speed_10m ?? 0);
 return getWeatherAdvice({ temperature, rain, wind });
 }, [weather.data]);

 const activeScopeLabel = formatReportScopeLabel(scope, scopeOptions);

 return {
 scopeKind,
 setScopeKind,
 scopeValue,
 setScopeValue,
 scopeOptions,
 exportRows,
 activeScopeLabel,
 accountScopeCoverage,
 report,
 weather,
 weatherAdvice,
 isLoading,
 hasError,
 };
}
