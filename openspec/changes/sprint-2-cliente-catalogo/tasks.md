# Tasks: sprint-2-cliente-catalogo

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 350 - 450 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Delivery strategy | single-pr |
| Chain strategy | none |

## Phase 1: Database & Backend (NestJS)
- [x] 1.1 Crear script de migración SQL en `supabase/migrations/` para agregar `retail_price` en `productos` y `default_node_id` (FK a `nodos.id`) en `profiles`.
- [x] 1.2 Crear el DTO `UpdateProfileDto` en `backend/src/profiles/dto/update-profile.dto.ts`.
- [x] 1.3 Crear `ProfilesService` en `backend/src/profiles/profiles.service.ts` implementando la validación del nodo y la actualización del perfil.
- [x] 1.4 Crear `ProfilesController` en `backend/src/profiles/profiles.controller.ts` con el endpoint `PATCH /profiles/me`.
- [x] 1.5 Crear `ProfilesModule` y registrarlo en `AppModule` (`backend/src/app.module.ts`).
- [x] 1.6 Escribir tests unitarios en Jest para `ProfilesController` y `ProfilesService`.

## Phase 2: Frontend Infrastructure (Angular & Ionic)
- [x] 2.1 Modificar la interfaz `Profile` en el frontend para incluir `default_node_id`.
- [x] 2.2 Actualizar `SupabaseService` en `frontend/src/app/supabase.service.ts` para que al obtener el perfil traiga `default_node_id`, y exponer el método `updateProfile(dto)`.
- [x] 2.3 Crear `NodeGuard` en `frontend/src/app/core/guards/node.guard.ts` (Functional Guard) para redirigir a los clientes sin nodo.
- [x] 2.4 Registrar `/pages/select-node` y asociar el `NodeGuard` a `/home` en `frontend/src/app/app.routes.ts`.

## Phase 3: Selection Page & Catalog
- [x] 3.1 Crear la página standalone `/pages/select-node` (`select-node.page.ts`, `.html`, `.scss`) con mapa de Leaflet.
- [x] 3.2 Implementar el listado de nodos ordenados por distancia (vía geolocalización) o popularidad (conteo de personas en el nodo).
- [x] 3.3 Refactorizar `HomePage` en `frontend/src/app/home/` para mostrar el header del nodo activo.
- [x] 3.4 Mostrar las tarjetas de producto en el catálogo calculando de forma reactiva el porcentaje de ahorro frente al `retail_price`.
- [x] 3.5 Escribir tests Jasmine en Karma para el `NodeGuard` y las vistas creadas.
