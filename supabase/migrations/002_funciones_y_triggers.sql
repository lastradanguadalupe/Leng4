-- ==============================================================================
-- supabase/migrations/002_funciones_y_triggers.sql
-- Funciones, RPC de analítica y triggers
--
-- Helpers de rol (es_admin, es_operador, es_staff, rol_actual, exigir_*),
-- alta de perfil al registrarse, registro de visitas y RPC de analítica.
-- Los permisos de ejecución están en 005_permisos.sql.
--
-- Generada a partir del esquema real del proyecto (introspección de pg_catalog),
-- no del esquema en inglés de la primera versión del repositorio.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.crear_perfil_al_registrarse()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, rol)
  VALUES (
    NEW.id,
    NEW.email,
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
$function$
;

CREATE OR REPLACE FUNCTION public.es_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(public.rol_actual() = 'admin', false);
$function$
;

CREATE OR REPLACE FUNCTION public.es_operador()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(public.rol_actual() in ('operador', 'admin'), false);
$function$
;

CREATE OR REPLACE FUNCTION public.es_staff()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND rol IN ('operador', 'admin')
  );
$function$
;

CREATE OR REPLACE FUNCTION public.exigir_admin()
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.es_admin() then
    raise exception 'No autorizado: se requiere rol de administrador'
      using errcode = '42501';   -- insufficient_privilege → HTTP 403
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.exigir_operador()
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.es_operador() then
    raise exception 'No autorizado: se requiere rol de operador o administrador'
      using errcode = '42501';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_summary()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_consultas_analytics(p_start_date date, p_end_date date)
 RETURNS TABLE(tipo text, total bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_registrations_trend(p_start_date date, p_end_date date, p_group_by text DEFAULT 'day'::text)
 RETURNS TABLE(periodo text, nuevos_usuarios bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_top_projects_analytics(p_limit integer DEFAULT 5)
 RETURNS TABLE(titulo text, total_views bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_traffic_analytics(p_start_date date, p_end_date date, p_group_by text DEFAULT 'day'::text)
 RETURNS TABLE(periodo text, visitas_totales bigint, visitas_autenticadas bigint, visitas_anonimas bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.manejar_usuario_nuevo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, nombre, apellido, email, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'nombre',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'apellido',
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.record_project_view(p_proyecto_id bigint, p_session_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.vistas_proyecto (proyecto_id, session_id)
  VALUES (p_proyecto_id, p_session_id)
  ON CONFLICT (proyecto_id, session_id) DO NOTHING;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.record_visit(p_session_id text, p_page_path text DEFAULT '/'::text, p_referrer text DEFAULT NULL::text, p_ip_hash text DEFAULT NULL::text, p_pais text DEFAULT NULL::text, p_ciudad text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text, p_device_type text DEFAULT NULL::text, p_screen_res text DEFAULT NULL::text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.registrar_acceso()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_proveedor proveedor_acceso;
begin
  if new.last_sign_in_at is distinct from old.last_sign_in_at
     and new.last_sign_in_at is not null then

    v_proveedor := case
      when coalesce(new.raw_app_meta_data ->> 'provider', 'email') = 'google'
        then 'google'::proveedor_acceso
      else 'password'::proveedor_acceso
    end;

    insert into public.accesos (user_id, proveedor)
    values (new.id, v_proveedor);

    update public.profiles
       set ultimo_acceso = new.last_sign_in_at
     where id = new.id;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rol_actual()
 RETURNS rol_usuario
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select rol
    from public.profiles
   where id = auth.uid()
     and activo = true;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_consultas_export(p_desde date DEFAULT NULL::date, p_hasta date DEFAULT NULL::date, p_tipo tipo_consulta DEFAULT NULL::tipo_consulta, p_estado estado_consulta DEFAULT NULL::estado_consulta)
 RETURNS TABLE(id bigint, creado_en timestamp with time zone, tipo tipo_consulta, estado estado_consulta, nombre text, email text, telefono text, asunto text, mensaje text, presupuesto_estimado numeric, plazo_estimado text, tecnologia_interes text, ciudad text, pais text, cantidad_respuestas bigint, primera_respuesta timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_desde date := coalesce(p_desde, current_date - 364);
  v_hasta date := coalesce(p_hasta, current_date);
begin
  perform public.exigir_operador();
  perform public.validar_rango(v_desde, v_hasta);

  return query
  select
    c.id, c.creado_en, c.tipo, c.estado,
    c.nombre, c.email, c.telefono, c.asunto, c.mensaje,
    c.presupuesto_estimado, c.plazo_estimado, c.tecnologia_interes,
    c.ciudad, c.pais,
    count(r.id)::bigint      as cantidad_respuestas,
    min(r.creado_en)         as primera_respuesta
  from public.consultas c
  left join public.respuestas r on r.consulta_id = c.id
  where c.creado_en::date between v_desde and v_hasta
    and (p_tipo   is null or c.tipo   = p_tipo)
    and (p_estado is null or c.estado = p_estado)
  group by c.id
  order by c.creado_en desc;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_consultas_por_tipo(p_desde date, p_hasta date)
 RETURNS TABLE(tipo tipo_consulta, etiqueta text, total bigint, porcentaje numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_total bigint;
begin
  perform public.exigir_admin();
  perform public.validar_rango(p_desde, p_hasta);

  select count(*) into v_total
    from public.consultas c
   where c.creado_en::date between p_desde and p_hasta;

  return query
  select
    t.tipo,
    case t.tipo
      when 'general'    then 'Consulta general'
      when 'cotizacion' then 'Cotización de proyecto'
      when 'asesoria'   then 'Asesoría técnica'
    end::text as etiqueta,
    count(c.id)::bigint as total,
    case when v_total = 0 then 0::numeric
         else round(count(c.id) * 100.0 / v_total, 1)
    end as porcentaje
  from unnest(enum_range(null::tipo_consulta)) as t(tipo)
  left join public.consultas c
         on c.tipo = t.tipo
        and c.creado_en::date between p_desde and p_hasta
  group by t.tipo
  order by total desc, t.tipo;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_embudo_registro(p_desde date, p_hasta date)
 RETURNS TABLE(orden smallint, etapa text, total bigint, pct_del_total numeric, pct_de_anterior numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.exigir_admin();
  perform public.validar_rango(p_desde, p_hasta);

  return query
  with etapas as (
    select 1::smallint as orden, 'Visitaron el sitio'::text as etapa,
           count(distinct v.session_id)::bigint as total
      from public.visitas v
     where v.creado_en::date between p_desde and p_hasta

    union all
    select 2::smallint, 'Vieron proyectos'::text,
           count(distinct v.session_id)::bigint
      from public.visitas v
     where v.creado_en::date between p_desde and p_hasta
       and (v.path like '/proyecto%' or v.path like '%#proyectos')

    union all
    select 3::smallint, 'Iniciaron el registro'::text,
           count(distinct v.session_id)::bigint
      from public.visitas v
     where v.creado_en::date between p_desde and p_hasta
       and v.path like '/auth%'

    union all
    select 4::smallint, 'Completaron el registro'::text,
           count(*)::bigint
      from public.profiles p
     where p.creado_en::date between p_desde and p_hasta
  ),
  con_anterior as (
    select e.*,
           first_value(e.total) over (order by e.orden)            as base,
           lag(e.total)          over (order by e.orden)           as anterior
      from etapas e
  )
  select
    con_anterior.orden,
    con_anterior.etapa,
    con_anterior.total,
    case when con_anterior.base = 0 then 0::numeric
         else round(con_anterior.total * 100.0 / con_anterior.base, 1)
    end as pct_del_total,
    case when con_anterior.anterior is null then 100::numeric
         when con_anterior.anterior = 0     then 0::numeric
         else round(con_anterior.total * 100.0 / con_anterior.anterior, 1)
    end as pct_de_anterior
  from con_anterior
  order by con_anterior.orden;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_registros_por_dia(p_desde date, p_hasta date)
 RETURNS TABLE(dia date, total bigint, acumulado bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.exigir_admin();
  perform public.validar_rango(p_desde, p_hasta);

  return query
  with dias as (
    select d::date as dia
      from generate_series(p_desde, p_hasta, interval '1 day') as d
  ),
  por_dia as (
    select p.creado_en::date as dia, count(*)::bigint as total
      from public.profiles p
     where p.creado_en::date between p_desde and p_hasta
     group by 1
  )
  select
    dias.dia,
    coalesce(por_dia.total, 0)::bigint as total,
    -- Acumulado corrido dentro del período elegido.
    sum(coalesce(por_dia.total, 0)) over (order by dias.dia)::bigint as acumulado
  from dias
  left join por_dia on por_dia.dia = dias.dia
  order by dias.dia;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_resumen_kpis(p_desde date DEFAULT NULL::date, p_hasta date DEFAULT NULL::date)
 RETURNS TABLE(total_visitas bigint, sesiones_unicas bigint, total_accesos bigint, usuarios_registrados bigint, usuarios_nuevos bigint, consultas_totales bigint, consultas_nuevas bigint, tasa_respuesta numeric, horas_primera_rta numeric, proyectos_publicados bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_desde date := coalesce(p_desde, current_date - 29);
  v_hasta date := coalesce(p_hasta, current_date);
begin
  perform public.exigir_admin();
  perform public.validar_rango(v_desde, v_hasta);

  return query
  select
    (select count(*) from public.visitas v
      where v.creado_en::date between v_desde and v_hasta)::bigint,

    (select count(distinct v.session_id) from public.visitas v
      where v.creado_en::date between v_desde and v_hasta)::bigint,

    (select count(*) from public.accesos a
      where a.creado_en::date between v_desde and v_hasta)::bigint,

    (select count(*) from public.profiles)::bigint,

    (select count(*) from public.profiles p
      where p.creado_en::date between v_desde and v_hasta)::bigint,

    (select count(*) from public.consultas c
      where c.creado_en::date between v_desde and v_hasta)::bigint,

    (select count(*) from public.consultas c
      where c.estado = 'nueva')::bigint,

    -- Tasa de respuesta: respondidas o cerradas sobre el total del período.
    (select case when count(*) = 0 then 0::numeric
                 else round(
                   count(*) filter (where c.estado in ('respondida','cerrada'))
                   * 100.0 / count(*), 1)
            end
       from public.consultas c
      where c.creado_en::date between v_desde and v_hasta),

    -- Horas promedio hasta la PRIMERA respuesta.
    (select round(
              avg(extract(epoch from (r.primera - c.creado_en)) / 3600.0)::numeric, 1)
       from public.consultas c
       join lateral (
         select min(rr.creado_en) as primera
           from public.respuestas rr
          where rr.consulta_id = c.id
       ) r on true
      where c.creado_en::date between v_desde and v_hasta
        and r.primera is not null),

    (select count(*) from public.proyectos p where p.publicado)::bigint;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_resumen_operador()
 RETURNS TABLE(nuevas bigint, en_proceso bigint, respondidas bigint, cerradas bigint, sin_responder_48h bigint, horas_primera_rta numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.exigir_operador();

  return query
  select
    count(*) filter (where c.estado = 'nueva')::bigint,
    count(*) filter (where c.estado = 'en_proceso')::bigint,
    count(*) filter (where c.estado = 'respondida')::bigint,
    count(*) filter (where c.estado = 'cerrada')::bigint,
    -- Lo que está vencido: nueva y con más de 48 h. Es el número que
    -- justifica que el tile exista.
    count(*) filter (
      where c.estado = 'nueva'
        and c.creado_en < now() - interval '48 hours'
    )::bigint,
    (select round(
              avg(extract(epoch from (r.primera - c2.creado_en)) / 3600.0)::numeric, 1)
       from public.consultas c2
       join lateral (
         select min(rr.creado_en) as primera
           from public.respuestas rr
          where rr.consulta_id = c2.id
       ) r on true
      where r.primera is not null)
  from public.consultas c;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_total_visitas()
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select count(*)::bigint from public.visitas;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_trafico(p_desde date, p_hasta date, p_granularidad text DEFAULT 'dia'::text)
 RETURNS TABLE(periodo date, etiqueta text, visitas bigint, visitas_registrados bigint, sesiones_unicas bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_unidad text;
  v_paso   interval;
begin
  perform public.exigir_admin();
  perform public.validar_rango(p_desde, p_hasta);

  -- Lista blanca: nunca se concatena el parámetro dentro del SQL.
  -- date_trunc recibe un literal controlado por nosotros, no la entrada.
  v_unidad := case lower(coalesce(p_granularidad, 'dia'))
                when 'dia'    then 'day'
                when 'semana' then 'week'
                when 'mes'    then 'month'
                else null
              end;

  if v_unidad is null then
    raise exception 'Granularidad inválida: % (se espera dia, semana o mes)', p_granularidad
      using errcode = '22023';
  end if;

  v_paso := ('1 ' || v_unidad)::interval;

  return query
  with periodos as (
    select date_trunc(v_unidad, d)::date as periodo
      from generate_series(
             date_trunc(v_unidad, p_desde::timestamptz),
             p_hasta::timestamptz,
             v_paso
           ) as d
  ),
  agregado as (
    select
      date_trunc(v_unidad, v.creado_en)::date as periodo,
      count(*)::bigint                                     as visitas,
      count(*) filter (where v.es_registrado)::bigint      as visitas_registrados,
      count(distinct v.session_id)::bigint                 as sesiones_unicas
    from public.visitas v
    where v.creado_en::date between p_desde and p_hasta
    group by 1
  )
  select
    periodos.periodo,
    to_char(periodos.periodo,
            case v_unidad when 'month' then 'MM/YYYY' else 'DD/MM' end)::text as etiqueta,
    coalesce(agregado.visitas, 0)::bigint,
    coalesce(agregado.visitas_registrados, 0)::bigint,
    coalesce(agregado.sesiones_unicas, 0)::bigint
  from periodos
  left join agregado on agregado.periodo = periodos.periodo
  order by periodos.periodo;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sanear_nombre_archivo(p_base text, p_extension text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  v_limpio text;
  v_ext    text;
begin
  -- Minúsculas, sin acentos, sin nada que no sea letra, número o guión.
  v_limpio := lower(trim(coalesce(p_base, 'archivo')));
  v_limpio := translate(v_limpio,
                        'áéíóúüñàèìòùâêîôûäëïöçÁÉÍÓÚÜÑ',
                        'aeiouunaeiouaeiouaeiocAEIOUUN');
  v_limpio := regexp_replace(v_limpio, '[^a-z0-9]+', '-', 'g');
  v_limpio := regexp_replace(v_limpio, '(^-+|-+$)', '', 'g');
  v_limpio := left(nullif(v_limpio, ''), 60);

  if v_limpio is null then
    v_limpio := 'archivo';
  end if;

  v_ext := lower(regexp_replace(coalesce(p_extension, 'webp'), '[^a-zA-Z0-9]', '', 'g'));
  if v_ext not in ('webp', 'jpg', 'jpeg', 'png', 'svg') then
    v_ext := 'webp';
  end if;

  -- El timestamp evita pisar un archivo existente y sirve de cache-buster
  -- cuando se reemplaza la portada de un proyecto.
  return v_limpio || '-' || extract(epoch from clock_timestamp())::bigint || '.' || v_ext;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.tocar_actualizado_en()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.actualizado_en = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validar_rango(p_desde date, p_hasta date)
 RETURNS void
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
begin
  if p_desde is null or p_hasta is null then
    raise exception 'Las fechas desde y hasta son obligatorias'
      using errcode = '22023';
  end if;

  if p_desde > p_hasta then
    raise exception 'La fecha desde (%) no puede ser posterior a hasta (%)', p_desde, p_hasta
      using errcode = '22023';
  end if;

  -- Un rango abierto haría un scan de toda la tabla desde un panel web.
  if (p_hasta - p_desde) > 365 then
    raise exception 'El rango no puede superar los 365 días (pediste %)', (p_hasta - p_desde)
      using errcode = '22023';
  end if;
end;
$function$
;

-- Triggers de tablas públicas
DROP TRIGGER IF EXISTS config_sitio_tocar ON public.config_sitio;
CREATE TRIGGER config_sitio_tocar BEFORE UPDATE ON public.config_sitio FOR EACH ROW EXECUTE FUNCTION tocar_actualizado_en();
DROP TRIGGER IF EXISTS proyectos_tocar ON public.proyectos;
CREATE TRIGGER proyectos_tocar BEFORE UPDATE ON public.proyectos FOR EACH ROW EXECUTE FUNCTION tocar_actualizado_en();
DROP TRIGGER IF EXISTS servicios_tocar ON public.servicios;
CREATE TRIGGER servicios_tocar BEFORE UPDATE ON public.servicios FOR EACH ROW EXECUTE FUNCTION tocar_actualizado_en();

-- Triggers sobre auth.users (crean el perfil y registran el acceso)
DROP TRIGGER IF EXISTS on_auth_user_sign_in ON auth.users;
CREATE TRIGGER on_auth_user_sign_in AFTER UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION registrar_acceso();
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION crear_perfil_al_registrarse();
