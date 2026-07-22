# Backlog del Sprint Actual: Redeco TFI (Actualizado)

Este archivo detalla las prioridades redefinidas para los últimos 10 días de desarrollo del TFI, priorizando funcionalidad y robustez del flujo logístico.

---

## 🚀 Tareas del Sprint (Prioridad Alta)

### 1. `WB407926-49` — Implementar pasarela de pagos, control de concurrencia y prevención de sobreventa
* **Estado**: 🟢 **Listo (Done)**
* **Acción**: Resuelto mediante bloqueo pesimista en base de datos (`SELECT FOR UPDATE` sobre la fila del producto) en la Fase 1 del flujo de compra en `prisma-buy-groups.repository.ts`. Validado y cubierto automáticamente con un test de integración E2E en Jest (`test/buy-groups-concurrency.e2e-spec.ts`).

### 2. `WB407926-52` — [Backend] Endpoints de Gestión Administrativa de Grupos
* **Estado**: 🟢 **Listo (Done)**
* **Acción**: Implementados endpoints flexibles `GET /buy-groups` y `PATCH /buy-groups/:id/status` con validaciones DTO y controles de seguridad por nodo. Cubierto con tests de integración E2E en `test/buy-groups-admin.e2e-spec.ts`.

### 3. `WB407926-54` — [Frontend] Pantalla de Consolidación y Logística para el Administrador
* **Estado**: 🟢 **Listo (Done)**
* **Acción**: Implementada la pantalla de consolidación y logística en `src/app/pages/admin/gestiones/consolidacion`. Permite filtrar y listar los grupos de compra del nodo, consolidar las unidades acumuladas de productos para comprar al mayorista, y avanzar el estado del bulto mediante botones de acción simples que sincronizan la base de datos y notifican el flujo al cliente. Totalmente migrado a Angular 17+ Control Flow.

### 4. `WB407926-59` — Implementar servicio de notificaciones simuladas por email en NestJS
* **Estado**: 🟢 **Listo (Done)**
* **Acción**: Diseñados y maquetados con HTML/CSS inline los 5 correos transaccionales (Consolidated, Shipped, Ready for Pickup, Retrieved, Cancelled por cron). Implementado el módulo de notificaciones y despachador dinámico SMTP en NestJS con fallback seguro.

---

## 📅 Backlog de Cierre (Prioridad Baja / Postergado)

### 4. `WB407926-53` — [Frontend] Dinamizar el Dashboard del Administrador y Gráficos
* **Estado**: 🟢 **Listo (Done)**
* **Acción**: Implementado el endpoint de métricas agregadas en NestJS. Integrado `Chart.js` nativo en el frontend para renderizar gráficos de ganancias (ventas), ahorros colectivos generados y distribución logística de retiros. Completada la refactorización de `SupabaseService` a `AppFacadeService` separando responsabilidades en 5 nuevos servicios de dominio.

### 5. `WB407926-50` — Testear las funcionalidades del motor de transacciones, stock y pasarela de pagos
* **Estado**: 🟡 **Postergado / Baja Prioridad**
* **Acción**: Queda para la fase final del proyecto. Priorizamos tener la funcionalidad del flujo logístico de punta a punta antes de cubrir con tests unitarios.
