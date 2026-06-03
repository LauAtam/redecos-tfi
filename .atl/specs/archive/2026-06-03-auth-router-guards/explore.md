# Redirección Basada en Roles y Protección de Rutas

## Estado Actual
Actualmente, el frontend implementa la redirección y el control de acceso a través de:
- **`SupabaseService`**: Al iniciar sesión mediante `login()`, intenta recuperar el perfil completo de la tabla `profiles` (`getUserProfile`) y guarda este objeto en un `BehaviorSubject` (`currentUserSubject`).
- **`LoginPage`**: En `onLogin()`, tras hacer login, lee `user.role` y redirige a `/admin` (si es `ADMIN`), `/nodo` (si es `NODO`), o `/home` (si es `CLIENTE` o default).
- **`app.routes.ts`**:
  - Las rutas de administración están agrupadas bajo el path padre `'admin'`, protegidas con `AuthGuard` and `RoleGuard`, con `data: { expectedRoles: ['ADMIN'] }`.
  - La ruta `'admin'` vacía redirige directamente a `'nodos'`.
  - No existe una página "Dashboard" para el administrador.
  - La ruta `'home'` actúa como la pantalla de bienvenida/placeholder para los demás roles.
- **`RoleGuard`**: Si hay caché en el servicio, valida el rol. Si no, realiza una consulta HTTP/gRPC (`getUserProfile`) para obtener el rol del usuario, lo cual añade latencia y ralentiza la navegación.

---

## Áreas Afectadas
- `frontend/src/app/app.routes.ts` — Modificar la estructura de `/admin` para incorporar la ruta `/admin/dashboard` y cambiar la redirección por defecto.
- `frontend/src/app/supabase.service.ts` — Extraer y priorizar el rol desde `app_metadata.role` en la sesión y asignarlo al caché local del usuario.
- `frontend/src/app/core/guards/role.guard.ts` — Ajustar el guard para leer el rol directamente desde `session.user.app_metadata.role` (sin consultar `getUserProfile` de la base de datos).
- `frontend/src/app/pages/login/login.page.ts` — Modificar la redirección post-login: `ADMIN` -> `/admin/dashboard`, y otros roles -> `/home` (placeholder de bienvenida).
- `frontend/src/app/pages/admin/dashboard` — (Nueva página) Dashboard básico para administradores con botones/tarjetas de acceso rápido a Alta de Nodos (`/admin/nodos`) y Alta de Productos (`/admin/productos`).

---

## Enfoques de Solución

### 1. Extracción en tiempo real del Token JWT (`app_metadata.role`)
El rol del usuario se lee directamente del token JWT presente en la sesión activa de Supabase en el cliente.
- **Pros**:
  - **Óptimo rendimiento**: Las transiciones de ruta no generan consultas de red adicionales a la base de datos para recuperar perfiles.
  - **Baja latencia**: Los guards se resuelven de manera inmediata.
  - **Robustez**: La sesión de Supabase ya contiene toda la información de seguridad firmada criptográficamente en el JWT.
- **Cons**:
  - Si el rol de un usuario cambia en la base de datos, el cambio no impactará al cliente inmediatamente a menos que expire el token JWT (1 hora por defecto) o el usuario vuelva a iniciar sesión. (Esto se puede solucionar forzando un refresco de sesión si es crítico).
- **Effort**: Low

### 2. Consulta y Sincronización en Base de Datos (`profiles`)
La aplicación continúa haciendo un fetch de la base de datos en cada verificación de rol o guard.
- **Pros**:
  - Refleja cambios de rol en la base de datos al instante.
- **Cons**:
  - Alta latencia y sobrecarga innecesaria en la red y base de datos durante el ruteo de la app.
- **Effort**: Medium

---

## Recomendación
Se recomienda el **Enfoque 1 (Extracción desde JWT/app_metadata.role)**.
Es el estándar moderno para arquitecturas SPA/Jamstack utilizando Supabase, ya que evita las consultas de red redundantes y asegura que la navegación sea instantánea. Además, coincide exactamente con el requerimiento del negocio.
Para implementarlo, se creará además una página de `DashboardPage` dentro del módulo de administración que centralice los accesos rápidos.

---

## Riesgos y Mitigaciones
- **Desincronización de rol**: Si el rol del administrador es revocado en caliente en la DB, el usuario podría mantener acceso temporal hasta la expiración de su token JWT.
  - *Mitigación*: En el backend, las políticas RLS y endpoints de la API validarán el JWT directamente con Supabase en cada petición HTTP, impidiendo que el usuario realice escrituras en `/nodes` o `/products` a pesar de que el frontend le muestre la interfaz.
