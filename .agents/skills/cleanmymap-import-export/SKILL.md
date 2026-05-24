---
name: cleanmymap-import-export
description: "Use this skill when a task touches CSV, PDF, JSON, XLSX, archive generation, or data import/export workflows in CleanMyMap."
category: repository
risk: medium
source: local
tags: "[import, export, csv, pdf, xlsx, json]"
date_added: "2026-05-24"
---

# CleanMyMap Import and Export Skill

## Purpose

Keep data exchange predictable and auditable.

## Use When

- Editing export endpoints
- Working on import pipelines
- Changing filenames, headers, or generated attachments
- Updating snapshots or archive flows

## Core Rules

- Preserve the expected file format and naming.
- Keep imports tolerant of real-world bad data.
- Make exports deterministic where possible.

## Validation

- Verify one happy-path export.
- Verify malformed or partial input on import.
- Confirm filenames, headers, and content type.

