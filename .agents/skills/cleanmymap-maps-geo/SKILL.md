---
name: cleanmymap-maps-geo
description: "Use this skill when a task touches map rendering, geo features, coordinates, geocoding, or route logic in CleanMyMap."
category: repository
risk: medium
source: local
tags: "[maps, geo, leaflet, coordinates, geocoding, routes]"
date_added: "2026-05-24"
---

# CleanMyMap Maps and Geo Skill

## Purpose

Keep cartography features accurate, responsive, and safe to render.

## Use When

- Editing Leaflet or map UI
- Working on coordinates, geocoding, or route computations
- Changing map-related routes or exports

## Core Rules

- Keep browser-only map code out of SSR paths.
- Preserve coordinate precision and source meaning.
- Re-test map interactions after any change.

## Validation

- Open the map page locally.
- Confirm markers, bounds, and interactions behave correctly.
- Verify the route or export tied to the map.

