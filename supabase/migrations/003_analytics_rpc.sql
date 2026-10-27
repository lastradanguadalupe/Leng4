-- ==============================================================================
-- 003_analytics_rpc.sql
-- Funciones RPC en PostgreSQL para Métricas, Contadores y Gráficos Parametrizados
-- ==============================================================================

-- 1. RPC para registrar visita de manera segura
CREATE OR REPLACE FUNCTION public.record_visit(
    p_session_id TEXT,
    p_page_path TEXT DEFAULT '/',
    p_referrer TEXT DEFAULT NULL,
    p_ip_hash TEXT DEFAULT NULL,
    p_pais TEXT DEFAULT NULL,
    p_ciudad TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_device_type TEXT DEFAULT 'desktop',
    p_screen_res TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_auth BOOLEAN := (auth.uid() IS NOT NULL);
    v_new_id UUID;
BEGIN
    INSERT INTO public.analytics_visitas (
        session_id,
        user_id,
        is_authenticated,
        page_path,
        referrer,
        ip_hash,
        pais,
        ciudad,
        user_agent,
        device_type,
        screen_resolution,
        visited_at,
        fecha
    ) VALUES (
        p_session_id,
        v_user_id,
        v_is_auth,
        COALESCE(p_page_path, '/'),
        p_referrer,
        p_ip_hash,
        p_pais,
        p_ciudad,
        p_user_agent,
        COALESCE(p_device_type, 'desktop'),
        p_screen_res,
        timezone('utc'::text, now()),
        CURRENT_DATE
    ) RETURNING id INTO v_new_id;

    RETURN jsonb_build_object(
        'status', 'success',
        'visit_id', v_new_id,
        'is_authenticated', v_is_auth
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 2. RPC para registrar vista de proyecto
CREATE OR REPLACE FUNCTION public.record_project_view(
    p_proyecto_id UUID,
    p_session_id TEXT
)
RETURNS JSONB AS $$
BEGIN
    INSERT INTO public.project_views (
        proyecto_id,
        user_id,
        session_id,
        viewed_at,
        fecha
    ) VALUES (
        p_proyecto_id,
        auth.uid(),
        p_session_id,
        timezone('utc'::text, now()),
        CURRENT_DATE
    );

    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 3. Resumen Global de KPIs (Solo Administrador)
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_summary()
RETURNS JSONB AS $$
DECLARE
    v_total_visitas BIGINT;
    v_visitas_unicas BIGINT;
    v_visitas_auth BIGINT;
    v_total_usuarios BIGINT;
    v_total_consultas BIGINT;
    v_consultas_pendientes BIGINT;
    v_total_proyectos BIGINT;
BEGIN
    -- Verificar rol administrador
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere rol de Administrador.';
    END IF;

    SELECT COUNT(*) INTO v_total_visitas FROM public.analytics_visitas;
    SELECT COUNT(DISTINCT session_id) INTO v_visitas_unicas FROM public.analytics_visitas;
    SELECT COUNT(*) INTO v_visitas_auth FROM public.analytics_visitas WHERE is_authenticated = true;
    SELECT COUNT(*) INTO v_total_usuarios FROM public.profiles;
    SELECT COUNT(*) INTO v_total_consultas FROM public.consultas;
    SELECT COUNT(*) INTO v_consultas_pendientes FROM public.consultas WHERE estado IN ('nueva', 'en_seguimiento');
    SELECT COUNT(*) INTO v_total_proyectos FROM public.proyectos WHERE published = true;

    RETURN jsonb_build_object(
        'total_visitas', v_total_visitas,
        'visitas_unicas', v_visitas_unicas,
        'visitas_auth', v_visitas_auth,
        'visitas_anonimas', (v_total_visitas - v_visitas_auth),
        'total_usuarios', v_total_usuarios,
        'total_consultas', v_total_consultas,
        'consultas_pendientes', v_consultas_pendientes,
        'total_proyectos', v_total_proyectos
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 4. Tráfico de Visitas Parametrizado: Rango de Fechas y Agrupación (día, semana, mes)
CREATE OR REPLACE FUNCTION public.get_traffic_analytics(
    p_start_date DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
    p_end_date DATE DEFAULT CURRENT_DATE,
    p_group_by TEXT DEFAULT 'day' -- 'day', 'week', 'month'
)
RETURNS TABLE (
    periodo TEXT,
    visitas_totales BIGINT,
    visitas_autenticadas BIGINT,
    visitas_anonimas BIGINT,
    visitantes_unicos BIGINT
) AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere rol de Administrador.';
    END IF;

    RETURN QUERY
    SELECT 
        CASE 
            WHEN p_group_by = 'week' THEN to_char(date_trunc('week', fecha), 'YYYY-"W"IW')
            WHEN p_group_by = 'month' THEN to_char(date_trunc('month', fecha), 'YYYY-MM')
            ELSE to_char(fecha, 'YYYY-MM-DD')
        END AS periodo,
        COUNT(*)::BIGINT AS visitas_totales,
        COUNT(*) FILTER (WHERE is_authenticated = true)::BIGINT AS visitas_autenticadas,
        COUNT(*) FILTER (WHERE is_authenticated = false)::BIGINT AS visitas_anonimas,
        COUNT(DISTINCT session_id)::BIGINT AS visitantes_unicos
    FROM public.analytics_visitas
    WHERE fecha BETWEEN p_start_date AND p_end_date
    GROUP BY 1
    ORDER BY 1 ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 5. Distribución de Consultas Parametrizadas por Tipo y Estado
CREATE OR REPLACE FUNCTION public.get_consultas_analytics(
    p_start_date DATE DEFAULT (CURRENT_DATE - INTERVAL '90 days')::DATE,
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    tipo TEXT,
    total BIGINT,
    nuevas BIGINT,
    en_seguimiento BIGINT,
    respondidas BIGINT
) AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere rol de Administrador.';
    END IF;

    RETURN QUERY
    SELECT 
        c.tipo::TEXT,
        COUNT(*)::BIGINT AS total,
        COUNT(*) FILTER (WHERE c.estado = 'nueva')::BIGINT AS nuevas,
        COUNT(*) FILTER (WHERE c.estado = 'en_seguimiento')::BIGINT AS en_seguimiento,
        COUNT(*) FILTER (WHERE c.estado = 'respondida')::BIGINT AS respondidas
    FROM public.consultas c
    WHERE c.created_at::DATE BETWEEN p_start_date AND p_end_date
    GROUP BY c.tipo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 6. Flujo de Nuevos Registros por Período
CREATE OR REPLACE FUNCTION public.get_registrations_trend(
    p_start_date DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
    p_end_date DATE DEFAULT CURRENT_DATE,
    p_group_by TEXT DEFAULT 'day'
)
RETURNS TABLE (
    periodo TEXT,
    nuevos_usuarios BIGINT
) AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere rol de Administrador.';
    END IF;

    RETURN QUERY
    SELECT 
        CASE 
            WHEN p_group_by = 'week' THEN to_char(date_trunc('week', created_at::DATE), 'YYYY-"W"IW')
            WHEN p_group_by = 'month' THEN to_char(date_trunc('month', created_at::DATE), 'YYYY-MM')
            ELSE to_char(created_at::DATE, 'YYYY-MM-DD')
        END AS periodo,
        COUNT(*)::BIGINT AS nuevos_usuarios
    FROM public.profiles
    WHERE created_at::DATE BETWEEN p_start_date AND p_end_date
    GROUP BY 1
    ORDER BY 1 ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 7. Proyectos Más Vistos
CREATE OR REPLACE FUNCTION public.get_top_projects_analytics(
    p_limit INT DEFAULT 6
)
RETURNS TABLE (
    proyecto_id UUID,
    title VARCHAR,
    slug VARCHAR,
    thumbnail_url TEXT,
    total_views BIGINT,
    unique_viewers BIGINT
) AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere rol de Administrador.';
    END IF;

    RETURN QUERY
    SELECT 
        p.id AS proyecto_id,
        p.title,
        p.slug,
        p.thumbnail_url,
        COUNT(v.id)::BIGINT AS total_views,
        COUNT(DISTINCT v.session_id)::BIGINT AS unique_viewers
    FROM public.proyectos p
    LEFT JOIN public.project_views v ON v.proyecto_id = p.id
    GROUP BY p.id, p.title, p.slug, p.thumbnail_url
    ORDER BY total_views DESC, p.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;
