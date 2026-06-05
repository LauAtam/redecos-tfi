# Proposal: Geolocalización de Nodos de Retiro

## Intent (Why)
Permitir a los usuarios y administradores geolocalizar físicamente los nodos de retiro mediante coordenadas de latitud/longitud integrando mapas visuales y geocodificación OSM Nominatim.

## Scope (In/Out)
| In Scope | Out Scope |
| :--- | :--- |
| Columnas `latitude` y `longitude` en BD | Múltiples proveedores de mapas (Google Maps) |
| Validación en NestJS de coordenadas | Búsqueda por radio o distancia (geospatial query) |
| Mapa Leaflet vanilla en Ionic/Angular | Rutas de entrega entre nodos |
| Geocodificación OSM Nominatim (fetch) | Soporte offline para mapas |
| Modal premium con detalles del nodo | |

## Capabilities (New/Modified)
- **Modificación**: `public.nodos` y DTOs en NestJS aceptan `latitude` y `longitude` (NUMERIC, rango [-90, 90] y [-180, 180]).
- **Nueva**: Mapa interactivo Leaflet en vista `/admin/nodos` con selección de ubicación.
- **Nueva**: Geocodificación directa/inversa integrada vía Nominatim API.
- **Nueva**: Modal premium de detalle de nodo usando sintaxis moderna `@if`.

## Approach (How)
1. **Base de Datos & Backend**: Migración Supabase agregando columnas a `nodos`. Controladores y DTOs en NestJS actualizados con `class-validator`.
2. **Frontend Leaflet**: Instalación de `leaflet` y `@types/leaflet`. Inicialización en ciclo Angular (`ngAfterViewInit` y `ngOnDestroy`).
3. **OSM Nominatim**: Petición `fetch` directa a Nominatim con `User-Agent` personalizado e inyección de debounce.
4. **UI**: Diseño mobile-first: mapa arriba (300px), formulario/lista abajo. El detalle se despliega en modal con sintaxis `@if`.

## Affected Areas
- **Backend**: `dto/create-node.dto.ts` (Validación lat/lon), `dto/update-node.dto.ts`.
- **Frontend**: `auth.models.ts` (Interfaz `Nodo`), `package.json` (`leaflet`), `global.scss` (Estilos Leaflet), `nodos.page.ts` / `.html` / `.scss` (Lógica de mapas, geocodificación y modal).

## Risks
- **Políticas Nominatim (Límites de tasa)**: Bloqueo de API si se abusa. *Mitigación*: Debounce de 1s y User-Agent identificativo.
- **Dimensiones Leaflet rotas**: Mapa no renderiza bien en componentes Ionic dinámicos. *Mitigación*: Invocar `map.invalidateSize()` tras cargar.

## Rollback Plan
1. Ejecutar migración de rollback en Supabase para remover columnas `latitude` y `longitude`.
2. Revertir commits del backend y frontend mediante `git revert`.
3. Desinstalar `leaflet` y `@types/leaflet`.

## Success Criteria
- [ ] Migración ejecutada sin afectar registros de nodos existentes.
- [ ] Backend rechaza coordenadas fuera de rango en creación y actualización de nodos.
- [ ] Mapa Leaflet renderiza correctamente en móviles y computadoras.
- [ ] Geocodificación convierte direcciones a marcadores y viceversa de forma estable.
- [ ] El modal de detalles carga correctamente sin fugas de memoria (`map.remove()` en destroy).
