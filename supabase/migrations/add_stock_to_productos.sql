-- Agregar columna stock con valor por defecto 0 y restricción de no negativos
ALTER TABLE public.productos 
ADD COLUMN stock INTEGER DEFAULT 0 CHECK (stock >= 0);
