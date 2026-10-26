# Phase 2 — Dark Mode + PWA

**Date:** 2026-10-26  
**Status:** Implemented

## Decisions

| Topic | Choice |
|-------|--------|
| Theme | Light / Dark / System (default System), persisted in `localStorage` |
| PWA start | Home screen opens `/add` |
| Offline | Shell cache only; no offline expense sync |

## Deliverables

- ThemeProvider + More appearance toggle
- CSS variables + `dark:` surfaces
- `manifest.webmanifest`, icons, `sw.js`, client registration
