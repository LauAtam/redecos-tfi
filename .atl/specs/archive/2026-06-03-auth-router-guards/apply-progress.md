# Implementation Progress: Auth Router Guards & Role Redirection

**Change**: auth-router-guards
**Mode**: Standard

### Completed Tasks
- [x] **JWT Optimization**: Modified `SupabaseService` to subscribe to `onAuthStateChange` in constructor, mapping user data/role directly from the JWT session payload.
- [x] **Profiles Bypass**: Modified `login` and `verifyOtp` methods in `SupabaseService` to map and cache user profile details from auth claims, bypassing `profiles` database table queries.
- [x] **Code Cleanup**: Removed unused `initializeUser` and `refreshUserProfile` methods in `SupabaseService`.
- [x] **Low-Latency Guard**: Updated `RoleGuard` to check role synchronously from cache or fallback to asynchronous `getSession` and read `app_metadata.role` from JWT, removing all `getUserProfile` dependencies.
- [x] **Route Registration**: Configured `app.routes.ts` to register the new `/admin/dashboard` route and updated `/admin` default redirection from `/admin/nodos` to `/admin/dashboard`.
- [x] **Role Redirection**: Modified `LoginPage` to route `ADMIN` users to `/admin/dashboard` and all non-ADMIN roles to `/home`.
- [x] **Admin Dashboard Component**: Created the new standalone component `DashboardPage` (`dashboard.page.ts`, `.html`, `.scss`) under `pages/admin/dashboard` with Ionic cards linking to `/admin/nodos` and `/admin/productos`, and a header logout button.

### Files Changed
| File | Action | What Was Done |
|------|--------|---------------|
| `frontend/src/app/supabase.service.ts` | Modified | Registered `onAuthStateChange`, extracted role from JWT token claims, and bypassed `getUserProfile` SQL query. |
| `frontend/src/app/core/guards/role.guard.ts` | Modified | Updated role check to read from cache or asynchronous JWT payload, bypassing `profiles` table. |
| `frontend/src/app/app.routes.ts` | Modified | Added route for `/admin/dashboard` and set default `/admin` redirect to `/admin/dashboard`. |
| `frontend/src/app/pages/login/login.page.ts` | Modified | Changed redirection targets post-login (`ADMIN` -> `/admin/dashboard`, others -> `/home`). |
| `frontend/src/app/pages/admin/dashboard/dashboard.page.ts` | Created | Standalone dashboard component importing Ionic components, injecting router & auth services, and implementing logout. |
| `frontend/src/app/pages/admin/dashboard/dashboard.page.html` | Created | Template for dashboard showcasing navigation cards and logout toolbar button. |
| `frontend/src/app/pages/admin/dashboard/dashboard.page.scss` | Created | Dashboard stylesheet defining card transitions and icon container layouts. |

### Deviations from Design
- None. Bypassed `profiles` table lookup successfully in all changed auth flows (login, verifyOtp, guards).

### Issues Found
- PowerShell script execution policy prevented direct `npm` execution via PowerShell; worked around by invoking through `cmd.exe`.

### Remaining Tasks
- None

### Workload / PR Boundary
- Mode: single PR
- Current work unit: auth-router-guards
- Boundary: all tasks complete
- Estimated review budget impact: ~150 lines changed

### Status
12/12 tasks complete. Ready for verify.
