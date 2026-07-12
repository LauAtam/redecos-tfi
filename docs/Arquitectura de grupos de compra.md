# Arquitectura y Flujo de Compras Grupales: Redecos

Este documento detalla el diseño de arquitectura, la máquina de estados y el flujo de transacciones financieras para los **Grupos de Compra Colectiva** en Redecos, adaptados a las reglas de negocio específicas del proyecto.

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
    
    OPEN --> COMPLETED : Se alcanza la cantidad objetivo (Target Size) antes de la medianoche
    OPEN --> CANCELLED : Llega la medianoche sin alcanzar el Target (Cron Job automatico)
    
    COMPLETED --> PROCESSING_ORDER : El Administrador consolida el pedido y genera la OC para el mayorista
    
    PROCESSING_ORDER --> SHIPPED : El mayorista despacha la mercadería consolidada al Nodo
    
    SHIPPED --> READY_FOR_PICKUP : El Gestor del Nodo recibe, verifica y fracciona los bultos
    
    READY_FOR_PICKUP --> FINALIZED : Todos los usuarios retiran sus compras físicas en el Nodo
    
    CANCELLED --> [*] : Pre-autorizaciones liberadas automaticamente
    FINALIZED --> [*] : Liquidaciones y comisiones del Nodo liquidadas
```

---

## 3. Mapeo y Relación de Estados (Grupo vs. Órdenes)

Para garantizar la consistencia, el ciclo de vida del grupo de compra (`buy_groups`) se sincroniza con el estado de las órdenes individuales de los clientes (`group_orders`):

| Fase Logística | Estado del Grupo (`buy_groups.status`) | Estado de las Órdenes del Cliente (`group_orders.status`) | Comportamiento / Acción Disparadora |
| :--- | :--- | :--- | :--- |
| **1. Compra Activa** | `OPEN` | `PAYMENT_HELD` | El cliente se une al grupo. Se pre-autoriza y retiene el dinero en Mercado Pago. |
| **2. Bulto Cerrado** | `COMPLETED` | `CONFIRMED` | Se alcanza el `target_size`. Se capturan en paralelo los pagos pre-autorizados y se reduce el stock. |
| **3. Pedido al Mayorista** | `PROCESSING_ORDER` | `CONFIRMED` | El Administrador consolida los bultos y procesa la compra física con el proveedor. |
| **4. En Tránsito** | `SHIPPED` | `CONFIRMED` | El proveedor despacha la mercadería consolidada hacia el Nodo. |
| **5. Recepción en Nodo** | `READY_FOR_PICKUP` | `CONFIRMED` | El Coordinador del Nodo recibe y fracciona los productos. Los clientes son notificados. |
| **6. Entrega al Cliente** | `FINALIZED` | `FINALIZED` | Retiro físico de la mercadería por parte del usuario. |

### Flujo de Cancelación y Reembolsos

Si ocurre una cancelación, el comportamiento varía según el punto en el que se encuentre el flujo:

* **Cancelación en Paso 1 (Grupo `OPEN` / Órdenes en `PAYMENT_HELD`):**
  * **Comportamiento lógico:** El grupo y sus órdenes pasan al estado `CANCELLED`.
  * **Impacto financiero:** El backend anula automáticamente la pre-autorización en Mercado Pago (`cancelPayment`). Los fondos del cliente se liberan de inmediato sin haber impactado su saldo o resumen de tarjeta. Ocurre automáticamente mediante el Cron Job a medianoche o si el administrador cancela el grupo de forma manual.
* **Cancelación en Paso 2 (Grupo `COMPLETED` / Órdenes en `CONFIRMED`):**
  * **Comportamiento lógico:** El grupo se marca como `CANCELLED`. Las órdenes en `CONFIRMED` no se modifican automáticamente a nivel de base de datos ni de Mercado Pago para evitar inconsistencias de caja.
  * **Impacto financiero:** Dado que los pagos de las órdenes en `CONFIRMED` ya fueron capturados y acreditados en la cuenta de Redecos, **cualquier cancelación posterior requiere un reembolso (Refund) manual** en la consola de Mercado Pago o la implementación futura de un flujo de devolución automatizado.

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
        B->>DB: Actualizar public.buy_groups (status='COMPLETED')
        loop Para cada comprador del grupo
            B->>P: Capturar Pago (efectivizar cobro retenido)
            P-->>B: Transaccion Aprobada (Estado: PAID)
            B->>DB: Actualizar public.group_orders (status='CONFIRMED')
        end
        B-->>A: Notificar grupo completado y cobrado en el Dashboard
    end

    %% FASE 3: EXPIRACIÓN AUTOMÁTICA A LAS 24:00 HS (Medianoche)
    Note over B, P: FASE 3: Cron Job de Expiracion a la medianoche
    loop Todos los dias a las 00.00 hs
        B->>DB: Buscar grupos en estado 'OPEN' con vencimiento cumplido
        B->>DB: Actualizar estado de los grupos a 'CANCELLED'
        loop Para cada orden en estado 'PAYMENT_HELD' de esos grupos
            B->>P: Anular Pre-Autorizacion (Liberar fondos)
            P-->>B: Retencion Liberada (Sin impacto en el limite del cliente)
            B->>DB: Actualizar public.group_orders (status='CANCELLED')
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
