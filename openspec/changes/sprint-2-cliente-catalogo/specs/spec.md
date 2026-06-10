# Specifications: sprint-2-cliente-catalogo

## 1. Database Schema Delta

### Table: `public.productos`
- **Added Column**: `retail_price`
  - **Type**: `numeric`
  - **Constraints**: `NULL` (nullable, ya que algunos productos de mercado local pueden no tener precio de góndola de referencia).

### Table: `public.profiles`
- **Added Column**: `default_node_id`
  - **Type**: `uuid`
  - **Constraints**: `NULL`, `FOREIGN KEY REFERENCES public.nodos(id) ON DELETE SET NULL`.

---

## 2. Backend Requirements (NestJS)

### Endpoint: `PATCH /profiles/me`
El backend MUST exponer un endpoint general para actualizar el perfil del usuario autenticado de forma parcial.

- **Request Headers**:
  - `Authorization: Bearer <JWT_SUPABASE>` (requerido para extraer el UID del usuario).
- **Request Body (DTO: `UpdateProfileDto`)**:
  - `first_name` (string, optional)
  - `last_name` (string, optional)
  - `default_node_id` (uuid, optional)
- **Validations**:
  - Si se proporciona `default_node_id`, el sistema MUST verificar que exista un nodo activo en la tabla `public.nodos` con ese ID. Si no existe, el sistema MUST retornar un error `400 Bad Request`.
- **Response**:
  - `200 OK` con el perfil actualizado.

---

## 3. Frontend Requirements (Angular 20 & Ionic 8)

### Requirement: Node Guard - Route Protection
El sistema MUST forzar a los usuarios con rol `CLIENTE` a seleccionar su punto de retiro antes de visualizar el catálogo de compras.

#### Scenario: Acceso a Home sin Nodo configurado
- GIVEN un usuario autenticado con el rol `CLIENTE`
- AND el perfil del usuario no tiene un `default_node_id` asignado
- WHEN intenta acceder a la ruta `/home`
- THEN el sistema MUST redirigir al usuario automáticamente a la página `/pages/select-node`

### Requirement: Node Selection Page
La vista `/pages/select-node` MUST permitir al usuario seleccionar y cambiar su nodo de retiro preferido.

#### Scenario: Visualización y Selección de Nodo
- GIVEN el usuario está en la página `/pages/select-node`
- WHEN la página carga
- THEN el sistema MUST obtener la ubicación del usuario mediante la API de Geolocalización (con fallback si es denegada)
- AND obtener el listado de nodos activos de Supabase
- AND mostrar los nodos en un mapa interactivo (Leaflet)
- AND listar los nodos ordenados por distancia o cantidad de participantes
- WHEN el usuario hace clic en "Seleccionar" en un nodo
- THEN el sistema MUST llamar al endpoint `PATCH /profiles/me` del backend para guardar el nodo preferido
- AND actualizar el `BehaviorSubject` del perfil en `SupabaseService`
- AND redirigir al usuario de regreso a la ruta `/home`

### Requirement: Catalog View with Retail Price Incentives
El catálogo del cliente en `/home` MUST mostrar los productos con su precio mayorista y el beneficio del ahorro grupal.

#### Scenario: Renderizado de Tarjeta de Producto
- GIVEN el catálogo está cargado en `/home`
- WHEN el sistema renderiza un producto
- THEN MUST mostrar el precio mayorista unitario (`price`)
- AND mostrar el tamaño del bulto cerrado (`bulk_size`)
- AND si `retail_price` está definido, calcular de forma reactiva el porcentaje de ahorro: `((retail_price - price) / retail_price) * 100`
- AND mostrar la etiqueta informativa (ej: *"¡Ahorrás un XX%!"*) con contraste accesible (WCAG Slate 700)
- AND mostrar el botón de adhesión directa (compra colectiva) para el producto.
