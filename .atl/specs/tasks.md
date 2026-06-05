# Tasks: Geolocalización de Nodos de Retiro (`nodos-geolocalizacion`)

## Phase 1: Database & Backend
- [x] Create Supabase migration file `supabase/migrations/20260605_add_geoloc_to_nodos.sql` adding `latitude` and `longitude` as `NUMERIC(9,6)` with CHECK constraints in `[-90, 90]` and `[-180, 180]`.
- [x] Apply migration locally and verify database schema update.
- [x] Modify `backend/src/nodes/dto/create-node.dto.ts` to include optional `latitude` and `longitude` with decimal validations and geographical range decorators.
- [x] Verify `backend/src/nodes/dto/update-node.dto.ts` inherits coordinate fields and validations correctly.

## Phase 2: Frontend Infrastructure
- [x] Install `leaflet` and `@types/leaflet` dependencies in `frontend/package.json`.
- [x] Modify `frontend/src/app/core/models/auth.models.ts` to add optional `latitude?: number;` and `longitude?: number;` to the `Nodo` model.
- [x] Import Leaflet styles in `frontend/src/global.scss` using `@import "leaflet/dist/leaflet.css";`.

## Phase 3: Admin Nodos Component & Logic
- [ ] Add `#map` container, inputs for latitude/longitude, and validation messages in `frontend/src/app/pages/admin/nodos/nodos.page.html`.
- [ ] Implement map initialization, resize invalidation, and cleanup (`map.remove()`) in `frontend/src/app/pages/admin/nodos/nodos.page.ts`.
- [ ] Implement visual coordinate placement on map click or marker drag, updating form inputs.
- [ ] Implement OSM Nominatim direct geocoding with a 1-second debounce and custom User-Agent headers.
- [ ] Implement OSM Nominatim reverse geocoding on marker move to autocomplete the address field.
- [ ] Implement premium detail modal using modern `@if (selectedNodo)` syntax.
- [ ] Add styles for `#map` container and the detail modal in `frontend/src/app/pages/admin/nodos/nodos.page.scss`.

## Phase 4: Testing & Verification
- [ ] Create Jest unit tests for `CreateNodeDto` and `UpdateNodeDto` coordinate range validations.
- [ ] Write Jasmine unit/component tests in `frontend/src/app/pages/admin/nodos/nodos.page.spec.ts` verifying manual coordinates inputs, search debounce, and component destruction.
- [ ] Perform manual end-to-end testing of map loading, geocoding flow, and database persistence.

## Review Workload Forecast
- Estimated changed lines: 380-390
- 400-line budget risk: Low
- Chained PRs recommended: No
- Delivery strategy: ask-on-risk
- Chain strategy: feature-branch-chain
- Decision needed before apply: Yes
- Suggested work-unit PR split: Not needed
