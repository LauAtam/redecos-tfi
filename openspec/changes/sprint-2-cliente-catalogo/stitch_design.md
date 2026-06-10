# Diseño de Interfaz en Stitch: Catálogo Colectivo y Grupos de Compra (Redecos)

Este documento describe la estructura y el diseño de las 3 vistas del cliente en Redecos, diseñadas específicamente para móviles, respetando la estética del Panel de Administración (colores verde `#006b4d`, azul oscuro `#002d4b` y fondo claro `#f8fafc`).

---

## Paleta de Colores y Estilos Generales
- **Fondo de Pantalla**: `#f8fafc` (Slate 50)
- **Marca Principal (Verde)**: `#006b4d` (Hover: `#00543c`)
- **Texto Principal y Headers**: `#002d4b`
- **Gris de Apoyo**: `#64748b`
- **Navbar inferior (Footer)**: Fondo blanco (`#ffffff`), borde superior fino (`#e2e8f0`), iconos con estado activo en verde y texto pequeño gris.

---

## 1. Vista: Grupos de Compra Activos (`grupos_compra.html`)
Esta vista muestra los grupos de compra que están actualmente en curso en el **Punto de Retiro** preferido del cliente.

### Estructura y Componentes:
- **Header unificado**: Título "Compras Activas" con botón de notificaciones o ayuda.
- **Selector de Punto de Retiro (Fijo)**:
  - Banner en degradado de `#006b4d` a `#004d37` con bordes redondeados (`rounded-2xl`).
  - Muestra el nombre del nodo y dirección.
  - Botón compacto para cambiar de nodo (redirecciona a `/pages/select-node`).
- **Lista de Grupos Activos (Scrollable)**:
  - Tarjetas de bultos en curso.
  - **Progreso Visual**: Una barra de progreso (`ion-progress-bar` o div estilizado con Tailwind) que indica el nivel de llenado del bulto (ej. 15 de 20 unidades).
  - **Información del Bulto**:
    - Nombre del producto (ej: "Fideos Tallarín Grano de Oro 500g").
    - Unidades faltantes para cerrar: *"Faltan 5 unidades para cerrar el bulto"*.
    - Precio unitario mayorista.
  - **Acción**: Botón "Sumar Unidades" que abre un selector de cantidad rápida (1, 2, 5, etc.) para sumarse a ese bulto abierto.

---

## 2. Vista: Productos / Iniciar Grupo (`productos_catalogo.html`)
Esta vista muestra todos los productos cargados por el administrador para que el cliente pueda iniciar un nuevo grupo de compra o sumarse a uno existente.

### Estructura y Componentes:
- **Header unificado**: Título "Iniciar Grupo".
- **Buscador y Filtro por Categorías (Fijo)**:
  - Input de búsqueda compacto y píldoras horizontales de categorías (Almacén, Verduras, Lácteos).
- **Grilla de Productos (2 columnas, Scrollable)**:
  - Tarjetas compactas con imagen (`aspect-video`), título y precio.
  - **Estado del Grupo**:
    - Si ya hay un bulto en curso para el nodo del cliente: Muestra un badge *"Grupo Activo: Faltan 8 u."* en verde.
    - Si no hay bulto en curso: Muestra un badge *"Sin grupo iniciado"* o *"Iniciar compra colectiva"*.
  - **Precios e Incentivos**:
    - Precio mayorista destacado.
    - Cantidad requerida para cerrar: *"Bulto de 12 u."*
    - Porcentaje de ahorro en rojo/gris comparado con el precio minorista.
  - **Acción**:
    - Si hay grupo activo: Botón "Sumarme" (color verde `#006b4d`).
    - Si no hay grupo activo: Botón "Iniciar Grupo" (color azul `#002d4b`).

---

## 3. Vista: Configuración del Cliente (`configuracion_cliente.html`)
Esta vista permite la gestión del perfil del cliente de forma rápida y el acceso al Punto de Retiro.

### Estructura y Componentes:
- **Header unificado**: Título "Mi Cuenta".
- **Sección Perfil**:
  - Avatar, nombre completo y correo del usuario.
- **Sección Punto de Retiro de Preferencia**:
  - Tarjeta detallada del nodo actual seleccionado con botón para cambiarlo.
- **Sección Opciones de la Cuenta**:
  - Historial de compras/retiros anteriores.
  - Ayuda y Soporte técnico.
  - Botón de "Cerrar sesión" en rojo suave (`text-red-600`).

---

## 4. Barra de Navegación Inferior (Footer Común)
Presente en las tres pantallas para navegar fácilmente:
1. **Compras Colectivas** (Icono: `cart-outline` o `people-outline` | Label: "Grupos").
2. **Productos** (Icono: `storefront-outline` o `cube-outline` | Label: "Productos").
3. **Mi Cuenta** (Icono: `person-outline` | Label: "Configuración").
