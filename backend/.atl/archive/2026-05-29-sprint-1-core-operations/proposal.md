# Proposal: Sprint 1 Core Operations

## Intent
Establish the foundation of the Redecos system by implementing the core entities: Withdrawal Nodes (Nodos de Retiro) and the Product Catalog. This allows administrators to manage locations and the inventory available for consumers.

## Scope

### In Scope
- Admin CRUD for Withdrawal Nodes (`nodos` table).
- Admin CRUD for Product Catalog (`productos` table).
- NestJS modules for Nodes and Products.
- Supabase table schema definition and RLS policies.
- DTOs for data validation.

### Out of Scope
- Consumer UI or frontend integration.
- Image storage implementation (only `image_url` field for now).
- Advanced search or filtering.

## Capabilities

### New Capabilities
- `withdrawal-nodes`: Management of physical points where orders are collected. Includes name, address, and manager details.
- `product-catalog`: Management of products offered in the system. Includes pricing and bulk size information.

### Modified Capabilities
- None

## Approach
- **Database**: Use Supabase (Postgres) to host the `nodos` and `productos` tables.
- **Security**: Implement Row Level Security (RLS) to restrict mutation access to users with the `ADMIN` role.
- **Backend**: Create two NestJS modules (`NodesModule`, `ProductsModule`).
- **Data Flow**:
  - `Controller` handles HTTP requests and uses `DTOs` for validation.
  - `Service` interacts with Supabase using the `supabase-js` client.
  - `Interface/Type` defines the internal data structure.

### SQL Schema (Reference)
```sql
-- Nodes Table
CREATE TABLE public.nodos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  manager_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Products Table
CREATE TABLE public.productos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  bulk_size INTEGER NOT NULL, -- Units per bulk
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.nodos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on nodos" ON public.nodos FOR SELECT USING (true);
CREATE POLICY "Allow public read access on productos" ON public.productos FOR SELECT USING (true);

CREATE POLICY "Allow admin mutations on nodos" ON public.nodos
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Allow admin mutations on productos" ON public.productos
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');
```

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/nodes/` | New | Module, Controller, Service, and DTOs for nodes. |
| `src/products/` | New | Module, Controller, Service, and DTOs for products. |
| `supabase/migrations/` | New | SQL migrations for table creation and RLS. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Missing Supabase connection | Medium | Ensure proper environment variables and client initialization. |
| Insecure RLS policies | Low | Use standard Supabase role-based policies and verify with `get_advisors`. |

## Rollback Plan
- Drop the `nodos` and `productos` tables from Supabase.
- Delete the `src/nodes/` and `src/products/` directories.

## Success Criteria
- [ ] Administrators can CREATE, READ, UPDATE, and DELETE nodes.
- [ ] Administrators can CREATE, READ, UPDATE, and DELETE products.
- [ ] Unauthorized users cannot modify data.
- [ ] All tests pass (`npm test`).
