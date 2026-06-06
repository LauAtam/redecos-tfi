# Design: Sprint 1 Core Operations

## Technical Approach
Implement a modular NestJS backend that communicates with Supabase (Postgres) for data persistence. The system will follow the standard Controller-Service-Repository (via Supabase Client) pattern. RLS policies in Supabase will handle the primary authorization logic (Admin vs Public).

## Architecture Decisions

### Decision: Supabase Integration
**Choice**: Use `@supabase/supabase-js` directly within a custom `SupabaseService`.
**Alternatives considered**: Using an ORM like TypeORM or Prisma.
**Rationale**: Supabase provides a powerful, type-safe client that maps directly to RLS and existing Postgres features without the overhead of a full ORM for this stage.

### Decision: Role-Based Access Control (RBAC)
**Choice**: Leverage Supabase RLS based on JWT claims (`role` field).
**Alternatives considered**: Implementing full RBAC in NestJS via Guards and a separate database table.
**Rationale**: RLS is more robust for direct database protection and aligns with the Supabase-first approach. NestJS will provide a thin `RolesGuard` to fail fast at the API level.

## Data Flow
`Admin/User` → `NestJS Controller` → `NestJS Service` → `Supabase Client` → `Postgres (RLS)`

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/<timestamp>_init_schema.sql` | Create | Database tables and RLS policies. |
| `src/supabase/supabase.module.ts` | Create | Global module for Supabase client. |
| `src/supabase/supabase.service.ts` | Create | Service to provide the Supabase client instance. |
| `src/nodes/nodes.module.ts` | Create | Module for withdrawal nodes. |
| `src/nodes/nodes.controller.ts` | Create | HTTP endpoints for nodes. |
| `src/nodes/nodes.service.ts` | Create | Business logic and DB calls for nodes. |
| `src/nodes/dto/create-node.dto.ts` | Create | Validation for node creation. |
| `src/products/products.module.ts` | Create | Module for product catalog. |
| `src/products/products.controller.ts` | Create | HTTP endpoints for products. |
| `src/products/products.service.ts` | Create | Business logic and DB calls for products. |
| `src/products/dto/create-product.dto.ts` | Create | Validation for product creation. |

## Interfaces / Contracts

### Node Interface
```typescript
interface WithdrawalNode {
  id: string;
  name: string;
  address: string;
  manager_name: string;
  created_at: string;
}
```

### Product Interface
```typescript
interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  bulk_size: number;
  image_url?: string;
  created_at: string;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Service logic | Mock Supabase client and verify calls. |
| Integration | Controller endpoints | Use `supertest` to verify status codes and validation. |
| Security | RLS Policies | Manual verification via Supabase Dashboard/SQL and unauthorized requests. |

## Migration / Rollout
No data migration required as these are new tables. SQL migration will be applied to the Supabase project.

## Open Questions
- [ ] Should we use a specific `AuthModule` now or wait for Sprint 2? (Decision: Use a basic `SupabaseGuard` that checks the Authorization header).
