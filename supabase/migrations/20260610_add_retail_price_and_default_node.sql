-- Agregar precio minorista de referencia en productos
ALTER TABLE public.productos 
ADD COLUMN retail_price numeric NULL;

-- Agregar referencia a nodo preferido en perfiles de usuario
ALTER TABLE public.profiles 
ADD COLUMN default_node_id uuid NULL,
ADD CONSTRAINT fk_profiles_default_node 
  FOREIGN KEY (default_node_id) 
  REFERENCES public.nodos(id) 
  ON DELETE SET NULL;
