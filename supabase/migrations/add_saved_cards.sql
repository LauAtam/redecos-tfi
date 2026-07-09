-- 1. Agregar columna customer_id a public.profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS customer_id VARCHAR(255);

-- 2. Crear tabla public.user_cards
CREATE TABLE IF NOT EXISTS public.user_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  card_id VARCHAR(255) NOT NULL,
  last_four VARCHAR(4) NOT NULL,
  brand VARCHAR(50) NOT NULL,
  expiration_mo INTEGER NOT NULL,
  expiration_yr INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Activar RLS en la nueva tabla
ALTER TABLE public.user_cards ENABLE ROW LEVEL SECURITY;

-- 4. Crear política RLS para permitir a usuarios autenticados gestionar sus propias tarjetas
DROP POLICY IF EXISTS "Users can manage their own cards" ON public.user_cards;
CREATE POLICY "Users can manage their own cards" ON public.user_cards
  FOR ALL TO authenticated 
  USING (auth.uid() = profile_id) 
  WITH CHECK (auth.uid() = profile_id);
