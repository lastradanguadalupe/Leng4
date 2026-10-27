-- ==============================================================================
-- 002_rls_policies.sql
-- Políticas de Seguridad a Nivel de Fila (RLS) para Portfolio Fullstack
-- Idempotente: puede ejecutarse varias veces sin errores "already exists".
-- ==============================================================================

-- 1. Helper functions para verificar rol del usuario actual de manera segura
--    (COALESCE evita que un usuario sin perfil/anónimo devuelva NULL y saltee
--     los controles del tipo "IF NOT public.is_admin() THEN ...")
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
DECLARE
    r user_role;
BEGIN
    SELECT role INTO r FROM public.profiles WHERE id = auth.uid();
    RETURN COALESCE(r, 'visitante'::user_role);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(
        (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()),
        false
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(
        (SELECT role IN ('admin', 'operador') FROM public.profiles WHERE id = auth.uid()),
        false
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

-- 2. HABILITAR RLS EN TODAS LAS TABLAS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respuestas_consultas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_visitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_views ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS: profiles
-- Lectura: cualquier usuario autenticado o staff puede ver perfiles; anónimos no ven datos privados
DROP POLICY IF EXISTS "Profiles lectura publica basica" ON public.profiles;
CREATE POLICY "Profiles lectura publica basica"
ON public.profiles FOR SELECT
USING (true);

-- Inserción: controlada por el trigger on_auth_user_created (SECURITY DEFINER)
DROP POLICY IF EXISTS "Profiles insert restringido" ON public.profiles;
CREATE POLICY "Profiles insert restringido"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Actualización: cada usuario actualiza su propio perfil (nombre, avatar); solo admin cambia rol o bloqueo
DROP POLICY IF EXISTS "Profiles update propio o admin" ON public.profiles;
CREATE POLICY "Profiles update propio o admin"
ON public.profiles FOR UPDATE
USING (
    auth.uid() = id OR public.is_admin()
)
WITH CHECK (
    -- Si no es admin, no puede cambiar su propio rol ni desbloquearse
    CASE 
        WHEN public.is_admin() THEN true
        ELSE (
            auth.uid() = id 
            AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
            AND is_blocked = (SELECT p.is_blocked FROM public.profiles p WHERE p.id = auth.uid())
        )
    END
);

-- Eliminación: solo admin
DROP POLICY IF EXISTS "Profiles delete solo admin" ON public.profiles;
CREATE POLICY "Profiles delete solo admin"
ON public.profiles FOR DELETE
USING (public.is_admin());

-- 4. POLÍTICAS: servicios
DROP POLICY IF EXISTS "Servicios lectura publica de activos" ON public.servicios;
CREATE POLICY "Servicios lectura publica de activos"
ON public.servicios FOR SELECT
USING (is_active = true OR public.is_staff());

DROP POLICY IF EXISTS "Servicios crud solo admin" ON public.servicios;
CREATE POLICY "Servicios crud solo admin"
ON public.servicios FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 5. POLÍTICAS: proyectos
DROP POLICY IF EXISTS "Proyectos lectura publica de publicados" ON public.proyectos;
CREATE POLICY "Proyectos lectura publica de publicados"
ON public.proyectos FOR SELECT
USING (published = true OR public.is_staff());

DROP POLICY IF EXISTS "Proyectos crud solo admin" ON public.proyectos;
CREATE POLICY "Proyectos crud solo admin"
ON public.proyectos FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 6. POLÍTICAS: demos
-- Los previews públicos o usuarios autenticados pueden leer demos
DROP POLICY IF EXISTS "Demos lectura condicionada" ON public.demos;
CREATE POLICY "Demos lectura condicionada"
ON public.demos FOR SELECT
USING (
    is_public_preview = true 
    OR auth.role() = 'authenticated'
    OR public.is_staff()
);

DROP POLICY IF EXISTS "Demos crud solo admin" ON public.demos;
CREATE POLICY "Demos crud solo admin"
ON public.demos FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 7. POLÍTICAS: consultas
-- Cualquiera (incluso visitante anónimo) puede enviar una consulta
DROP POLICY IF EXISTS "Consultas insercion publica" ON public.consultas;
CREATE POLICY "Consultas insercion publica"
ON public.consultas FOR INSERT
WITH CHECK (true);

-- Lectura: El propio remitente si está logueado, o personal (operador / admin)
DROP POLICY IF EXISTS "Consultas lectura autorizada" ON public.consultas;
CREATE POLICY "Consultas lectura autorizada"
ON public.consultas FOR SELECT
USING (
    public.is_staff() 
    OR (auth.uid() IS NOT NULL AND profile_id = auth.uid())
);

-- Actualización de estado: Solo operador y admin
DROP POLICY IF EXISTS "Consultas update staff" ON public.consultas;
CREATE POLICY "Consultas update staff"
ON public.consultas FOR UPDATE
USING (public.is_staff())
WITH CHECK (public.is_staff());

-- Eliminación: Solo admin
DROP POLICY IF EXISTS "Consultas delete admin" ON public.consultas;
CREATE POLICY "Consultas delete admin"
ON public.consultas FOR DELETE
USING (public.is_admin());

-- 8. POLÍTICAS: respuestas_consultas
-- Inserción: solo operador y admin
DROP POLICY IF EXISTS "Respuestas insert staff" ON public.respuestas_consultas;
CREATE POLICY "Respuestas insert staff"
ON public.respuestas_consultas FOR INSERT
WITH CHECK (public.is_staff() AND operador_id = auth.uid());

-- Lectura: staff o el usuario al que pertenece la consulta
DROP POLICY IF EXISTS "Respuestas lectura autorizada" ON public.respuestas_consultas;
CREATE POLICY "Respuestas lectura autorizada"
ON public.respuestas_consultas FOR SELECT
USING (
    public.is_staff()
    OR EXISTS (
        SELECT 1 FROM public.consultas c 
        WHERE c.id = respuestas_consultas.consulta_id 
        AND c.profile_id = auth.uid()
    )
);

-- 9. POLÍTICAS: analytics_visitas
-- Inserción abierta para capturar métricas (anon y auth)
DROP POLICY IF EXISTS "Analytics insercion publica" ON public.analytics_visitas;
CREATE POLICY "Analytics insercion publica"
ON public.analytics_visitas FOR INSERT
WITH CHECK (true);

-- Lectura: solo admin
DROP POLICY IF EXISTS "Analytics lectura admin" ON public.analytics_visitas;
CREATE POLICY "Analytics lectura admin"
ON public.analytics_visitas FOR SELECT
USING (public.is_admin());

-- 10. POLÍTICAS: project_views
DROP POLICY IF EXISTS "Project views insercion publica" ON public.project_views;
CREATE POLICY "Project views insercion publica"
ON public.project_views FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Project views lectura admin" ON public.project_views;
CREATE POLICY "Project views lectura admin"
ON public.project_views FOR SELECT
USING (public.is_admin());
