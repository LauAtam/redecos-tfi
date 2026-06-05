-- Agregar columnas para coordenadas geográficas
ALTER TABLE public.nodos 
ADD COLUMN latitude NUMERIC(9,6) NULL,
ADD COLUMN longitude NUMERIC(9,6) NULL;

-- Agregar restricciones CHECK para limitar rangos admisibles
ALTER TABLE public.nodos
ADD CONSTRAINT check_latitude CHECK (latitude >= -90.0 AND latitude <= 90.0),
ADD CONSTRAINT check_longitude CHECK (longitude >= -180.0 AND longitude <= 180.0);
