# Tasks: Sprint 1 Core Operations

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 250-350 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

## Phase 1: Supabase & Infrastructure

- [x] 1.1 Install dependencies: `npm install @supabase/supabase-js class-validator class-transformer`
- [x] 1.2 Create Supabase migration for `nodos` and `productos` tables with RLS policies.
- [x] 1.3 Implement `SupabaseModule` and `SupabaseService` in `src/supabase/`.
- [x] 1.4 Create `SupabaseGuard` to extract user role from JWT. (Implemented as RolesGuard)

## Phase 2: Withdrawal Nodes Module

- [x] 2.1 Generate `NodesModule`, `NodesController`, and `NodesService`.
- [x] 2.2 Create `CreateNodeDto` and `UpdateNodeDto` with validation decorators.
- [x] 2.3 Implement `NodesService` methods: `findAll`, `findOne`, `create`, `update`, `remove`.
- [x] 2.4 Wire `NodesController` with `SupabaseGuard` for mutation endpoints.

## Phase 3: Product Catalog Module

- [x] 3.1 Generate `ProductsModule`, `ProductsController`, and `ProductsService`.
- [x] 3.2 Create `CreateProductDto` and `UpdateProductDto`.
- [x] 3.3 Implement `ProductsService` methods for CRUD operations.
- [x] 3.4 Wire `ProductsController` with appropriate guards.

## Phase 4: Verification & Testing

- [x] 4.1 Write unit tests for `NodesService`.
- [x] 4.2 Write unit tests for `ProductsService`.
- [ ] 4.3 Write E2E tests for `NodesController` (Happy Path & Unauthorized).
- [ ] 4.4 Write E2E tests for `ProductsController`.
- [ ] 4.5 Verify RLS policies manually using SQL queries.
