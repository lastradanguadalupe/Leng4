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
-- 8. COMPROBACIÓN PARCIAL (la completa está en la sección 10, al final)
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


-- =============================================================================
-- 9. ANALÍTICA: TABLAS Y FUNCIONES QUE NO EXISTEN
--
-- Los contadores de visitas y los cuatro gráficos del panel de administración
-- son requisitos de promoción y hoy NO funcionan: ninguna de las siete
-- funciones que llama el front existe en la base (todas devuelven 404).
-- Además la tabla `visitas` solo tiene id, session_id, pais y creado_en, así
-- que no alcanza para distinguir visitas autenticadas de anónimas.
-- =============================================================================

-- 9.a Completar la tabla de visitas ------------------------------------------
ALTER TABLE public.visitas
  ADD COLUMN IF NOT EXISTS ruta         TEXT,
  ADD COLUMN IF NOT EXISTS referente    TEXT,
  ADD COLUMN IF NOT EXISTS autenticado  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS usuario_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ciudad       TEXT,
  ADD COLUMN IF NOT EXISTS ip_hash      TEXT,
  ADD COLUMN IF NOT EXISTS dispositivo  TEXT,
  ADD COLUMN IF NOT EXISTS resolucion   TEXT;

CREATE INDEX IF NOT EXISTS visitas_creado_en_idx ON public.visitas (creado_en);
CREATE INDEX IF NOT EXISTS visitas_session_idx   ON public.visitas (session_id);

-- 9.b Tabla de vistas de proyecto -------------------------------------------
CREATE TABLE IF NOT EXISTS public.vistas_proyecto (
  id          BIGSERIAL PRIMARY KEY,
  proyecto_id BIGINT NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  session_id  TEXT NOT NULL,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Una sola vista por proyecto y sesión: si no, el contador se infla.
  CONSTRAINT vistas_proyecto_unica UNIQUE (proyecto_id, session_id)
);

CREATE INDEX IF NOT EXISTS vistas_proyecto_proyecto_idx
  ON public.vistas_proyecto (proyecto_id);

-- 9.c Registrar una visita ---------------------------------------------------
-- La firma coincide con la llamada del front (analytics.service.js).
-- SECURITY DEFINER para que un visitante anónimo pueda contar su visita sin
-- tener permiso de INSERT directo sobre la tabla.
CREATE OR REPLACE FUNCTION public.record_visit(
  p_session_id  TEXT,
  p_page_path   TEXT DEFAULT '/',
  p_referrer    TEXT DEFAULT NULL,
  p_ip_hash     TEXT DEFAULT NULL,
  p_pais        TEXT DEFAULT NULL,
  p_ciudad      TEXT DEFAULT NULL,
  p_user_agent  TEXT DEFAULT NULL,
  p_device_type TEXT DEFAULT NULL,
  p_screen_res  TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_id BIGINT;
BEGIN
  INSERT INTO public.visitas (
    session_id, ruta, referente, ip_hash, pais, ciudad,
    dispositivo, resolucion, autenticado, usuario_id
  )
  VALUES (
    p_session_id, p_page_path, p_referrer, p_ip_hash, p_pais, p_ciudad,
    p_device_type, p_screen_res, auth.uid() IS NOT NULL, auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.record_visit(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO anon, authenticated;

-- 9.d Registrar la vista de un proyecto --------------------------------------
CREATE OR REPLACE FUNCTION public.record_project_view(
  p_proyecto_id BIGINT,
  p_session_id  TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  INSERT INTO public.vistas_proyecto (proyecto_id, session_id)
  VALUES (p_proyecto_id, p_session_id)
  ON CONFLICT (proyecto_id, session_id) DO NOTHING;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.record_project_view(BIGINT, TEXT) TO anon, authenticated;

-- 9.e Solo el staff puede leer la analítica ----------------------------------
CREATE OR REPLACE FUNCTION public.es_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $func$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND rol IN ('operador', 'admin')
  );
$func$;

-- 9.f KPIs del tablero -------------------------------------------------------
-- Devuelve exactamente las claves que lee admin.js:
--   total_visitas, visitas_auth, visitas_unicas, total_usuarios, total_consultas
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_summary()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  IF NOT public.es_staff() THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  RETURN json_build_object(
    'total_visitas',   (SELECT count(*) FROM public.visitas),
    'visitas_auth',    (SELECT count(*) FROM public.visitas WHERE autenticado),
    'visitas_unicas',  (SELECT count(DISTINCT session_id) FROM public.visitas),
    'total_usuarios',  (SELECT count(*) FROM public.profiles),
    'total_consultas', (SELECT count(*) FROM public.consultas)
  );
END;
$func$;

GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_summary() TO authenticated;

-- 9.g Tráfico general vs autenticado, agrupado por día / semana / mes --------
-- Devuelve: periodo, visitas_totales, visitas_autenticadas, visitas_anonimas
CREATE OR REPLACE FUNCTION public.get_traffic_analytics(
  p_start_date DATE,
  p_end_date   DATE,
  p_group_by   TEXT DEFAULT 'day'
)
RETURNS TABLE (
  periodo              TEXT,
  visitas_totales      BIGINT,
  visitas_autenticadas BIGINT,
  visitas_anonimas     BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_unidad TEXT;
BEGIN
  IF NOT public.es_staff() THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  -- Lista blanca: `p_group_by` llega del front y nunca se interpola crudo.
  v_unidad := CASE lower(coalesce(p_group_by, 'day'))
                WHEN 'week'   THEN 'week'
                WHEN 'semana' THEN 'week'
                WHEN 'month'  THEN 'month'
                WHEN 'mes'    THEN 'month'
                ELSE 'day'
              END;

  RETURN QUERY
  SELECT
    to_char(date_trunc(v_unidad, v.creado_en), 'YYYY-MM-DD') AS periodo,
    count(*)                                                 AS visitas_totales,
    count(*) FILTER (WHERE v.autenticado)                    AS visitas_autenticadas,
    count(*) FILTER (WHERE NOT v.autenticado)                AS visitas_anonimas
  FROM public.visitas v
  WHERE v.creado_en >= p_start_date
    AND v.creado_en < (p_end_date + INTERVAL '1 day')
  GROUP BY date_trunc(v_unidad, v.creado_en)
  ORDER BY date_trunc(v_unidad, v.creado_en);
END;
$func$;

GRANT EXECUTE ON FUNCTION public.get_traffic_analytics(DATE, DATE, TEXT) TO authenticated;

-- 9.h Consultas por tipo -----------------------------------------------------
-- Devuelve: tipo, total
CREATE OR REPLACE FUNCTION public.get_consultas_analytics(
  p_start_date DATE,
  p_end_date   DATE
)
RETURNS TABLE (tipo TEXT, total BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  IF NOT public.es_staff() THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  RETURN QUERY
  SELECT c.tipo::TEXT, count(*) AS total
  FROM public.consultas c
  WHERE c.creado_en >= p_start_date
    AND c.creado_en < (p_end_date + INTERVAL '1 day')
  GROUP BY c.tipo
  ORDER BY count(*) DESC;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.get_consultas_analytics(DATE, DATE) TO authenticated;

-- 9.i Tendencia de nuevos registros ------------------------------------------
-- Devuelve: periodo, nuevos_usuarios
CREATE OR REPLACE FUNCTION public.get_registrations_trend(
  p_start_date DATE,
  p_end_date   DATE,
  p_group_by   TEXT DEFAULT 'day'
)
RETURNS TABLE (periodo TEXT, nuevos_usuarios BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_unidad TEXT;
BEGIN
  IF NOT public.es_staff() THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  v_unidad := CASE lower(coalesce(p_group_by, 'day'))
                WHEN 'week'   THEN 'week'
                WHEN 'semana' THEN 'week'
                WHEN 'month'  THEN 'month'
                WHEN 'mes'    THEN 'month'
                ELSE 'day'
              END;

  RETURN QUERY
  SELECT
    to_char(date_trunc(v_unidad, p.creado_en), 'YYYY-MM-DD') AS periodo,
    count(*)                                                AS nuevos_usuarios
  FROM public.profiles p
  WHERE p.creado_en >= p_start_date
    AND p.creado_en < (p_end_date + INTERVAL '1 day')
  GROUP BY date_trunc(v_unidad, p.creado_en)
  ORDER BY date_trunc(v_unidad, p.creado_en);
END;
$func$;

GRANT EXECUTE ON FUNCTION public.get_registrations_trend(DATE, DATE, TEXT) TO authenticated;

-- 9.j Proyectos más vistos ---------------------------------------------------
-- Devuelve: titulo, total_views  (el front lee `titulo`, en español)
CREATE OR REPLACE FUNCTION public.get_top_projects_analytics(
  p_limit INT DEFAULT 5
)
RETURNS TABLE (titulo TEXT, total_views BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  IF NOT public.es_staff() THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  RETURN QUERY
  SELECT p.titulo::TEXT, count(vp.id) AS total_views
  FROM public.proyectos p
  LEFT JOIN public.vistas_proyecto vp ON vp.proyecto_id = p.id
  GROUP BY p.id, p.titulo
  ORDER BY count(vp.id) DESC, p.titulo
  LIMIT greatest(1, least(coalesce(p_limit, 5), 50));
END;
$func$;

GRANT EXECUTE ON FUNCTION public.get_top_projects_analytics(INT) TO authenticated;

-- 9.k RLS de las tablas de analítica -----------------------------------------
ALTER TABLE public.visitas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vistas_proyecto ENABLE ROW LEVEL SECURITY;

-- Nadie lee las filas crudas desde el front: los números salen por las
-- funciones de arriba, que ya validan el rol.
DROP POLICY IF EXISTS "visitas_solo_staff" ON public.visitas;
CREATE POLICY "visitas_solo_staff"
  ON public.visitas FOR SELECT
  TO authenticated
  USING (public.es_staff());

DROP POLICY IF EXISTS "vistas_proyecto_solo_staff" ON public.vistas_proyecto;
CREATE POLICY "vistas_proyecto_solo_staff"
  ON public.vistas_proyecto FOR SELECT
  TO authenticated
  USING (public.es_staff());


-- =============================================================================
-- 10. COMPROBACIÓN FINAL (esta es la que importa)
--
-- El SQL Editor de Supabase muestra solo el resultado de la ÚLTIMA consulta,
-- así que este bloque va al final. Todas las filas deben decir "true", y
-- "perfiles sin usuario" debe dar 0.
-- =============================================================================
SELECT 'columna profiles.bloqueado' AS control,
       EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='profiles' AND column_name='bloqueado')::text AS ok
UNION ALL
SELECT 'columna visitas.autenticado',
       EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='visitas' AND column_name='autenticado')::text
UNION ALL
SELECT 'tabla vistas_proyecto',
       EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='public' AND table_name='vistas_proyecto')::text
UNION ALL
SELECT 'columna testimonios.estrellas',
       EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='testimonios' AND column_name='estrellas')::text
UNION ALL
SELECT 'columna servicios.entregables',
       EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='servicios' AND column_name='entregables')::text
UNION ALL
SELECT 'trigger on_auth_user_created',
       EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='on_auth_user_created')::text
UNION ALL
SELECT 'perfiles sin usuario (debe ser 0)',
       (SELECT count(*)::text FROM auth.users u
        LEFT JOIN public.profiles p ON p.id=u.id WHERE p.id IS NULL)
UNION ALL
SELECT 'las 7 funciones de analitica',
       (SELECT count(*)::text FROM pg_proc pr
        JOIN pg_namespace n ON n.oid = pr.pronamespace
        WHERE n.nspname='public' AND pr.proname IN (
          'record_visit','record_project_view','get_admin_dashboard_summary',
          'get_traffic_analytics','get_consultas_analytics',
          'get_registrations_trend','get_top_projects_analytics')) || ' de 7';
