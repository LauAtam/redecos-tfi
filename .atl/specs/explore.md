## Exploration: nodos-geolocalizacion

### Current State
El sistema actual gestiona los Nodos de Retiro de la siguiente manera:
1. **Base de Datos**: La tabla `public.nodos` tiene las columnas `id`, `name`, `address`, `manager_name` y `created_at`. No posee columnas para latitud ni longitud.
2. **Backend (NestJS)**:
   - `NodesController` expone los endpoints CRUD tradicionales en `/nodes`.
   - `CreateNodeDto` y `UpdateNodeDto` validan únicamente `name`, `address` y `manager_name`.
   - `SupabaseNodesRepository` inserta y actualiza los registros directamente mapeando los DTOs.
3. **Frontend (Ionic/Angular)**:
   - La página `/admin/nodos` muestra un formulario de alta y un listado simple de nodos.
   - El formulario utiliza validaciones reactivas básicas.
   - No hay integración con mapas ni soporte para coordenadas geográficas.
   - Las iteraciones y condicionales en el HTML ya utilizan en parte la sintaxis de Angular 20, pero debe asegurarse el uso de la sintaxis moderna (`@if`, `@for`).
   - El detalle de un nodo no está implementado en un modal premium como en la sección de productos.

### Affected Areas
- `backend/src/nodes/dto/create-node.dto.ts` — Añadir propiedades `latitude` y `longitude` de tipo `number` con validaciones `@IsNumber()` y `@IsOptional()`.
- `backend/src/nodes/dto/update-node.dto.ts` — Hereda de `CreateNodeDto`, no requiere cambios manuales pero se verá afectado por las nuevas propiedades.
- `frontend/src/app/core/models/auth.models.ts` — Actualizar la interfaz `Nodo` para incluir `latitude?: number;` y `longitude?: number;`.
- `frontend/package.json` — Instalar las dependencias `leaflet` y `@types/leaflet`.
- `frontend/src/global.scss` — Importar la hoja de estilos de Leaflet (`@import 'leaflet/dist/leaflet.css'`).
- `frontend/src/app/pages/admin/nodos/nodos.page.ts` —
  - Añadir soporte para inicialización del mapa Leaflet.
  - Implementar geocodificación directa e inversa utilizando OSM Nominatim API (`fetch`).
  - Adaptar reactividad de coordenadas en el `nodoForm`.
  - Integrar lógica de edición (cargar nodo seleccionado en el formulario y centrar mapa).
  - Control de apertura/cierre y selección del nodo para el modal de detalle premium.
- `frontend/src/app/pages/admin/nodos/nodos.page.html` —
  - Incorporar el contenedor `#map` arriba de la sección de listado.
  - Actualizar el formulario y listado a la sintaxis moderna `@if` / `@for`.
  - Añadir campos de coordenadas lat/lon al formulario y botones de geocodificación.
  - Implementar el modal de detalles de nodo con estética premium.
- `frontend/src/app/pages/admin/nodos/nodos.page.scss` — Añadir estilos para el contenedor del mapa, inputs de coordenadas y el diseño premium del modal de detalles.

### Approaches
1. **Integración Directa con Leaflet (Vanilla) + Geocodificación OSM Nominatim Directa/Inversa** — Uso directo de la librería de Leaflet sin wrappers de Angular, gestionando el mapa nativamente en el ciclo de vida del componente (`ngAfterViewInit` / `ngOnDestroy`).
   - Pros:
     - Máxima compatibilidad con Angular 20 sin depender de la actualización de librerías wrapper como `ngx-leaflet`.
     - Control total del ciclo de vida del mapa y los marcadores.
     - Menor tamaño de bundle y configuración sencilla.
     - Permite usar marcadores SVG personalizados (evita problemas con rutas relativas de iconos en builds de Angular).
   - Cons:
     - Requiere gestión manual de la destrucción del mapa en `ngOnDestroy` para evitar memory leaks.
   - Effort: Low

2. **Uso de ngx-leaflet Wrapper** — Integración mediante la directiva Angular provista por `@asymmetrik/ngx-leaflet`.
   - Pros:
     - Sintaxis declarativa en el template HTML.
   - Cons:
     - Alto riesgo de incompatibilidad con la versión actual de Angular (Angular 20) y los bundles de Vite/ESBuild en Ionic 8.
     - Agrega una dependencia externa innecesaria para un caso de uso directo.
   - Effort: High

### Recommendation
Se recomienda el **Enfoque 1 (Integración Directa con Leaflet Vanilla)**. Al trabajar con Angular 20 e Ionic 8, evitar wrappers de terceros para mapas reduce el riesgo de errores de compilación y dependencias incompatibles. La integración con OSM Nominatim se realizará usando la API de `fetch` nativa del navegador para mantener consistencia con las peticiones de red del frontend. Los iconos de marcadores se implementarán utilizando SVGs inline en Leaflet (`L.divIcon`) con la paleta de colores de la marca para lograr una estética premium integrada.

### Risks
- **Políticas de Uso de Nominatim**: La API de Nominatim de OpenStreetMap tiene límites de tasa y requiere cabeceras HTTP específicas (User-Agent).
  - *Mitigación*: Se definirá una cabecera `User-Agent` clara identificando la aplicación y se gestionará un retraso o debounce en las búsquedas para no saturar el servicio.
- **Rendimiento de Renderizado del Mapa**: Inicializar el mapa en contenedores ocultos o dinámicos en Ionic puede causar problemas de dimensiones rotas.
  - *Mitigación*: Inicializar el mapa después de que el DOM esté listo (`ngAfterViewInit`) y llamar a `map.invalidateSize()` si se muestra/oculta el formulario o cambian las dimensiones del contenedor.
- **Seguridad en Escrituras**: Los nuevos campos numéricos de coordenadas deben validarse rigurosamente en el backend.
  - *Mitigación*: El backend aplicará `class-validator` con `@IsNumber()` y límites de rango realistas para latitud (-90 a 90) y longitud (-180 a 180).

### Ready for Proposal
Yes
