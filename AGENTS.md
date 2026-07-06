# Reglas y Convenciones del Proyecto: Redecos

Este documento contiene las reglas de desarrollo, arquitectura y convenciones establecidas para el Trabajo Final Integrador (TFI) **Redecos (Red de Consumo Soberano)**.

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
* **Gestión de Entornos (Dev/Prod)**: Se mantiene la sincronización de bases de datos mediante extracciones directas y ejecución manual de scripts SQL en la interfaz de Supabase. Queda desestimado el uso de Branching o flujos automatizados de CI/CD para migraciones.
* **MultiSchema y Foreign Keys**: Es obligatorio mantener la integridad referencial (Foreign Keys) hacia tablas internas de Supabase como `auth.users`. Para evitar que Prisma falle durante la introspección, se debe utilizar la característica `multiSchema` en `schema.prisma`.
* **Idioma del Esquema**: Todo el diseño de tablas, columnas y constraints se define estrictamente en **inglés** (ej. `products`, `nodos`, `profiles`).
* **Seguridad (RLS)**:
  * El Row Level Security (RLS) debe estar **activo por defecto** en todas las tablas.
  * **Optimización RLS**: Utilizar `auth.jwt() ->> 'role'` en las políticas de seguridad para filtrar directamente por el rol del usuario asignado en los metadatos de sesión, evitando cruces (joins) innecesarios con la tabla `profiles` en cada query.
* **Mutaciones**: Solo usuarios con el rol `ADMIN` pueden realizar mutaciones (Insert/Update/Delete) sobre el catálogo de productos y los nodos de retiro. Los clientes tienen acceso de lectura.

---

## 3. Frontend: Angular (v20) & Ionic (v8)
* **Formularios**: Se utiliza **estrictamente** Formularios Reactivos (`ReactiveFormsModule` con `FormBuilder` y `Validators`). Evitar el uso de Directivas de Plantilla (`ngModel`) para lógica de negocio o validaciones.
* **Componentes**: Diseñar utilizando componentes standalone de Angular e Ionic.
* **Gestión de Estado**:
  * Implementar caché en memoria con RxJS (`BehaviorSubject`) en los servicios (ej. `SupabaseService`) para el perfil del usuario autenticado.
  * Esto permite que los **Angular Functional Guards** (`AuthGuard`, `RoleGuard`, `GuestGuard`) resuelvan las redirecciones de forma síncrona y ultra veloz sin golpear la base de datos de Supabase en cada navegación.
* **Estilo y Estética (UI/UX)**:
  * **Paleta de Colores**: Verde (#006b4d) y Azul Oscuro (#002d4b) como colores principales de marca.
  * Temas: Mantener un diseño claro y limpio, saneando y eliminando selectores oscuros redundantes en `global.scss`.
  * **TailwindCSS**: Sí se utiliza en el proyecto frontend (Tailwind v4 integrado con PostCSS). Se prioriza su uso en los componentes (estilos de utilidad, espaciado, layouts) antes de definir estilos globales o ad-hoc en `global.scss`.
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
