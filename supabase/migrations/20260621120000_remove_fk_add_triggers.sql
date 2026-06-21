-- Migración: Remover Foreign Key física y agregar Triggers de sincronización con auth.users

-- 1. Eliminar la Foreign Key física cruzada entre public.profiles y auth.users
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Crear función de trigger para manejar el borrado lógico en cascada
CREATE OR REPLACE FUNCTION public.handle_deleted_user()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.profiles 
  WHERE id = old.id;
  RETURN old;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear trigger de borrado en auth.users
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_deleted_user();

-- 4. Asegurar que el trigger de creación esté activo (enlace a handle_new_user)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();
