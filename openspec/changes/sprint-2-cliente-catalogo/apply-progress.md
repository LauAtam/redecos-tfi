# Progress Log: sprint-2-cliente-catalogo

## Phases 1, 2 & 3 Implementation Summary
We successfully completed the implementation of Phase 1 (Database & Backend NestJS), Phase 2 (Frontend Infrastructure Angular), and Phase 3 (Selection Page & Catalog Views) following the specification and design.

### Key Accomplishments:
- **Database Schema Delta:** Applied migrations adding `retail_price` (in `productos`) and `default_node_id` (in `profiles` referencing `nodos`).
- **Backend Services & API:** Created `ProfilesModule` containing validation and updating endpoints (`PATCH /profiles/me`). Enriched the `nodos` list API to count participants per node seamlessly.
- **Frontend Infrastructure & Router:** Configured `nodeGuard` to force customers without node selection to route to `/pages/select-node`. Added routes in `app.routes.ts`.
- **Leaflet & Geolocation Integration:** Designed and implemented `/pages/select-node` page. The page fetches current nodes, requests browser geolocation, displays nodes on an interactive map using Leaflet, sorts nodes (by proximity or popularity), and saves node selection.
- **Reactive Catalog & Saving Badges:** Redesigned `HomePage` catalog to display the active node and calculate reactive savings percentage badges under WCAG Slate 700 contrast standards (`¡Ahorrás un XX%!`).

---

## TDD Cycle Evidence Table

| Task ID | Component Name | Test File Created First? | Implementation File Created? | TDD Cycle Status |
|---|---|---|---|---|
| **1.2** | `UpdateProfileDto` | Yes (`update-profile.dto.spec.ts`) | Yes (`update-profile.dto.ts`) | **PASSED** |
| **1.3** | `ProfilesService` | Yes (`profiles.service.spec.ts`) | Yes (`profiles.service.ts`) | **PASSED** |
| **1.4** | `ProfilesController` | Yes (`profiles.controller.spec.ts`) | Yes (`profiles.controller.ts`) | **PASSED** |
| **2.3** | `NodeGuard` | Yes (`node.guard.spec.ts`) | Yes (`node.guard.ts`) | **PASSED** |
| **3.1** | `SelectNodePage` | Yes (`select-node.page.spec.ts`) | Yes (`select-node.page.ts`) | **PASSED** |
| **3.3** | `HomePage` | Yes (`home.page.spec.ts`) | Yes (`home.page.ts`) | **PASSED** |

---

## File Changes Trace

- **Database:**
  - `supabase/migrations/20260610_add_retail_price_and_default_node.sql` (New migration)
- **Backend (NestJS):**
  - `backend/src/profiles/dto/update-profile.dto.ts` (New DTO)
  - `backend/src/profiles/dto/update-profile.dto.spec.ts` (New validation test)
  - `backend/src/profiles/profiles.service.ts` (New service)
  - `backend/src/profiles/profiles.service.spec.ts` (New service test)
  - `backend/src/profiles/profiles.controller.ts` (New controller)
  - `backend/src/profiles/profiles.controller.spec.ts` (New controller test)
  - `backend/src/profiles/profiles.module.ts` (New module definition)
  - `backend/src/app.module.ts` (Modified to register `ProfilesModule`)
  - `backend/src/nodes/infrastructure/supabase-nodes.repository.ts` (Modified to support dynamic participant counts)
- **Frontend (Angular):**
  - `frontend/src/app/core/models/auth.models.ts` (Modified to extend `Profile`, `Nodo` and `Producto`)
  - `frontend/src/app/supabase.service.ts` (Modified for profile enrichment & API connection)
  - `frontend/src/app/core/guards/node.guard.ts` (New guard)
  - `frontend/src/app/core/guards/node.guard.spec.ts` (New guard test)
  - `frontend/src/app/app.routes.ts` (Modified for home protection and select-node routing)
  - `frontend/src/app/pages/select-node/select-node.page.ts` (New selection page logic)
  - `frontend/src/app/pages/select-node/select-node.page.html` (New selection page view)
  - `frontend/src/app/pages/select-node/select-node.page.scss` (New selection page styles)
  - `frontend/src/app/pages/select-node/select-node.page.spec.ts` (New selection page tests)
  - `frontend/src/app/home/home.page.ts` (Refactored home component)
  - `frontend/src/app/home/home.page.html` (Refactored home view layout)
  - `frontend/src/app/home/home.page.scss` (Refactored home page styles)
  - `frontend/src/app/home/home.page.spec.ts` (New home page tests)
