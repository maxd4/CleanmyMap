"use client";

import { useMemo, useState } from "react";
import { CircleMarker, Popup, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { divIcon } from "leaflet";
import {
  filterPlasticOriginsObservationsByBounds,
  PLASTIC_ORIGINS_MARKER_COLOR,
  type PlasticOriginsBounds,
  type PlasticOriginsDataset,
  type PlasticOriginsObservation,
} from "@/lib/plastic-origins/contract";

const CLUSTER_PROPS = {
  chunkedLoading: true,
  maxClusterRadius: 48,
  disableClusteringAtZoom: 16,
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false,
} as const;

type PlasticOriginsCluster = {
  getChildCount: () => number;
};

function snapshotBounds(map: ReturnType<typeof useMap>): PlasticOriginsBounds {
  const bounds = map.getBounds();
  return {
    south: bounds.getSouth(),
    west: bounds.getWest(),
    north: bounds.getNorth(),
    east: bounds.getEast(),
  };
}

function createClusterIcon(childCount: number) {
  return divIcon({
    className: "cmm-plastic-origins-cluster",
    html: `<div aria-label="${childCount} observations Plastic Origins" style="align-items:center;background:${PLASTIC_ORIGINS_MARKER_COLOR};border:3px solid white;border-radius:9999px;box-shadow:0 4px 14px rgba(131,24,67,.28);color:white;display:flex;font-size:12px;font-weight:800;height:38px;justify-content:center;width:38px">${childCount}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

function displayValue(value: string | null) {
  return value ?? "Non renseigné";
}

function sourceResourceTitle(dataset: PlasticOriginsDataset, resourceId: string) {
  return dataset.sourceResources.find((resource) => resource.resourceId === resourceId)?.filename
    ?? "Ressource Plastic Origins";
}

function PlasticOriginsPopup({
  dataset,
  observation,
}: {
  dataset: PlasticOriginsDataset;
  observation: PlasticOriginsObservation;
}) {
  const { properties } = observation;
  const availableData = properties.availableSourceFields
    .filter((field) => field !== "lat" && field !== "lon")
    .join(", ");

  return (
    <div className="min-w-[16rem] space-y-3 text-slate-950">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-fuchsia-700">
          Plastic Origins · Observation historique
        </p>
        <p className="mt-1 text-sm font-semibold">Donnée externe indépendante de CleanMyMap</p>
      </div>
      <dl className="grid gap-1 text-sm">
        <div className="flex justify-between gap-4"><dt className="font-semibold">Date</dt><dd>{displayValue(properties.sourceDate)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="font-semibold">Catégorie source</dt><dd>{displayValue(properties.category)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="font-semibold">Méthode source</dt><dd>{displayValue(properties.method)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="font-semibold">Déplacement</dt><dd>{displayValue(properties.move)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="font-semibold">Campagne</dt><dd>{displayValue(properties.sourceCampaignId)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="font-semibold">Rivière</dt><dd>{displayValue(properties.riverName)}</dd></div>
      </dl>
      <div className="border-t border-slate-200 pt-2 text-xs text-slate-600">
        <p>Données disponibles : {availableData || "aucune autre donnée"}.</p>
        <p className="mt-1">Source : {sourceResourceTitle(dataset, properties.source.resourceId)} · {properties.source.sourceRecordCount} ligne(s) source.</p>
        <p className="mt-1">Licence portail : {dataset.source.license} · documentation : {dataset.source.documentationDeclaredLicense}.</p>
        <p className="mt-1">Réserve : {dataset.source.licenseNote}</p>
        <p className="mt-1">Coordonnées conservées dans l’ordre longitude/latitude pour GeoJSON.</p>
      </div>
    </div>
  );
}

export function PlasticOriginsLayer({
  dataset,
  visible = true,
}: {
  dataset: PlasticOriginsDataset | null;
  visible?: boolean;
}) {
  const map = useMap();
  const [bounds, setBounds] = useState(() => snapshotBounds(map));
  useMapEvents({
    moveend: () => setBounds(snapshotBounds(map)),
    zoomend: () => setBounds(snapshotBounds(map)),
  });

  const visibleObservations = useMemo(
    () => dataset
      ? filterPlasticOriginsObservationsByBounds(dataset.observations, bounds)
      : [],
    [bounds, dataset],
  );

  if (!visible || !dataset || dataset.observations.length === 0) return null;

  return (
    <MarkerClusterGroup
      {...CLUSTER_PROPS}
      iconCreateFunction={(cluster: PlasticOriginsCluster) => createClusterIcon(cluster.getChildCount())}
    >
      {visibleObservations.map((observation) => {
        const [longitude, latitude] = observation.geometry.coordinates;
        return (
          <CircleMarker
            key={observation.stableKey}
            center={[latitude, longitude]}
            radius={observation.properties.source.exactDuplicateGroup ? 5 : 4}
            pathOptions={{
              color: PLASTIC_ORIGINS_MARKER_COLOR,
              fillColor: PLASTIC_ORIGINS_MARKER_COLOR,
              fillOpacity: 0.76,
              opacity: 0.92,
              weight: 1.5,
            }}
          >
            <Popup className="glass-popup custom-popup">
              <PlasticOriginsPopup dataset={dataset} observation={observation} />
            </Popup>
          </CircleMarker>
        );
      })}
    </MarkerClusterGroup>
  );
}
