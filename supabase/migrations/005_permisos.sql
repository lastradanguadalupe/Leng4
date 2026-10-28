-- ==============================================================================
-- supabase/migrations/005_permisos.sql
-- Permisos de tablas, columnas y funciones
--
-- Parte de cero (REVOKE) y concede solo lo necesario a anon y authenticated.
-- Los permisos por columna son la base de que `proyectos.descripcion`,
-- `url_repo` y `cliente` no los vea un visitante sin sesión.
--
-- Generada a partir del esquema real del proyecto (introspección de pg_catalog),
-- no del esquema en inglés de la primera versión del repositorio.
-- ==============================================================================

-- Tablas y vistas. Es el reparto por defecto de Supabase: anon y authenticated
-- reciben el permiso de tabla y quien filtra es RLS (004). La excepción es
-- `proyectos`, donde anon no tiene SELECT de tabla, solo de columnas.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
GRANT REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.accesos TO anon;
GRANT REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.accesos TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.config_sitio TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.config_sitio TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.consultas TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.consultas TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.demos TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.demos TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.faqs TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.faqs TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.profiles TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.profiles TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.proyecto_imagenes TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.proyecto_imagenes TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.proyecto_tecnologias TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.proyecto_tecnologias TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON public.proyectos TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.proyectos TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.proyectos_publicos TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.proyectos_publicos TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.respuestas TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.respuestas TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.servicios TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.servicios TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.storage_huerfanos TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.storage_huerfanos TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.tecnologias TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.tecnologias TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.testimonios TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.testimonios TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.trayectoria TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.trayectoria TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.visitas TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.visitas TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.vistas_proyecto TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.vistas_proyecto TO authenticated;

-- Columnas
-- anon solo lee las columnas públicas de `proyectos`; las de detalle
-- (descripcion, cliente, url_repo) las lee solo quien tenga sesión.
-- authenticated solo puede actualizar `estado` en `consultas`.
GRANT UPDATE (estado) ON public.consultas TO authenticated;
GRANT SELECT (id, titulo, slug, resumen, imagen_portada, anio, categoria, destacado, publicado, orden, creado_en) ON public.proyectos TO anon;
GRANT SELECT (descripcion, cliente, url_repo) ON public.proyectos TO authenticated;

-- Funciones
REVOKE ALL ON FUNCTION public.crear_perfil_al_registrarse() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crear_perfil_al_registrarse() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.crear_perfil_al_registrarse() TO anon;
GRANT EXECUTE ON FUNCTION public.crear_perfil_al_registrarse() TO authenticated;
REVOKE ALL ON FUNCTION public.es_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.es_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.es_admin() TO authenticated;
REVOKE ALL ON FUNCTION public.es_operador() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.es_operador() TO anon;
GRANT EXECUTE ON FUNCTION public.es_operador() TO authenticated;
REVOKE ALL ON FUNCTION public.es_staff() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.es_staff() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.es_staff() TO anon;
GRANT EXECUTE ON FUNCTION public.es_staff() TO authenticated;
REVOKE ALL ON FUNCTION public.exigir_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.exigir_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.exigir_admin() TO authenticated;
REVOKE ALL ON FUNCTION public.exigir_operador() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.exigir_operador() TO anon;
GRANT EXECUTE ON FUNCTION public.exigir_operador() TO authenticated;
REVOKE ALL ON FUNCTION public.get_admin_dashboard_summary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_summary() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_summary() TO anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_summary() TO authenticated;
REVOKE ALL ON FUNCTION public.get_consultas_analytics(p_start_date date, p_end_date date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_consultas_analytics(p_start_date date, p_end_date date) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_consultas_analytics(p_start_date date, p_end_date date) TO anon;
GRANT EXECUTE ON FUNCTION public.get_consultas_analytics(p_start_date date, p_end_date date) TO authenticated;
REVOKE ALL ON FUNCTION public.get_registrations_trend(p_start_date date, p_end_date date, p_group_by text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_registrations_trend(p_start_date date, p_end_date date, p_group_by text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_registrations_trend(p_start_date date, p_end_date date, p_group_by text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_registrations_trend(p_start_date date, p_end_date date, p_group_by text) TO authenticated;
REVOKE ALL ON FUNCTION public.get_top_projects_analytics(p_limit integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_projects_analytics(p_limit integer) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_top_projects_analytics(p_limit integer) TO anon;
GRANT EXECUTE ON FUNCTION public.get_top_projects_analytics(p_limit integer) TO authenticated;
REVOKE ALL ON FUNCTION public.get_traffic_analytics(p_start_date date, p_end_date date, p_group_by text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_traffic_analytics(p_start_date date, p_end_date date, p_group_by text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_traffic_analytics(p_start_date date, p_end_date date, p_group_by text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_traffic_analytics(p_start_date date, p_end_date date, p_group_by text) TO authenticated;
REVOKE ALL ON FUNCTION public.manejar_usuario_nuevo() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manejar_usuario_nuevo() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.manejar_usuario_nuevo() TO anon;
GRANT EXECUTE ON FUNCTION public.manejar_usuario_nuevo() TO authenticated;
REVOKE ALL ON FUNCTION public.record_project_view(p_proyecto_id bigint, p_session_id text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_project_view(p_proyecto_id bigint, p_session_id text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_project_view(p_proyecto_id bigint, p_session_id text) TO anon;
GRANT EXECUTE ON FUNCTION public.record_project_view(p_proyecto_id bigint, p_session_id text) TO authenticated;
REVOKE ALL ON FUNCTION public.record_visit(p_session_id text, p_page_path text, p_referrer text, p_ip_hash text, p_pais text, p_ciudad text, p_user_agent text, p_device_type text, p_screen_res text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_visit(p_session_id text, p_page_path text, p_referrer text, p_ip_hash text, p_pais text, p_ciudad text, p_user_agent text, p_device_type text, p_screen_res text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_visit(p_session_id text, p_page_path text, p_referrer text, p_ip_hash text, p_pais text, p_ciudad text, p_user_agent text, p_device_type text, p_screen_res text) TO anon;
GRANT EXECUTE ON FUNCTION public.record_visit(p_session_id text, p_page_path text, p_referrer text, p_ip_hash text, p_pais text, p_ciudad text, p_user_agent text, p_device_type text, p_screen_res text) TO authenticated;
REVOKE ALL ON FUNCTION public.registrar_acceso() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_acceso() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_acceso() TO anon;
GRANT EXECUTE ON FUNCTION public.registrar_acceso() TO authenticated;
REVOKE ALL ON FUNCTION public.rol_actual() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rol_actual() TO anon;
GRANT EXECUTE ON FUNCTION public.rol_actual() TO authenticated;
REVOKE ALL ON FUNCTION public.rpc_consultas_export(p_desde date, p_hasta date, p_tipo tipo_consulta, p_estado estado_consulta) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_consultas_export(p_desde date, p_hasta date, p_tipo tipo_consulta, p_estado estado_consulta) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_consultas_export(p_desde date, p_hasta date, p_tipo tipo_consulta, p_estado estado_consulta) TO authenticated;
REVOKE ALL ON FUNCTION public.rpc_consultas_por_tipo(p_desde date, p_hasta date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_consultas_por_tipo(p_desde date, p_hasta date) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_consultas_por_tipo(p_desde date, p_hasta date) TO authenticated;
REVOKE ALL ON FUNCTION public.rpc_embudo_registro(p_desde date, p_hasta date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_embudo_registro(p_desde date, p_hasta date) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_embudo_registro(p_desde date, p_hasta date) TO authenticated;
REVOKE ALL ON FUNCTION public.rpc_registros_por_dia(p_desde date, p_hasta date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_registros_por_dia(p_desde date, p_hasta date) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_registros_por_dia(p_desde date, p_hasta date) TO authenticated;
REVOKE ALL ON FUNCTION public.rpc_resumen_kpis(p_desde date, p_hasta date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_resumen_kpis(p_desde date, p_hasta date) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_resumen_kpis(p_desde date, p_hasta date) TO authenticated;
REVOKE ALL ON FUNCTION public.rpc_resumen_operador() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_resumen_operador() TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_resumen_operador() TO authenticated;
REVOKE ALL ON FUNCTION public.rpc_total_visitas() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_total_visitas() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_total_visitas() TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_total_visitas() TO authenticated;
REVOKE ALL ON FUNCTION public.rpc_trafico(p_desde date, p_hasta date, p_granularidad text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_trafico(p_desde date, p_hasta date, p_granularidad text) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_trafico(p_desde date, p_hasta date, p_granularidad text) TO authenticated;
REVOKE ALL ON FUNCTION public.sanear_nombre_archivo(p_base text, p_extension text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sanear_nombre_archivo(p_base text, p_extension text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.sanear_nombre_archivo(p_base text, p_extension text) TO anon;
GRANT EXECUTE ON FUNCTION public.sanear_nombre_archivo(p_base text, p_extension text) TO authenticated;
REVOKE ALL ON FUNCTION public.tocar_actualizado_en() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tocar_actualizado_en() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.tocar_actualizado_en() TO anon;
GRANT EXECUTE ON FUNCTION public.tocar_actualizado_en() TO authenticated;
REVOKE ALL ON FUNCTION public.validar_rango(p_desde date, p_hasta date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validar_rango(p_desde date, p_hasta date) TO anon;
GRANT EXECUTE ON FUNCTION public.validar_rango(p_desde date, p_hasta date) TO authenticated;
