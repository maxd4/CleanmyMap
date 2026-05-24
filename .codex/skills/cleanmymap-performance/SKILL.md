---
name: cleanmymap-performance
description: "Use this skill when a task affects rendering speed, bundle weight, image loading, caching, or Core Web Vitals in CleanMyMap."
category: repository
risk: medium
source: local
tags: "[performance, core-web-vitals, bundle, image-optimization, caching]"
date_added: "2026-05-24"
---

# CleanMyMap Performance Skill

## Purpose

Reduce avoidable loading cost and rendering work on critical pages.

## Use When

- Editing heavy routes or lists
- Adding images, maps, charts, or analytics
- Working on caching or server/client boundaries

## Core Rules

- Avoid unnecessary client-side work.
- Keep large assets sized and loaded intentionally.
- Watch for repeated requests and expensive re-renders.

## Validation

- Check the loaded route in the browser.
- Look for obvious shifts, delays, or oversized assets.
- Re-test after optimization.

## References

- `references/performance-map.md`
- `references/image-and-cache-patterns.md`

## Examples

- `examples/performance-checklist.md`
