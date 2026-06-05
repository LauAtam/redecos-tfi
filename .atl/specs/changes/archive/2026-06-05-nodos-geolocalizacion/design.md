# Diseño: Geolocalización de Nodos de Retiro (`nodos-geolocalizacion`)

Este documento detalla el enfoque técnico y la arquitectura del sistema para soportar coordenadas geográficas y mapas visuales en la gestión de nodos de retiro.

---

## 1. Decisiones de Arquitectura

| Dimensión | Opción Seleccionada | Justificación y Trade-offs |
| :--- | :--- | :--- |
| **Biblioteca de Mapas** | Leaflet Vanilla | Evita la complejidad y dependencias de wrappers como `ngx-leaflet`. Facilita el acceso directo a la API nativa de Leaflet (ej. `map.invalidateSize()`, `map.remove()`), reduciendo errores de ciclo de vida en componentes Ionic dinámicos y disminuyendo el tamaño del bundle. |
| **Tipo de Dato en BD** | `NUMERIC(9,6)` | Evita los problemas de precisión e inexactitudes de redondeo que presentan los tipos de punto flotante binario (`REAL` / `DOUBLE PRECISION`). Un formato decimal estructurado de 9 dígitos y 6 decimales ofrece una precisión exacta de ~10 centímetros. |
| **Geocodificación** | API OSM Nominatim | Servicio libre y gratuito que no requiere claves de API comerciales. Para mitigar los límites de tasa (rate-limiting) exigidos por OSM, se implementa un debounce estricto de 1s en las entradas de dirección e interacción de mapa. |

---

## 2. Flujo de Datos

El siguiente diagrama describe el flujo de geocodificación directa e inversa de ubicaciones:

```text
[Interfaz NodosPage (Angular)]
       │
       ├─► Ingreso Dirección ────► Debounce (1s) ────► API Nominatim (Search) ─────┐
       │                                                                           ▼
       └─► Clic en Mapa ─────────► Marcador Leaflet ─► API Nominatim (Reverse) ───► [Actualizar Formulario & Mapa]
                                                                                           │
                                                                                           ▼
                                                                                   [Guardar Nodo (NestJS DTO)]
                                                                                           │
                                                                                           ▼
                                                                                   [Supabase DB (NUMERIC)]
```

---

## 3. Listado de Cambios de Archivos

| Archivo | Acción | Descripción |
| :--- | :--- | :--- |
| `backend/src/nodes/dto/create-node.dto.ts` | Modificar | Agregar propiedades opcionales `latitude` y `longitude` con validaciones de tipo numérico y rangos. |
| `backend/src/nodes/dto/update-node.dto.ts` | Modificar | Asegura la herencia automática de las validaciones de coordenadas. |
| `frontend/src/app/core/models/auth.models.ts` | Modificar | Extender interfaz `Nodo` con campos opcionales `latitude?: number;` y `longitude?: number;`. |
| `frontend/src/app/pages/admin/nodos/nodos.page.ts` | Modificar | Carga de Leaflet, lógica de renderizado del mapa, invalidador de tamaño, suscripción a Nominatim con debounce, actualización síncrona del formulario, y destrucción segura en `ngOnDestroy`. |
| `frontend/src/app/pages/admin/nodos/nodos.page.html` | Modificar | Añadir contenedor `#map`, inputs numéricos de coordenadas con sus mensajes de error de validación local y el modal premium de detalle utilizando `@if`. |
| `frontend/src/app/pages/admin/nodos/nodos.page.html` | Modificar | Añadir contenedor `#map`, inputs numéricos de coordenadas con sus mensajes de error de validación local y el modal premium de detalle utilizando `@if`. |
| `frontend/src/app/pages/admin/nodos/nodos.page.scss` | Modificar | Reglas de estilo para el contenedor del mapa (alto fijo de 300px), el modal premium y la UI móvil adaptativa. |
| `frontend/src/global.scss` | Modificar | Importar estilos CSS globales de la biblioteca Leaflet (`@import "leaflet/dist/leaflet.css"`). |

---

## 4. Interfaces y Contratos de Datos

### Backend: NestJS DTO
En `backend/src/nodes/dto/create-node.dto.ts`:
```typescript
import { IsNotEmpty, IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreateNodeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  manager_name: string;

  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  longitude?: number;
}
```

### Frontend: TypeScript Model
En `frontend/src/app/core/models/auth.models.ts`:
```typescript
export interface Nodo {
  id?: string;
  name: string;
  address: string;
  manager_name: string;
  latitude?: number;
  longitude?: number;
  created_at?: string;
}
```

---

## 5. Estrategia de Pruebas

### Backend (Jest)
- **Caso 1**: Debe validar exitosamente solicitudes con coordenadas válidas (ej. `-31.4201`, `-64.1888`) y valores nulos/ausentes.
- **Caso 2**: Debe fallar la validación si la latitud es `< -90` o `> 90`.
- **Caso 3**: Debe fallar la validación si la longitud es `< -180` o `> 180`.

### Frontend (Jasmine/Karma)
- **Caso 1**: Comprobar que el control del formulario se invalide al colocar coordenadas incorrectas manualmente.
- **Caso 2**: Verificar que el temporizador aplique debounce a la consulta Nominatim.
- **Caso 3**: Asegurar que `map.remove()` sea ejecutado en `ngOnDestroy` para evitar memory leaks.

---

## 6. Plan de Migración de Base de Datos

Las sentencias SQL necesarias para aplicar las columnas e incorporar los checks de dominio en la tabla `public.nodos` de Supabase:

```sql
-- Agregar columnas para coordenadas geográficas
ALTER TABLE public.nodos 
ADD COLUMN latitude NUMERIC(9,6) NULL,
ADD COLUMN longitude NUMERIC(9,6) NULL;

-- Agregar restricciones CHECK para limitar rangos admisibles
ALTER TABLE public.nodos
ADD CONSTRAINT check_latitude CHECK (latitude >= -90.0 AND latitude <= 90.0),
ADD CONSTRAINT check_longitude CHECK (longitude >= -180.0 AND longitude <= 180.0);
```
