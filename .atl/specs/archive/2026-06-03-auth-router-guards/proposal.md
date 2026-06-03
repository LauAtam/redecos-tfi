# Propuesta Técnica: Guards de Autenticación y Redirección por Rol

## 1. Intent (Propósito)
Optimizar la navegación y la seguridad de acceso en el frontend mediante el uso del rol embebido en el token JWT (`app_metadata.role`) de Supabase, eliminando consultas redundantes a la base de datos y mejorando la latencia de ruteo.

## 2. Scope (Alcance)
### In (Dentro de alcance):
*   Extracción del rol desde `app_metadata.role` en `SupabaseService`.
*   Optimización de `RoleGuard` para validar el rol sin consultas a la DB.
*   Creación de la página `DashboardPage` (`/admin/dashboard`) para el rol `ADMIN`.
*   Actualización de redirecciones post-login y la ruta raíz de administración.

### Out (Fuera de alcance):
*   Mapeo de permisos finos a nivel de componente.
*   Forzar la invalidación inmediata de sesiones activas ante cambios de rol en caliente (mitigado por RLS).

## 3. Capabilities (Capacidades)
*   **Acceso Instantáneo**: El ruteo valida roles localmente usando el JWT.
*   **Panel de Control Centralizado**: Acceso rápido para administradores a Alta de Nodos y Productos.

## 4. Approach (Enfoque)
*   **Enfoque Elegido**: Lectura directa de `session.user.app_metadata.role` provisto por Supabase Auth en `SupabaseService`.
*   **Cambio en Ruteo**:
    *   `/admin` ahora redirige a `/admin/dashboard` en lugar de `/admin/nodos`.
    *   `/admin/dashboard` expone botones de navegación rápida.

## 5. Affected Areas (Áreas Afectadas)
| Archivo/Componente | Tipo de Modificación |
| :--- | :--- |
| `supabase.service.ts` | Leer y cachear rol desde el JWT |
| `role.guard.ts` | Remover consulta a `profiles`, usar rol del servicio |
| `app.routes.ts` | Nueva ruta `/admin/dashboard` y ajuste de redirección |
| `login.page.ts` | Redirección de `ADMIN` a `/admin/dashboard` |
| `/pages/admin/dashboard` | Nuevo componente Angular (Dashboard) |

## 6. Risks & Mitigation
*   **Riesgo**: Desincronización temporal del rol si se cambia en la DB.
*   **Mitigación**: Supabase RLS valida el rol en cada transacción de API.

## 7. Rollback Plan
*   Revertir commits del cambio usando `git checkout main` o `git revert`.
*   Restaurar la versión previa de `RoleGuard` que consulta la tabla `profiles` si se detectan anomalías críticas con el JWT.

## 8. Success Criteria
*   Navegación entre rutas protegidas sin latencia ni peticiones HTTP a la DB.
*   Redirección correcta de administradores al dashboard tras iniciar sesión.
*   Bloqueo inmediato en el ruteo si el JWT no contiene el rol esperado.
