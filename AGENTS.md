# Reglas y Convenciones del Proyecto: Redeco

Este documento contiene las reglas de desarrollo, arquitectura y convenciones establecidas para el Trabajo Final Integrador (TFI) **Redeco (Red de compras comunitarias.)**.

---

## 1. Convención de Commits (Git)
Adoptamos el estándar de **Conventional Commits** en español con prefijos técnicos en inglés:
* **Formato**: `<tipo-en-ingles>(<scope>): <descripción en español>`
* **Ejemplos**:
  * `feat(auth): implementar flujo de registro en dos pasos con verificación OTP`
  * `fix(api): corregir mapeo de tipo AppError en registro`
  * `docs(readme): actualizar estructura del monorepo`

---

## 2. Base de Datos & Supabase
* **Arquitectura Database-First**: Supabase (mediante su interfaz o scripts SQL crudos) es la única fuente de verdad para la estructura de la base de datos (tablas, RLS, Triggers). Prisma se utilizará **exclusivamente como cliente ORM (Query Builder)** en el backend para gestionar transacciones. No se permite el uso de `prisma migrate dev` para alterar la base de datos; las actualizaciones del esquema en Prisma se realizan mediante `prisma db pull` (Introspección).
* **Gestión de Entornos (Dev/Prod)**: Se trabaja directamente sobre la base de datos de producción (Supabase). Todas las modificaciones de esquema SQL se ejecutan de forma directa en la base de datos de producción. Queda desestimado el uso de Branching o flujos automatizados de CI/CD para migraciones.
* **MultiSchema y Foreign Keys**: Es obligatorio mantener la integridad referencial (Foreign Keys) hacia tablas internas de Supabase como `auth.users`. Para evitar que Prisma falle durante la introspección, se debe utilizar la característica `multiSchema` en `schema.prisma`.
* **Idioma del Esquema**: Todo el diseño de tablas, columnas y constraints se define estrictamente en **inglés** (ej. `products`, `nodos`, `profiles`).
* **Seguridad (RLS)**:
  * El Row Level Security (RLS) debe estar **activo por defecto** en todas las tablas.
  * **Optimización RLS**: Utilizar `auth.jwt() ->> 'role'` en las políticas de seguridad para filtrar directamente por el rol del usuario asignado en los metadatos de sesión, evitando cruces (joins) innecesarios con la tabla `profiles` en cada query.
* **Mutaciones**: Solo usuarios con el rol `ADMIN` pueden realizar mutaciones (Insert/Update/Delete) sobre el catálogo de productos y los nodos de retiro. Los clientes tienen acceso de lectura.

---

## 3. Frontend: Angular (v20) & Ionic (v8)
* **Formularios**: Se utiliza **estrictamente** Formularios Reactivos (`ReactiveFormsModule` con `FormBuilder` y `Validators`). Evitar el uso de Directivas de Plantilla (`ngModel`) para lógica de negocio o validaciones.
* **Componentes**:
  * Diseñar utilizando componentes standalone de Angular e Ionic.
  * **Sintaxis de Control Flow Nativo (Angular 17+)**: Utilizar estrictamente las directivas de control de flujo nativas (`@if`, `@else if`, `@else`, `@for`, `@switch`) en todas las plantillas HTML. Queda prohibido el uso de directivas estructurales obsoletas como `*ngIf`, `*ngFor` o `*ngSwitchCase`.
  * **Importaciones Granulares**: No importar `CommonModule` completo en componentes standalone. En su lugar, importar únicamente las clases específicas requeridas (ej: `NgClass`, `DecimalPipe`, `DatePipe`) de `@angular/common` para optimizar el bundle y mejorar el rendimiento de compilación.
* **Gestión de Estado**:
  * Implementar caché en memoria con RxJS (`BehaviorSubject`) en los servicios (ej. `SupabaseService`) para el perfil del usuario autenticado.
  * Esto permite que los **Angular Functional Guards** (`AuthGuard`, `RoleGuard`, `GuestGuard`) resuelvan las redirecciones de forma síncrona y ultra veloz sin golpear la base de datos de Supabase en cada navegación.
* **Estilo y Estética (UI/UX) - Arquitectura Híbrida (Ionic + Tailwind)**:
  * **División de Responsabilidades**:
    * **Ionic (Estructura y Comportamiento)**: Utilizar estrictamente componentes de Ionic (`ion-card`, `ion-item`, `ion-label`, `ion-badge`, etc.) para dar estructura semántica, transiciones móviles, efectos de toque y accesibilidad nativa.
    * **Tailwind (Maquetación y Estética)**: Utilizar clases de utilidad para layouts (`flex`, `grid`, `gap`), espaciados (`p-*`, `m-*`), sombras (`shadow-*`), y bordes (`rounded-*`).
  * **Integración con Shadow DOM (CSS Variables)**:
    * Evitar aplicar clases directas de Tailwind de fondo/color (ej. `bg-green-500` o `text-white`) sobre la etiqueta host de componentes web de Ionic que usan Shadow DOM. En su lugar, inyectar variables nativas de Ionic utilizando clases arbitrarias de Tailwind (ej. `class="[--background:#006b4d] [--color:#ffffff]"`).
  * **Tipografía y Especificidad**:
    * Evitar el uso de etiquetas tipográficas globales de Ionic (`h1` a `h6` y `p`) dentro de las vistas personalizadas, ya que Ionic les inyecta tamaños y line-heights gigantes difíciles de sobreescribir.
    * En su lugar, utilizar elementos neutros (`div` o `span`) estilizados con clases de Tailwind (ej. `text-xs`, `text-sm`, `text-base`, `text-lg`, `font-bold`).
    * No utilizar estilos inline con `!important` para tipografías. Si se usan elementos neutros (`div`/`span`), Tailwind aplicará los tamaños sin interferencias de Ionic.
  * **Consistencia de Espacios (Mobile-First)**:
    * Los layouts móviles deben ser compactos, limpios y densos. Evitar el aire excesivo (utilizar `gap-3`, `mb-3` o `p-3` en tarjetas).
    * Los títulos de secciones operacionales deben ser legibles pero discretos (ej. `text-xs font-bold uppercase tracking-wider text-slate-400`).
  * **Paleta de Colores**: Verde (#006b4d) y Azul Oscuro (#002d4b) como colores principales de marca.
* **Manejo de Errores**:
  * Desacoplar los componentes de la interfaz de los errores crudos de base de datos o Supabase.
  * Usar la interfaz `AppError` (`src/app/core/models/auth.models.ts`) para normalizar los errores con códigos y mensajes legibles.
  * Centralizar el mapeo de errores en `SupabaseService` y capturar excepciones imprevistas con un `GlobalErrorHandler` registrado en `app.config.ts`.

---

## 4. Backend: NestJS (v11)
* **Arquitectura**: Mantener el patrón modular nativo de NestJS (`Module`, `Controller`, `Service`).
* **Base de Datos & ORM**:
  * Utilizar exclusivamente **Prisma ORM** para toda la interacción de datos (CRUD) aplicando el **Repository Pattern**.
  * El uso del cliente HTTP nativo `@supabase/supabase-js` queda estrictamente prohibido para consultas de base de datos en el backend (solo se preservan configuraciones de JWT o roles manejados por `AuthModule` sin depender del cliente).
* **Integración con Prisma**:
  * Todos los repositorios deben inyectar el `PrismaService`.
  * La configuración de pooling (Transaction pooler `DATABASE_URL` y Session pooler `DIRECT_URL`) se debe manejar a través de variables de entorno e integrarse de forma nativa en `schema.prisma`, asegurando compatibilidad total con Prisma v6.
* **Validación**: Usar NestJS DTOs con `PartialType` de `@nestjs/mapped-types` para simplificar y sanitizar los payloads de actualización parcial.

---

## 5. Metodología de Desarrollo y QA
* **TDD Estricto (`strict_tdd: true`)**: Al existir configuraciones de pruebas en ambos proyectos, se requiere escribir pruebas automatizadas para cualquier nueva lógica de negocio implementada.
  * **Backend**: Jest
  * **Frontend**: Jasmine / Karma

---

## 6. Integración con Mercado Pago
* **Entorno de Producción Directo**: Queda estrictamente establecido que **NUNCA** se utiliza el entorno Sandbox de Mercado Pago en este proyecto debido a fallos estructurales e inestabilidad del servicio de pruebas de MP. En su lugar, se opera directamente con credenciales de producción para realizar las validaciones y mutaciones de pago reales.

---

## 7. Nomenclatura y Marca (Branding)
* **Nombre Oficial**: El nombre exclusivo de la plataforma y del proyecto es **Redeco** (en singular, sin 's' final).
* **Significado y Concepto**: **Redeco – Red de compras comunitarias**. La palabra *comunitarias* explica que los usuarios se unen con vecinos de su zona para consolidar el bulto mayorista.
* **Regla Estricta**: Queda estrictamente prohibido utilizar el término "Redecos" (con 's') en cualquier parte del proyecto (código, interfaz de usuario, títulos, meta-etiquetas, comentarios, correos o documentación). Se debe usar siempre **Redeco**.
