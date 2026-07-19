# Arquitectura y Flujo de Compras Grupales: Redeco

Este documento detalla el diseño de arquitectura, la máquina de estados y el flujo de transacciones financieras para los **Grupos de Compra Colectiva** en Redeco, adaptados a las reglas de negocio específicas del proyecto.

---

## 1. Reglas de Negocio Clave

1. **Creación por Demanda del Cliente**: El administrador no crea los grupos manualmente. Cuando un cliente selecciona un producto en su Nodo de Retiro y **no existe un grupo activo (OPEN)** para ese par (Producto - Nodo), el sistema crea automáticamente un nuevo grupo en estado `OPEN`.
2. **Congelamiento de Precios (Vencimiento Diario)**: Todos los grupos creados expiran de forma automática a las **24.00 hs (medianoche) del mismo día**. Esto simula la convención mayorista de congelamiento de precios por 24 horas.
3. **Cancelación Automática**: A medianoche, un proceso en segundo plano (Cron Job) cancela automáticamente todos los grupos que no llegaron a su `target_size`, liberando las pre-autorizaciones de cobro de forma inmediata sin intervención humana.
4. **Consolidación y Orden de Compra**: Cuando un grupo alcanza su `target_size`, se marca como `COMPLETED` y se efectiviza la captura del cobro de todos los integrantes. Posteriormente, el Administrador interviene para consolidar todos los grupos completados de un Nodo y generar la **Orden de Compra Unificada** para enviar al mayorista.

---

## 2. Máquina de Estados de los Grupos de Compra (`buy_groups`)

El ciclo de vida del grupo de compra colectiva refleja las automatizaciones y restricciones horarias definidas:

```mermaid
stateDiagram-v2
    [*] --> OPEN : El Cliente inicia la compra de un producto sin grupo activo en su Nodo
    
    OPEN --> COMPLETED : Se alcanza la cantidad objetivo Target Size y todas las capturas de pago son exitosas
    OPEN --> OPEN : Falla parcial de capturas en consolidación Auto-reapertura por orden cancelada
    OPEN --> CANCELLED : Llega la medianoche sin alcanzar el Target Cron Job automático
    
    COMPLETED --> PROCESSING_ORDER : El Administrador consolida el pedido y genera la OC para el mayorista
    
    PROCESSING_ORDER --> SHIPPED : El mayorista despacha la mercadería consolidada al Nodo
    
    SHIPPED --> READY_FOR_PICKUP : El Gestor del Nodo recibe, verifica y fracciona los bultos
    
    READY_FOR_PICKUP --> FINALIZED : Todos los usuarios retiran sus compras físicas en el Nodo
    
    CANCELLED --> [*] : Pre-autorizaciones liberadas automáticamente Held y Confirmed reembolsados
    FINALIZED --> [*] : Liquidaciones y comisiones del Nodo liquidadas

```

---

## 3. Mapeo y Relación de Estados (Grupo vs. Órdenes)

Para garantizar la consistencia, el ciclo de vida del grupo de compra (`buy_groups`) se sincroniza con el estado de las órdenes individuales de los clientes (`group_orders`):

| Fase Logística | Estado del Grupo (`buy_groups.status`) | Estado de las Órdenes del Cliente (`group_orders.status`) | Comportamiento / Acción Disparadora |
| :--- | :--- | :--- | :--- |
| **1. Compra Activa** | `OPEN` | `PAYMENT_HELD` / `PENDING` | El cliente se une al grupo. Se reserva stock temporal (`PENDING`) y al autorizarse el pago en MP pasa a `PAYMENT_HELD`. |
| **2. Bulto Cerrado** | `COMPLETED` | `CONFIRMED` / `CANCELLED` | Se alcanza el `target_size`. Se capturan los fondos en MP de forma diferida. Las órdenes capturadas pasan a `CONFIRMED`. **Si la captura del pago falla, la orden pasa a `CANCELLED`**. |
| **3. Pedido al Mayorista** | `PROCESSING_ORDER` | `CONFIRMED` | El Administrador consolida los bultos y procesa la compra física con el proveedor. |
| **4. En Tránsito** | `SHIPPED` | `CONFIRMED` | El proveedor despacha la mercadería consolidada hacia el Nodo. |
| **5. Recepción en Nodo** | `READY_FOR_PICKUP` | `CONFIRMED` | El Coordinador del Nodo recibe y fracciona los productos. Los clientes son notificados. |
| **6. Entrega al Cliente** | `FINALIZED` | `FINALIZED` | Retiro físico de la mercadería por parte del usuario. |
| **—** | `CANCELLED` | `CANCELLED` | El grupo expira o es cancelado por el administrador. Se liberan los fondos de pre-autorización en Mercado Pago. |

### Flujo de Cancelación y Reembolsos

Si ocurre una cancelación o falla de cobro, el comportamiento varía según el punto en el que se encuentre el flujo:

* **Falla de Captura en Consolidación (Fase 2 - Cierre de Bulto):**
  * **Comportamiento lógico:** Al cerrarse el grupo, el backend intenta capturar los fondos retenidos de todas las órdenes asociadas. Si el banco o Mercado Pago rechazan la captura del pago de un cliente (ej. por fondos insuficientes, sospecha de fraude o límite excedido), la orden pasa automáticamente al estado `CANCELLED`.
  * **Impacto financiero:** El dinero retenido en pre-autorización se libera automáticamente en la tarjeta del cliente y este no ve impactado su saldo, al tiempo que su reserva se anula en la base de datos.
* **Cancelación en Paso 1 (Grupo `OPEN` / Órdenes en `PAYMENT_HELD`):**
  * **Comportamiento lógico:** El grupo y sus órdenes pasan al estado `CANCELLED`.
  * **Impacto financiero:** El backend anula automáticamente la pre-autorización en Mercado Pago (`cancelPayment`). Los fondos del cliente se liberan de inmediato sin haber impactado su saldo o resumen de tarjeta. Ocurre automáticamente mediante el Cron Job a medianoche o si el administrador cancela el grupo de forma manual.
* **Cancelación en Paso 2 (Grupo `COMPLETED` / Órdenes en `CONFIRMED`):**
  * **Comportamiento lógico:** El grupo se marca como `CANCELLED`. Las órdenes en `CONFIRMED` no se modifican automáticamente a nivel de base de datos ni de Mercado Pago para evitar inconsistencias de caja.
  * **Impacto financiero:** Dado que los pagos de las órdenes en `CONFIRMED` ya fueron capturados y acreditados en la cuenta de Redeco, **cualquier cancelación posterior requiere un reembolso (Refund) manual** en la consola de Mercado Pago o la implementación futura de un flujo de devolución automatizado.

---

## 4. Flujo Secuencial de Transacciones y Retención de Pagos

El siguiente diagrama detalla cómo interactúan los actores en el sistema, haciendo foco en la creación automática por el comprador y la expiración automática a medianoche controlada por el backend.

```mermaid
sequenceDiagram
    autonumber
    actor C as Comprador
    participant F as Frontend (Angular)
    participant B as Backend (NestJS)
    participant P as Pasarela de Pagos (MercadoPago)
    participant DB as Base de Datos (Supabase)
    actor A as Administrador

    %% FASE 1: CREACIÓN AUTOMÁTICA Y UNIÓN
    Note over C, DB: FASE 1: Creación automatica por Demanda y Retencion de Pago (Grupo OPEN)
    C->>F: Selecciona producto en su Nodo de Retiro
    F->>B: GET /buy-groups/active?productId=X&nodeId=Y
    B->>DB: Consultar grupo OPEN activo
    
    alt No existe grupo activo para ese producto en ese Nodo
        B->>DB: Crear nuevo public.buy_groups (status='OPEN', vencimiento=hoy 23.59.59)
    end
    
    C->>F: Confirma cantidad de unidades a comprar
    F->>B: POST /buy-groups/join (groupId, quantity)
    B->>P: Crear Pre-Autorizacion de Pago (capture=false)
    P-->>B: ID de Transaccion Temporal (Estado: AUTHORIZED / HELD)
    B->>DB: Registrar orden en public.group_orders (status='PAYMENT_HELD')
    B-->>F: Confirmacion de union al grupo
    F-->>C: Muestra "Pago retenido temporalmente - Grupo activo hasta la medianoche"

    %% FASE 2: COMPLETITUD Y COBRO AUTOMÁTICO
    Note over B, DB: FASE 2: Completitud del Grupo (Dentro del dia)
    alt Se alcanza el Target Size
        DB->>B: Trigger: Suma de unidades = Target Size
        loop Para cada comprador del grupo (solo en PAYMENT_HELD)
            B->>P: Capturar Pago (efectivizar cobro retenido)
            alt Captura Exitosa
                P-->>B: Transaccion Aprobada
                B->>DB: Actualizar public.group_orders (status='CONFIRMED')
            else Captura Fallida
                P-->>B: Transaccion Rechazada
                B->>DB: Actualizar public.group_orders (status='CANCELLED')
            end
        end
        alt Todas las capturas exitosas
            B->>DB: Actualizar public.buy_groups (status='COMPLETED')
            B-->>A: Notificar grupo completado en el Dashboard
        else Al menos una captura falló
            B->>DB: Grupo permanece en status='OPEN' (Auto-reapertura para nuevos compradores)
        end
    end

    %% FASE 3: EXPIRACIÓN AUTOMÁTICA A LAS 24:00 HS (Medianoche)
    Note over B, P: FASE 3: Cron Job de Expiracion a la medianoche
    loop Todos los dias a las 00.00 hs
        B->>DB: Buscar grupos en estado 'OPEN' con vencimiento cumplido
        B->>DB: Actualizar estado de los grupos a 'CANCELLED'
        loop Para cada orden de esos grupos
            alt Orden en status='PAYMENT_HELD'
                B->>P: Anular Pre-Autorizacion (Liberar fondos)
                P-->>B: Retencion Liberada (Sin impacto en resumen del cliente)
                B->>DB: Actualizar public.group_orders (status='CANCELLED')
            else Orden en status='CONFIRMED'
                B->>P: Reembolsar Pago (Refund)
                P-->>B: Dinero devuelto a la cuenta/tarjeta del cliente
                B->>DB: Actualizar public.group_orders (status='CANCELLED')
            end
        end
    end

    %% FASE 4: CONSOLIDACIÓN POR EL ADMINISTRADOR
    Note over A, B: FASE 4: Consolidacion de Pedidos del Nodo
    A->>F: Selecciona grupos 'COMPLETED' de un Nodo
    F->>B: POST /admin/nodes/:nodeId/consolidate-orders
    B->>DB: Cambiar estado de grupos a 'PROCESSING_ORDER'
    B-->>F: Generar orden de compra consolidada en PDF para el mayorista
    F-->>A: Muestra resumen de transferencia consolidada a mayorista
```

---

## 5. Beneficios del Diseño para Presentar ante la Reunión

* **Experiencia de Usuario Dinámica**: Los grupos se crean orgánicamente por el consumo real, evitando que el administrador deba crear grupos vacíos manualmente.
* **Respeto a las Reglas del Mayorista**: El vencimiento automático a medianoche se alinea a la perfección con la volatilidad de precios en Argentina y el congelamiento diario que exigen los proveedores mayoristas.
* **Cero Carga Operativa**: Las cancelaciones y reembolsos corren solos en segundo plano a las 00.00 hs. El administrador solo entra al sistema cuando hay dinero real cobrado y bultos consolidados listos para comprar.
* **Eficiencia Financiera**: Al automatizar la captura diferida de MercadoPago únicamente cuando el trigger de base de datos detecta que el grupo llegó a `COMPLETED`, reducimos el riesgo de contra-cargos y cancelaciones manuales.
