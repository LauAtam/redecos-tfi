# Tasks: Auth Router Guards & Role Redirection

## Review Workload Forecast
- Estimated changed lines: 120-150 lines
- 400-line budget risk: Low
- Chained PRs recommended: No
- Delivery strategy: single-pr
- Decision needed before apply: No
- Suggested work-unit PR split: Not needed

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Tasks Breakdown

### Phase 1: Foundation (Auth Service JWT Optimization)
- [x] **RED**: Write tests for JWT extraction in `frontend/src/app/supabase.service.ts` if test suite is configured.
- [x] **GREEN**: Modify `frontend/src/app/supabase.service.ts` constructor to register `onAuthStateChange`.
- [x] **GREEN**: Modify `frontend/src/app/supabase.service.ts` `login` and `onAuthStateChange` to extract roles directly from JWT `app_metadata.role` into the local `currentUserSubject` cache, bypassing `profiles` database queries.
- [x] **REFACTOR**: Remove unused `initializeUser` and `refreshUserProfile` methods in `frontend/src/app/supabase.service.ts`.

### Phase 2: Core Guard Implementation (Low-Latency Guard)
- [x] **GREEN**: Modify `frontend/src/app/core/guards/role.guard.ts` to check roles síncronicamente from local cache.
- [x] **GREEN**: Update `frontend/src/app/core/guards/role.guard.ts` to fallback to asynchronous `getSession` and read `user.app_metadata.role` on cache miss, eliminating `getUserProfile` SQL calls.

### Phase 3: Routing & Navigation Wiring
- [x] **GREEN**: Modify `frontend/src/app/app.routes.ts` to define `/admin/dashboard` route and redirect `/admin` default path to `dashboard`.
- [x] **GREEN**: Modify `frontend/src/app/pages/login/login.page.ts` to redirect `ADMIN` to `/admin/dashboard` and all other roles (`NODO`, `CLIENTE`) to `/home`.

### Phase 4: Admin Dashboard Page
- [x] **GREEN**: Create standalone page component `frontend/src/app/pages/admin/dashboard/dashboard.page.ts` implementing Angular imports & `Router`/`SupabaseService`.
- [x] **GREEN**: Create component template `frontend/src/app/pages/admin/dashboard/dashboard.page.html` with cards linking to `/admin/nodos`, `/admin/productos`, and a Log Out button.
- [x] **GREEN**: Create stylesheet `frontend/src/app/pages/admin/dashboard/dashboard.page.scss` styling layout structure using Ionic classes.

### Phase 5: Verification & Cleanup
- [x] **REFACTOR**: Verify navigation behaves correctly with zero database performance cost (no profiles fetch).
- [x] **REFACTOR**: Test role-based redirection to `/restricted` route for unauthorized roles.
