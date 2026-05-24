---
name: cleanmymap-analytics
description: "Use this skill when a task touches analytics events, consent, funnels, tracking, or product metrics in CleanMyMap."
category: repository
risk: medium
source: local
tags: "[analytics, posthog, consent, metrics, funnels]"
date_added: "2026-05-24"
---

# CleanMyMap Analytics Skill

## Purpose

Keep analytics useful, consent-aware, and low-noise.

## Use When

- Adding or changing tracking events
- Touching consent or opt-in behavior
- Working on funnels or metrics screens

## Core Rules

- Respect consent before tracking.
- Keep event names stable and meaningful.
- Avoid duplicate events for the same action.

## Validation

- Confirm the event fires once.
- Verify the no-consent path does not track.
- Check the event payload is readable and stable.

