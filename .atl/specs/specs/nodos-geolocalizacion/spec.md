# Especificación de Comportamiento: Geolocalización de Nodos de Retiro (`nodos-geolocalizacion`)

Esta especificación detalla las reglas de comportamiento, requerimientos técnicos y escenarios de prueba (Given/When/Then) para la geolocalización física de los nodos de retiro de productos.

---

## 1. Requerimientos de Base de Datos y Backend

### REQ-BD-001: Estructura de Datos de Coordenadas
La tabla `public.nodos` de la base de datos MUST poseer columnas para almacenar la geolocalización física de cada nodo.
- Las columnas MUST ser de tipo numérico con precisión decimal adecuada (`NUMERIC` en PostgreSQL).
- La columna para almacenar la latitud MUST llamarse `latitude`.
- La columna para almacenar la longitud MUST llamarse `longitude`.
- Ambas columnas MUST permitir valores nulos (`NULL`) para soportar nodos creados sin geolocalización inicial.

### REQ-BD-002: Restricciones de Dominio de Coordenadas
La base de datos MUST validar y restringir los valores de coordenadas geográficas mediante restricciones `CHECK` en el esquema.
- El valor de la columna `latitude` MUST estar dentro de los límites inclusive `[-90.0, 90.0]`.
- El valor de la columna `longitude` MUST estar dentro de los límites inclusive `[-180.0, 180.0]`.

### REQ-BE-001: Validación de Datos de Entrada (DTOs)
El backend desarrollado en NestJS MUST validar rigurosamente las coordenadas en los endpoints de creación y actualización de nodos.
- Los DTOs `CreateNodeDto` y `UpdateNodeDto` MUST validar que `latitude` y `longitude` (cuando estén presentes) sean números decimales y cumplan con los rangos geográficos permitidos.
- Si las coordenadas recibidas no cumplen con estos rangos, el backend MUST rechazar la solicitud y retornar un código de estado HTTP `400 Bad Request` indicando el error de validación correspondiente de forma explícita.

---

## 2. Requerimientos del Frontend (Validación y Mapa Leaflet)

### REQ-FE-001: Formulario y Validación Local en Angular
El formulario de gestión de nodos en el frontend Angular/Ionic MUST validar las coordenadas de manera local antes de enviar la petición.
- El campo del formulario correspondiente a la latitud MUST validar numéricamente que el valor esté en el rango de `[-90, 90]`.
- El campo del formulario correspondiente a la longitud MUST validar numéricamente que el valor esté en el rango de `[-180, 180]`.
- Si las coordenadas ingresadas manualmente no son válidas, el control del formulario MUST marcarse como inválido y el botón para crear/actualizar el nodo MUST deshabilitarse visual y funcionalmente.

### REQ-FE-002: Renderizado e Inicialización de Mapa Leaflet
La interfaz de usuario de gestión de nodos MUST integrar un mapa Leaflet interactivo para visualizar y seleccionar ubicaciones.
- El mapa MUST renderizarse correctamente tanto en pantallas de dispositivos móviles como en computadoras de escritorio (diseño mobile-first y adaptativo).
- Tras renderizarse el contenedor del mapa, se MUST ejecutar `map.invalidateSize()` para asegurar el cálculo correcto de sus dimensiones y evitar bloques o mosaicos grises sin cargar.
- Para prevenir fugas de memoria (memory leaks), el componente Angular MUST liberar los recursos del mapa ejecutando `map.remove()` en el ciclo de vida `ngOnDestroy`.

### REQ-FE-003: Selección de Ubicación Interactiva
El usuario administrador MUST poder posicionar geográficamente un nodo mediante interacción directa con el mapa.
- Al hacer clic o tocar sobre cualquier punto del mapa, se MUST posicionar un marcador visual de Leaflet en dicha coordenada.
- Los campos de entrada de latitud y longitud del formulario en Angular MUST actualizarse automáticamente reflejando la posición exacta del marcador.
- Si se carga un nodo ya registrado que posee geolocalización, el mapa MUST inicializarse centrado en dichas coordenadas y con un marcador visible en esa posición.

---

## 3. Integración de OSM Nominatim (Geocodificación)

### REQ-API-001: Geocodificación Directa (Dirección a Coordenadas)
El sistema SHOULD autocompletar la ubicación geográfica basándose en la dirección del nodo física.
- Cuando el usuario ingrese o modifique la dirección en el campo `address`, el frontend SHOULD realizar una consulta a la API pública de OSM Nominatim para resolver las coordenadas equivalentes.
- Con el fin de cumplir las directivas de Nominatim de OSM y evitar bloqueos por abuso, el frontend MUST implementar un debounce de al menos 1 segundo (1000ms) desde la última pulsación de tecla antes de despachar la petición HTTP.
- Cada petición a la API de Nominatim MUST incluir de forma obligatoria el encabezado `User-Agent` personalizado e identificativo de la aplicación.
- Al obtener coordenadas válidas de la respuesta de geocodificación, el formulario (campos latitud/longitud) y el marcador del mapa MUST actualizarse automáticamente de forma síncrona.

### REQ-API-002: Geocodificación Inversa (Coordenadas a Dirección)
El sistema SHOULD autocompletar la dirección del nodo basándose en la interacción visual del mapa.
- Cuando el usuario mueva el marcador o haga clic en un punto del mapa Leaflet, el frontend SHOULD consultar mediante geocodificación inversa a la API de OSM Nominatim.
- Al retornar una respuesta exitosa con una dirección postal legible, el campo `address` del formulario SHOULD actualizarse con la dirección retornada.
- Esta llamada a la API MUST respetar la misma restricción de rate-limiting (debounce) y cabecera `User-Agent` definida en REQ-API-001.

---

## 4. Interfaz Gráfica y Detalle de Nodo

### REQ-UI-001: Modal Premium de Detalle de Nodo
El frontend MUST proveer una ventana modal interactiva para ver los detalles del nodo.
- El modal MUST presentar ordenadamente el nombre del nodo, la dirección física, el encargado o responsable, las coordenadas de latitud/longitud, y un visor del mapa con la ubicación fijada.
- La plantilla HTML del modal en Angular MUST utilizar la sintaxis de flujo de control moderna `@if (selectedNodo)` para gestionar el renderizado condicional del modal y sus secciones de forma limpia.

### REQ-UI-002: Mapa de Distribución en Listado
El frontend MUST renderizar un mapa Leaflet global (`listMap`) en la parte superior al ingresar a la vista de nodos.
- Este mapa MUST mostrar marcadores para todos los nodos registrados en la base de datos de Supabase.
- Si se otorgan permisos de geolocalización, el mapa MUST renderizar un marcador especial (azul) indicando la ubicación en tiempo real del usuario.

### REQ-UI-003: Ordenamiento por Proximidad
El listado de nodos MUST ordenarse dinámicamente de menor a mayor distancia respecto de la ubicación actual del usuario obtenida a través de la API de Geolocalización del navegador.
- Si la geolocalización no está activa o es rechazada, se utilizará el orden de base por defecto del listado.
- Si está activa, cada tarjeta de nodo MUST mostrar de forma clara la distancia formateada (metros o kilómetros) respecto al usuario.

---

## Escenarios de Comportamiento (Given/When/Then)

### Backend: Validaciones de Coordenadas

#### Escenario 1: Creación de Nodo con coordenadas válidas (Camino Feliz)
- **Given** que el administrador del sistema envía una solicitud para crear un nuevo nodo
- **And** la carga útil contiene latitud `-31.4201` y longitud `-64.1888`
- **When** el backend en NestJS recibe la solicitud
- **Then** el backend MUST validar exitosamente las coordenadas
- **And** MUST persistir el registro del nodo con las coordenadas provistas en la tabla `public.nodos` de Supabase
- **And** retornar una respuesta HTTP con código `201 Created` y los datos del nodo guardado.

#### Escenario 2: Rechazo de latitud fuera del límite superior admisible
- **Given** que el administrador del sistema envía una solicitud para crear un nodo
- **And** la carga útil contiene latitud `95.5` y longitud `-64.1888`
- **When** el backend en NestJS procesa la solicitud
- **Then** el backend MUST rechazar la petición
- **And** retornar una respuesta HTTP con código `400 Bad Request` indicando que la latitud no puede superar los 90 grados.

#### Escenario 3: Rechazo de longitud fuera del límite inferior admisible
- **Given** que el administrador del sistema envía una solicitud para crear un nodo
- **And** la carga útil contiene latitud `-31.4201` y longitud `-185.0`
- **When** el backend en NestJS procesa la solicitud
- **Then** el backend MUST rechazar la petición
- **And** retornar una respuesta HTTP con código `400 Bad Request` indicando que la longitud no puede ser menor a -180 grados.

---

### Frontend: Formulario e Interacción con el Mapa

#### Escenario 4: Apertura del mapa con nodo geolocalizado previamente
- **Given** que el administrador abre la vista del formulario de edición del nodo "Nodo Centro"
- **And** el nodo cuenta con latitud `-31.4172` y longitud `-64.1830` ya guardadas
- **When** se renderiza la página `/admin/nodos`
- **Then** el mapa Leaflet MUST inicializarse y situar un marcador visible en las coordenadas `-31.4172, -64.1830`
- **And** centrar la vista del mapa en esa misma posición.

#### Escenario 5: Asignación de coordenadas interactivamente mediante clic en el mapa
- **Given** que el administrador tiene el formulario de alta de nodo y el mapa interactivo en pantalla
- **When** el administrador hace clic en el mapa sobre el punto correspondiente a la latitud `-31.4250` y longitud `-64.1900`
- **Then** el mapa MUST reubicar el marcador en las coordenadas del clic
- **And** el formulario Angular MUST actualizar de inmediato sus inputs de `latitude` a `-31.4250` y `longitude` a `-64.1900`.

#### Escenario 6: Validación local del formulario ante latitud incorrecta
- **Given** que el administrador escribe manualmente el valor `100` en el input del formulario para `latitude`
- **When** el formulario evalúa el control en Angular
- **Then** el input de latitud MUST marcarse visualmente como inválido
- **And** presentarse en pantalla el mensaje de error "La latitud debe estar en el rango de -90 a 90"
- **And** deshabilitar el botón de envío para evitar el despacho del formulario.

---

### Geocodificación OSM Nominatim

#### Escenario 7: Geocodificación directa automática al escribir dirección
- **Given** que el administrador se encuentra escribiendo la dirección física del nodo
- **When** el administrador introduce la dirección "Bv. Chacabuco 500, Córdoba, Argentina"
- **And** transcurre un lapso de 1 segundo (1000ms) sin presionar ninguna tecla adicional
- **Then** el frontend en Angular MUST despachar una petición HTTP GET a la API de OSM Nominatim con la dirección codificada y el `User-Agent` personalizado
- **And** al resolverse la búsqueda con éxito, actualizar los campos del formulario de latitud/longitud y centrar el mapa en las coordenadas obtenidas colocando el marcador correspondiente.

#### Escenario 8: Evitar spam a la API Nominatim mediante control Debounce
- **Given** que el administrador escribe velozmente la dirección en el formulario
- **When** la diferencia de tiempo entre cada presumida de tecla es menor a 1 segundo (1000ms)
- **Then** el frontend MUST suprimir la llamada HTTP GET a la API Nominatim
- **And** activar el temporizador para realizar una única petición cuando cese la escritura por 1 segundo.

#### Escenario 9: Geocodificación inversa tras arrastrar/fijar marcador
- **Given** que el administrador interactúa con el mapa colocando un nuevo punto
- **When** el marcador Leaflet se posiciona en las coordenadas `-31.4201, -64.1888`
- **Then** el frontend SHOULD despachar una petición HTTP GET a la API de geocodificación inversa de Nominatim para obtener la dirección legible
- **And** al resolverse exitosamente, autocompletar el campo `address` del formulario con la dirección postal retornada.

---

### UI: Detalle de Nodo y Modal Premium

#### Escenario 10: Despliegue de modal con flujo moderno `@if`
- **Given** que la lista de nodos registrados presenta las tarjetas de información de cada uno
- **When** el administrador hace clic en el botón de visualización detallada de "Nodo Centro"
- **Then** el system MUST desplegar la ventana modal premium
- **And** la directiva `@if (selectedNodo)` de Angular MUST evaluar la presencia de la variable para instanciar y renderizar la plantilla del modal en el DOM
- **And** mostrar correctamente el mapa interactivo de Leaflet y los datos completos de nombre, dirección física, responsable y coordenadas.

#### Escenario 11: Renderizado de Mapa de Distribución con pines múltiples
- **Given** que la base de datos de Supabase posee 3 nodos geolocalizados registrados
- **When** el administrador ingresa a la página de administración `/admin/nodos`
- **Then** el sistema MUST renderizar el mapa de distribución `listMap` arriba del listado
- **And** colocar un marcador visual en el mapa por cada uno de los 3 nodos registrados.

#### Escenario 12: Ordenamiento por cercanía al activar GPS
- **Given** que el administrador otorga permisos de geolocalización al navegador
- **And** su ubicación GPS actual reportada es `-31.4200, -64.1900`
- **When** se calcula la distancia Haversine a los nodos
- **Then** el listado de nodos MUST ordenarse automáticamente mostrando primero el nodo físicamente más cercano al usuario
- **And** mostrar en la tarjeta de cada nodo la distancia formateada (metros o kilómetros).
