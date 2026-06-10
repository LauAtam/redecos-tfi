# Proposal: sprint-2-cliente-catalogo

## Intent
Implementar el flujo del cliente en la aplicación (Sprint 2 - Épica 02), asegurando la asociación obligatoria del usuario a un Nodo de Retiro, la visualización del catálogo mayorista con incentivos de ahorro minorista y la base lógica para las adhesiones a compras colectivas por producto.

## Scope

### In Scope
- **Base de Datos (Supabase)**:
  - Migración para agregar la columna `retail_price` (numeric, nullable) en la tabla `public.productos`.
  - Migración para agregar la columna `default_node_id` (uuid, FK a `nodos.id`, nullable) en la tabla `public.profiles`.
- **Backend (NestJS)**:
  - Implementación del endpoint `PATCH /profiles/me/node` para actualizar el nodo de preferencia del usuario autenticado.
  - Test unitarios en Jest para el controlador y servicio de perfiles.
- **Frontend (Angular 20 & Ionic 8)**:
  - Implementación de `NodeGuard` para redirigir a los usuarios sin nodo asignado a la pantalla de selección.
  - Implementación de la vista standalone `/pages/select-node` que lista los nodos ordenados por distancia o cantidad de participantes, con mapa interactivo de Leaflet.
  - Refactor de `HomePage` (`/home`) para el rol `CLIENTE`: header con información del nodo seleccionado y listado de productos mayoristas.
  - Tarjeta de producto que muestra el precio mayorista unitario y el incentivo de ahorro visual frente al `retail_price` de mercado.
  - Estructuración lógica de adhesiones a bulto por producto individual en lugar de un carrito convencional complejo.

### Out of Scope
- Lógica de escrow automatizada o procesamiento de pagos reales para esta fase.
- Importación masiva de catálogo desde archivos JSON/CSV (postergado para sprints futuros).
- Flujo administrativo de conciliación logística y reembolsos automáticos en DB (se gestionará como cambio de estado a nivel lógico para el MVP).

## Approach
1. **Base de Datos & Backend**: Crear las migraciones en Supabase para `profiles` y `productos`. Desarrollar el endpoint de actualización en NestJS y verificarlo con Jest.
2. **Infraestructura Angular**: Modificar `SupabaseService` para cachear el nodo del usuario y programar el `NodeGuard` en `app.routes.ts`.
3. **Flujo de Selección**: Crear la vista de selección de nodo conectada a la API de geolocalización y al mapa interactivo.
4. **Catálogo Mayorista**: Rediseñar la página principal del cliente consumiendo los productos, inyectando el cálculo de porcentaje de ahorro de forma reactiva y preparando los botones de adhesión directa.

## Affected Areas
| Area | Impact | Description |
|------|--------|-------------|
| `supabase/migrations/` | New | Scripts SQL para actualizar tablas de perfiles y productos. |
| `backend/src/profiles/` | New/Modified | Endpoint y lógica para actualizar el nodo preferido en NestJS. |
| `frontend/src/app/core/guards/` | New | `NodeGuard` para controlar el flujo obligatorio de nodo. |
| `frontend/src/app/supabase.service.ts` | Modified | Carga del nodo predeterminado en el BehaviorSubject del perfil. |
| `frontend/src/app/pages/select-node/` | New | Vista de mapa y listado social de selección de nodo. |
| `frontend/src/app/home/` | Modified | Interfaz del catálogo mayorista con visualización de ahorro y adhesiones. |

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Pérdida de precisión en geolocalización de navegador | Med | Permitir ordenamiento manual por popularidad del nodo como fallback si falla el GPS. |
| Inconsistencia de stock al cambiar de nodo | Low | La adhesión directa por producto bloquea la compra si el nodo actual no tiene el cronograma abierto. |

## Rollback Plan
Revertir los cambios en las carpetas de backend, frontend y base de datos al commit previo al inicio de este sprint.

## Success Criteria
- [ ] La base de datos tiene las columnas `retail_price` en `productos` y `default_node_id` en `profiles`.
- [ ] El endpoint `PATCH /profiles/me/node` en NestJS actualiza correctamente el nodo preferido del usuario.
- [ ] Un usuario sin nodo es redirigido obligatoriamente a `/pages/select-node` al entrar a `/home`.
- [ ] La pantalla de selección de nodos muestra la cantidad de participantes de cada nodo y los ordena por distancia/popularidad.
- [ ] El catálogo muestra el precio mayorista y el cartel informativo con el porcentaje de ahorro frente al precio minorista.
