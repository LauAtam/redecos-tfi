-- 1. Actualizar registros históricos con estados obsoletos a los estados de la nueva máquina de estados
UPDATE public.buy_groups SET status = 'FINALIZED' WHERE status = 'DELIVERED';
UPDATE public.buy_groups SET status = 'CANCELLED' WHERE status = 'CLOSED';

UPDATE public.group_orders SET status = 'CONFIRMED' WHERE status = 'DELIVERED';

-- 2. Alterar tabla public.buy_groups para añadir expires_at
ALTER TABLE public.buy_groups 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (CURRENT_DATE + TIME '23:59:59');

-- 3. Aplicar restricción de estados estricta (sin estados legacy) para buy_groups
ALTER TABLE public.buy_groups DROP CONSTRAINT IF EXISTS check_buy_groups_status;
ALTER TABLE public.buy_groups ADD CONSTRAINT check_buy_groups_status CHECK (status IN ('OPEN', 'COMPLETED', 'PROCESSING_ORDER', 'SHIPPED', 'READY_FOR_PICKUP', 'FINALIZED', 'CANCELLED'));

-- 4. Alterar tabla public.group_orders para añadir payment_intent_id
ALTER TABLE public.group_orders 
ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;

-- 5. Aplicar restricción de estados estricta (sin estados legacy) para group_orders
ALTER TABLE public.group_orders DROP CONSTRAINT IF EXISTS check_group_orders_status;
ALTER TABLE public.group_orders ADD CONSTRAINT check_group_orders_status CHECK (status IN ('PAYMENT_HELD', 'CONFIRMED', 'CANCELLED', 'PENDING'));
