-- Create buy_groups table
CREATE TABLE public.buy_groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  node_id uuid NOT NULL REFERENCES public.nodos(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'OPEN' CONSTRAINT check_buy_groups_status CHECK (status IN ('OPEN', 'CLOSED', 'DELIVERED', 'CANCELLED')),
  target_size integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  closed_at timestamp with time zone NULL
);

-- Create group_orders table
CREATE TABLE public.group_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.buy_groups(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quantity integer NOT NULL CONSTRAINT check_group_orders_quantity CHECK (quantity > 0),
  unit_price numeric NOT NULL CONSTRAINT check_group_orders_unit_price CHECK (unit_price >= 0),
  status text NOT NULL DEFAULT 'PENDING' CONSTRAINT check_group_orders_status CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED')),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Create unique index for open groups per product & node
CREATE UNIQUE INDEX idx_unique_open_group ON public.buy_groups (product_id, node_id) WHERE status = 'OPEN';

-- Enable RLS
ALTER TABLE public.buy_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_orders ENABLE ROW LEVEL SECURITY;

-- buy_groups policies
CREATE POLICY "Allow read access for buy_groups to all authenticated"
  ON public.buy_groups
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert access for buy_groups to all authenticated"
  ON public.buy_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow admin to manage buy_groups"
  ON public.buy_groups
  FOR ALL
  TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

-- group_orders policies
CREATE POLICY "Allow users to read their own group_orders"
  ON public.group_orders
  FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid() OR
    ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text
  );

CREATE POLICY "Allow users to insert their own group_orders"
  ON public.group_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.buy_groups
      WHERE id = group_id AND status = 'OPEN'
    )
  );

CREATE POLICY "Allow users to update their own group_orders"
  ON public.group_orders
  FOR UPDATE
  TO authenticated
  USING (
    profile_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.buy_groups
      WHERE id = group_id AND status = 'OPEN'
    )
  )
  WITH CHECK (
    profile_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.buy_groups
      WHERE id = group_id AND status = 'OPEN'
    )
  );

CREATE POLICY "Allow admin to manage group_orders"
  ON public.group_orders
  FOR ALL
  TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

-- Trigger function to check group completion
CREATE OR REPLACE FUNCTION public.check_group_completion()
RETURNS TRIGGER AS $$
DECLARE
  total_qty integer;
  group_target integer;
  group_status text;
BEGIN
  SELECT target_size, status INTO group_target, group_status
  FROM public.buy_groups
  WHERE id = NEW.group_id;

  SELECT COALESCE(SUM(quantity), 0) INTO total_qty
  FROM public.group_orders
  WHERE group_id = NEW.group_id AND status != 'CANCELLED';

  IF total_qty >= group_target AND group_status = 'OPEN' THEN
    UPDATE public.buy_groups
    SET status = 'CLOSED', closed_at = now()
    WHERE id = NEW.group_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
CREATE TRIGGER trg_check_group_completion
AFTER INSERT OR UPDATE OF quantity, status ON public.group_orders
FOR EACH ROW
EXECUTE FUNCTION public.check_group_completion();
