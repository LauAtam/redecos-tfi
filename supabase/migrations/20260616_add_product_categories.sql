-- 1. Create categories table
CREATE TABLE public.categories (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    created_at timestamp with time zone default now()
);

-- 2. Enable RLS (No policies created, as security is handled via NestJS backend using service role key)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 3. Add category_id to productos table
ALTER TABLE public.productos ADD COLUMN category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

-- 4. Insert initial categories
INSERT INTO public.categories (name) VALUES 
    ('Almacén'),
    ('Verduras'),
    ('Lácteos')
ON CONFLICT (name) DO NOTHING;

-- 5. Set default category 'Almacén' for existing products
UPDATE public.productos 
SET category_id = (SELECT id FROM public.categories WHERE name = 'Almacén')
WHERE category_id IS NULL;
