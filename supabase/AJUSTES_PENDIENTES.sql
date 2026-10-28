-- =============================================================================
-- AJUSTES PENDIENTES — pegar completo en Supabase → SQL Editor → Run
--
-- Proyecto: rhiayaozcmbqxrqzxvcd
-- Preparado el 28/10/2026
--
-- QUÉ ES ESTO
-- Este archivo cubre SOLO lo que falta en la base real, detectado probando la
-- API tabla por tabla y columna por columna como rol `anon`. No lo ejecutó
-- nadie todavía: hay que correrlo a mano desde el SQL Editor.
--
-- ES SEGURO DE CORRER
-- Todo es aditivo e idempotente: usa IF NOT EXISTS / CREATE OR REPLACE /
-- DROP POLICY IF EXISTS. No borra tablas, ni filas, ni columnas. Se puede
-- correr más de una vez sin efectos distintos.
--
-- AVISO SOBRE supabase/migrations/001..004
-- Esas migraciones del repositorio describen un esquema EN INGLÉS
-- (title, description, is_active, published, tech_stack…) que NO es el que
-- está en la base. La base real está en español (titulo, descripcion, activo,
-- publicado…) y nunca se corrieron esas migraciones ahí. NO las ejecuten:
-- crearían tablas paralelas y romperían lo que ya funciona. Hay que
-- reescribirlas para que reflejen la base real; se dejaron intactas para que
-- lo decida el grupo.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. BLOQUEO DE CUENTAS
--
-- El front ya tiene la lógica para expulsar a una cuenta bloqueada, pero la
-- columna no existe, así que el bloqueo nunca se aplica. El panel de admin
-- necesita esta columna para la gestión de usuarios.
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bloqueado BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.bloqueado IS
  'TRUE = el administrador bloqueó la cuenta. El front cierra la sesión al detectarlo.';


-- -----------------------------------------------------------------------------
-- 2. CREACIÓN AUTOMÁTICA DEL PERFIL AL REGISTRARSE
--
-- Cuando alguien se registra, Supabase crea la fila en `auth.users` pero NO en
-- `public.profiles`. Sin este trigger el usuario queda sin perfil y sin rol:
-- el front cae al rol "registrado" por defecto y el panel de admin no lo ve.
--
-- Si el trigger ya existe, este bloque lo reemplaza por la misma versión.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crear_perfil_al_registrarse()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, rol)
  VALUES (
    NEW.id,
    NEW.email,
    -- El front manda el nombre en las dos claves por compatibilidad.
    COALESCE(
      NEW.raw_user_meta_data ->> 'nombre',
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(NEW.email, '@', 1)
    ),
    'registrado'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.crear_perfil_al_registrarse();


-- -----------------------------------------------------------------------------
-- 3. PERFILES HUÉRFANOS
--
-- Si alguien se registró ANTES de que existiera el trigger, no tiene perfil.
-- Esto los crea para que el panel de admin los liste.
-- -----------------------------------------------------------------------------
INSERT INTO public.profiles (id, email, nombre, rol)
SELECT
  u.id,
  u.email,
  COALESCE(
    u.raw_user_meta_data ->> 'nombre',
    u.raw_user_meta_data ->> 'full_name',
    split_part(u.email, '@', 1)
  ),
  'registrado'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;


-- -----------------------------------------------------------------------------
-- 4. COLUMNAS QUE PIDE EL REDISEÑO DE TESTIMONIOS
--
-- La tabla `testimonios` ya existe con 3 filas cargadas. Le faltan dos
-- columnas que pide el prompt de diseño: el servicio contratado (para el chip)
-- y la cantidad de estrellas.
-- -----------------------------------------------------------------------------
ALTER TABLE public.testimonios
  ADD COLUMN IF NOT EXISTS servicio TEXT,
  ADD COLUMN IF NOT EXISTS estrellas SMALLINT NOT NULL DEFAULT 5;

-- Las estrellas sólo pueden ir de 1 a 5.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'testimonios_estrellas_rango'
  ) THEN
    ALTER TABLE public.testimonios
      ADD CONSTRAINT testimonios_estrellas_rango CHECK (estrellas BETWEEN 1 AND 5);
  END IF;
END $$;

-- Completar el servicio de los testimonios que ya están cargados.
UPDATE public.testimonios SET servicio = 'Desarrollo web a medida'
  WHERE servicio IS NULL AND autor = 'Mariela Acosta';
UPDATE public.testimonios SET servicio = 'Landing pages de conversión'
  WHERE servicio IS NULL AND autor = 'Gustavo Peralta';
UPDATE public.testimonios SET servicio = 'APIs y bases de datos'
  WHERE servicio IS NULL AND autor = 'Romina Ledesma';


-- -----------------------------------------------------------------------------
-- 5. ENTREGABLES DE LOS SERVICIOS
--
-- El diseño de las tarjetas de servicio muestra 3 entregables por servicio.
-- La tabla no tiene dónde guardarlos.
-- -----------------------------------------------------------------------------
ALTER TABLE public.servicios
  ADD COLUMN IF NOT EXISTS entregables TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE public.servicios SET entregables = ARRAY[
  'Diseño responsive propio',
  'Base de datos modelada',
  'Despliegue y dominio configurados'
] WHERE slug = 'desarrollo-web-a-medida' AND cardinality(entregables) = 0;

UPDATE public.servicios SET entregables = ARRAY[
  'Una pantalla optimizada para convertir',
  'Formulario con anti-spam',
  'Medición de visitas incluida'
] WHERE slug = 'landing-pages-de-conversion' AND cardinality(entregables) = 0;

UPDATE public.servicios SET entregables = ARRAY[
  'API REST documentada',
  'Políticas de seguridad por fila (RLS)',
  'Migraciones versionadas'
] WHERE slug = 'apis-y-bases-de-datos' AND cardinality(entregables) = 0;

UPDATE public.servicios SET entregables = ARRAY[
  'Revisión de código con informe',
  'Auditoría de rendimiento y SEO',
  'Reunión de cierre con plan de acción'
] WHERE slug = 'asesoria-tecnica' AND cardinality(entregables) = 0;


-- -----------------------------------------------------------------------------
-- 6. POLÍTICAS RLS — DEJARLAS EXPLÍCITAS
--
-- Según las pruebas que hicimos contra la API, la protección YA FUNCIONA:
--   servicios / testimonios / proyectos (listado) -> legibles por anon
--   demos                                          -> 0 filas para anon
--   consultas / profiles / visitas                 -> 0 filas para anon
--   proyectos.descripcion / url_repo / cliente     -> denegadas a anon
--
-- Este bloque vuelve a declarar las políticas de lectura pública para que
-- queden versionadas en el repositorio y no dependan de lo que se haya tocado
-- a mano en el panel. Si ya existen con otro nombre, no pasa nada: se agregan
-- estas y el efecto es el mismo (basta que UNA política permita la lectura).
-- -----------------------------------------------------------------------------
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lectura_publica_servicios_activos" ON public.servicios;
CREATE POLICY "lectura_publica_servicios_activos"
  ON public.servicios FOR SELECT
  TO anon, authenticated
  USING (activo = TRUE);

DROP POLICY IF EXISTS "lectura_publica_testimonios_publicados" ON public.testimonios;
CREATE POLICY "lectura_publica_testimonios_publicados"
  ON public.testimonios FOR SELECT
  TO anon, authenticated
  USING (publicado = TRUE);

DROP POLICY IF EXISTS "lectura_publica_proyectos_publicados" ON public.proyectos;
CREATE POLICY "lectura_publica_proyectos_publicados"
  ON public.proyectos FOR SELECT
  TO anon, authenticated
  USING (publicado = TRUE);


-- -----------------------------------------------------------------------------
-- 7. EL DETALLE SIGUE SIENDO SOLO PARA USUARIOS REGISTRADOS
--
-- La consigna exige que el detalle y las demos estén cerrados del lado del
-- servidor. Hoy eso se logra con permisos POR COLUMNA: `anon` no tiene SELECT
-- sobre proyectos.descripcion, url_repo ni cliente. Estas líneas reafirman ese
-- estado para que quede escrito y no se pierda si alguien toca los permisos.
-- -----------------------------------------------------------------------------
REVOKE SELECT (descripcion, url_repo, cliente) ON public.proyectos FROM anon;
GRANT  SELECT (descripcion, url_repo, cliente) ON public.proyectos TO authenticated;

-- Las demos solo para usuarios con sesión.
ALTER TABLE public.demos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "demos_solo_registrados" ON public.demos;
CREATE POLICY "demos_solo_registrados"
  ON public.demos FOR SELECT
  TO authenticated
  USING (TRUE);


-- -----------------------------------------------------------------------------
-- 8. COMPROBACIÓN FINAL
--
-- Al terminar, esta consulta muestra cómo quedó todo. Revisar que:
--   - `profiles.bloqueado` aparezca
--   - el trigger `on_auth_user_created` aparezca
--   - haya políticas de SELECT en servicios, testimonios, proyectos y demos
-- -----------------------------------------------------------------------------
SELECT 'columna bloqueado' AS control,
       EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'bloqueado'
       )::text AS resultado
UNION ALL
SELECT 'trigger de perfil',
       EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created')::text
UNION ALL
SELECT 'perfiles sin usuario',
       (SELECT count(*)::text FROM auth.users u
        LEFT JOIN public.profiles p ON p.id = u.id WHERE p.id IS NULL)
UNION ALL
SELECT 'politicas de SELECT',
       (SELECT count(*)::text FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('servicios','testimonios','proyectos','demos')
          AND cmd = 'SELECT');
