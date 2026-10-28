-- ==============================================================================
-- supabase/migrations/004_rls_y_politicas.sql
-- Row Level Security y políticas
--
-- RLS activo en las 16 tablas. Cada política es idempotente (DROP IF EXISTS).
--
-- Generada a partir del esquema real del proyecto (introspección de pg_catalog),
-- no del esquema en inglés de la primera versión del repositorio.
-- ==============================================================================

ALTER TABLE public.accesos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_sitio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyecto_imagenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyecto_tecnologias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respuestas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tecnologias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trayectoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vistas_proyecto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accesos: el admin lee" ON public.accesos;
CREATE POLICY "accesos: el admin lee" ON public.accesos AS PERMISSIVE FOR SELECT TO public USING (es_admin());

DROP POLICY IF EXISTS "accesos: el operador lee" ON public.accesos;
CREATE POLICY "accesos: el operador lee" ON public.accesos AS PERMISSIVE FOR SELECT TO public USING (es_operador());

DROP POLICY IF EXISTS "config: el admin escribe" ON public.config_sitio;
CREATE POLICY "config: el admin escribe" ON public.config_sitio AS PERMISSIVE FOR ALL TO public USING (es_admin()) WITH CHECK (es_admin());

DROP POLICY IF EXISTS "config: lectura pública" ON public.config_sitio;
CREATE POLICY "config: lectura pública" ON public.config_sitio AS PERMISSIVE FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "consultas: cualquiera puede enviar" ON public.consultas;
CREATE POLICY "consultas: cualquiera puede enviar" ON public.consultas AS PERMISSIVE FOR INSERT TO public WITH CHECK (((consentimiento = true) AND ((user_id IS NULL) OR (user_id = auth.uid())) AND (estado = 'nueva'::estado_consulta)));

DROP POLICY IF EXISTS "consultas: el operador actualiza el estado" ON public.consultas;
CREATE POLICY "consultas: el operador actualiza el estado" ON public.consultas AS PERMISSIVE FOR UPDATE TO public USING (es_operador()) WITH CHECK (es_operador());

DROP POLICY IF EXISTS "consultas: el operador ve todas" ON public.consultas;
CREATE POLICY "consultas: el operador ve todas" ON public.consultas AS PERMISSIVE FOR SELECT TO public USING (es_operador());

DROP POLICY IF EXISTS "consultas: el registrado ve sólo las propias" ON public.consultas;
CREATE POLICY "consultas: el registrado ve sólo las propias" ON public.consultas AS PERMISSIVE FOR SELECT TO public USING (((user_id IS NOT NULL) AND (user_id = auth.uid())));

DROP POLICY IF EXISTS "consultas: el admin gestiona todo" ON public.consultas;
CREATE POLICY "consultas: el admin gestiona todo" ON public.consultas AS PERMISSIVE FOR ALL TO public USING (es_admin()) WITH CHECK (es_admin());

DROP POLICY IF EXISTS "demos_solo_registrados" ON public.demos;
CREATE POLICY "demos_solo_registrados" ON public.demos AS PERMISSIVE FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "demos: el admin escribe" ON public.demos;
CREATE POLICY "demos: el admin escribe" ON public.demos AS PERMISSIVE FOR ALL TO public USING (es_admin()) WITH CHECK (es_admin());

DROP POLICY IF EXISTS "demos: sólo usuarios registrados" ON public.demos;
CREATE POLICY "demos: sólo usuarios registrados" ON public.demos AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));

DROP POLICY IF EXISTS "faqs: lectura pública de las publicadas" ON public.faqs;
CREATE POLICY "faqs: lectura pública de las publicadas" ON public.faqs AS PERMISSIVE FOR SELECT TO public USING ((publicado = true));

DROP POLICY IF EXISTS "faqs: el admin gestiona" ON public.faqs;
CREATE POLICY "faqs: el admin gestiona" ON public.faqs AS PERMISSIVE FOR ALL TO public USING (es_admin()) WITH CHECK (es_admin());

DROP POLICY IF EXISTS "profiles: cada uno ve el propio" ON public.profiles;
CREATE POLICY "profiles: cada uno ve el propio" ON public.profiles AS PERMISSIVE FOR SELECT TO public USING ((id = auth.uid()));

DROP POLICY IF EXISTS "profiles: el operador ve todos" ON public.profiles;
CREATE POLICY "profiles: el operador ve todos" ON public.profiles AS PERMISSIVE FOR SELECT TO public USING (es_operador());

DROP POLICY IF EXISTS "profiles: el admin gestiona todo" ON public.profiles;
CREATE POLICY "profiles: el admin gestiona todo" ON public.profiles AS PERMISSIVE FOR ALL TO public USING (es_admin()) WITH CHECK (es_admin());

DROP POLICY IF EXISTS "profiles: cada uno edita el propio" ON public.profiles;
CREATE POLICY "profiles: cada uno edita el propio" ON public.profiles AS PERMISSIVE FOR UPDATE TO public USING ((id = auth.uid())) WITH CHECK (((id = auth.uid()) AND (rol = ( SELECT p.rol
   FROM profiles p
  WHERE (p.id = auth.uid()))) AND (activo = ( SELECT p.activo
   FROM profiles p
  WHERE (p.id = auth.uid())))));

DROP POLICY IF EXISTS "proyecto_imagenes: sólo registrados" ON public.proyecto_imagenes;
CREATE POLICY "proyecto_imagenes: sólo registrados" ON public.proyecto_imagenes AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));

DROP POLICY IF EXISTS "proyecto_imagenes: el admin escribe" ON public.proyecto_imagenes;
CREATE POLICY "proyecto_imagenes: el admin escribe" ON public.proyecto_imagenes AS PERMISSIVE FOR ALL TO public USING (es_admin()) WITH CHECK (es_admin());

DROP POLICY IF EXISTS "proyecto_tecnologias: el admin escribe" ON public.proyecto_tecnologias;
CREATE POLICY "proyecto_tecnologias: el admin escribe" ON public.proyecto_tecnologias AS PERMISSIVE FOR ALL TO public USING (es_admin()) WITH CHECK (es_admin());

DROP POLICY IF EXISTS "proyecto_tecnologias: lectura pública" ON public.proyecto_tecnologias;
CREATE POLICY "proyecto_tecnologias: lectura pública" ON public.proyecto_tecnologias AS PERMISSIVE FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "proyectos: lectura pública de los publicados" ON public.proyectos;
CREATE POLICY "proyectos: lectura pública de los publicados" ON public.proyectos AS PERMISSIVE FOR SELECT TO public USING ((publicado = true));

DROP POLICY IF EXISTS "proyectos: el admin escribe" ON public.proyectos;
CREATE POLICY "proyectos: el admin escribe" ON public.proyectos AS PERMISSIVE FOR ALL TO public USING (es_admin()) WITH CHECK (es_admin());

DROP POLICY IF EXISTS "lectura_publica_proyectos_publicados" ON public.proyectos;
CREATE POLICY "lectura_publica_proyectos_publicados" ON public.proyectos AS PERMISSIVE FOR SELECT TO anon, authenticated USING ((publicado = true));

DROP POLICY IF EXISTS "proyectos: el admin ve también los borradores" ON public.proyectos;
CREATE POLICY "proyectos: el admin ve también los borradores" ON public.proyectos AS PERMISSIVE FOR SELECT TO public USING (es_admin());

DROP POLICY IF EXISTS "respuestas: el visitante ve las de sus consultas" ON public.respuestas;
CREATE POLICY "respuestas: el visitante ve las de sus consultas" ON public.respuestas AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM consultas c
  WHERE ((c.id = respuestas.consulta_id) AND (c.user_id = auth.uid())))));

DROP POLICY IF EXISTS "respuestas: el admin gestiona todo" ON public.respuestas;
CREATE POLICY "respuestas: el admin gestiona todo" ON public.respuestas AS PERMISSIVE FOR ALL TO public USING (es_admin()) WITH CHECK (es_admin());

DROP POLICY IF EXISTS "respuestas: el operador responde" ON public.respuestas;
CREATE POLICY "respuestas: el operador responde" ON public.respuestas AS PERMISSIVE FOR INSERT TO public WITH CHECK ((es_operador() AND (operador_id = auth.uid())));

DROP POLICY IF EXISTS "respuestas: el operador ve todas" ON public.respuestas;
CREATE POLICY "respuestas: el operador ve todas" ON public.respuestas AS PERMISSIVE FOR SELECT TO public USING (es_operador());

DROP POLICY IF EXISTS "lectura_publica_servicios_activos" ON public.servicios;
CREATE POLICY "lectura_publica_servicios_activos" ON public.servicios AS PERMISSIVE FOR SELECT TO anon, authenticated USING ((activo = true));

DROP POLICY IF EXISTS "servicios: lectura pública de los activos" ON public.servicios;
CREATE POLICY "servicios: lectura pública de los activos" ON public.servicios AS PERMISSIVE FOR SELECT TO public USING ((activo = true));

DROP POLICY IF EXISTS "servicios: el admin ve todo" ON public.servicios;
CREATE POLICY "servicios: el admin ve todo" ON public.servicios AS PERMISSIVE FOR SELECT TO public USING (es_admin());

DROP POLICY IF EXISTS "servicios: el admin escribe" ON public.servicios;
CREATE POLICY "servicios: el admin escribe" ON public.servicios AS PERMISSIVE FOR ALL TO public USING (es_admin()) WITH CHECK (es_admin());

DROP POLICY IF EXISTS "tecnologias: lectura pública" ON public.tecnologias;
CREATE POLICY "tecnologias: lectura pública" ON public.tecnologias AS PERMISSIVE FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "tecnologias: el admin escribe" ON public.tecnologias;
CREATE POLICY "tecnologias: el admin escribe" ON public.tecnologias AS PERMISSIVE FOR ALL TO public USING (es_admin()) WITH CHECK (es_admin());

DROP POLICY IF EXISTS "lectura_publica_testimonios_publicados" ON public.testimonios;
CREATE POLICY "lectura_publica_testimonios_publicados" ON public.testimonios AS PERMISSIVE FOR SELECT TO anon, authenticated USING ((publicado = true));

DROP POLICY IF EXISTS "testimonios: lectura pública de los publicados" ON public.testimonios;
CREATE POLICY "testimonios: lectura pública de los publicados" ON public.testimonios AS PERMISSIVE FOR SELECT TO public USING ((publicado = true));

DROP POLICY IF EXISTS "testimonios: el admin gestiona" ON public.testimonios;
CREATE POLICY "testimonios: el admin gestiona" ON public.testimonios AS PERMISSIVE FOR ALL TO public USING (es_admin()) WITH CHECK (es_admin());

DROP POLICY IF EXISTS "trayectoria: el admin escribe" ON public.trayectoria;
CREATE POLICY "trayectoria: el admin escribe" ON public.trayectoria AS PERMISSIVE FOR ALL TO public USING (es_admin()) WITH CHECK (es_admin());

DROP POLICY IF EXISTS "trayectoria: lectura pública" ON public.trayectoria;
CREATE POLICY "trayectoria: lectura pública" ON public.trayectoria AS PERMISSIVE FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "visitas_solo_staff" ON public.visitas;
CREATE POLICY "visitas_solo_staff" ON public.visitas AS PERMISSIVE FOR SELECT TO authenticated USING (es_staff());

DROP POLICY IF EXISTS "visitas: cualquiera registra la suya" ON public.visitas;
CREATE POLICY "visitas: cualquiera registra la suya" ON public.visitas AS PERMISSIVE FOR INSERT TO public WITH CHECK ((((user_id IS NULL) OR (user_id = auth.uid())) AND ((es_registrado = false) OR (auth.uid() IS NOT NULL))));

DROP POLICY IF EXISTS "visitas: el operador lee" ON public.visitas;
CREATE POLICY "visitas: el operador lee" ON public.visitas AS PERMISSIVE FOR SELECT TO public USING (es_operador());

DROP POLICY IF EXISTS "visitas: el admin gestiona" ON public.visitas;
CREATE POLICY "visitas: el admin gestiona" ON public.visitas AS PERMISSIVE FOR ALL TO public USING (es_admin()) WITH CHECK (es_admin());

DROP POLICY IF EXISTS "vistas_proyecto_solo_staff" ON public.vistas_proyecto;
CREATE POLICY "vistas_proyecto_solo_staff" ON public.vistas_proyecto AS PERMISSIVE FOR SELECT TO authenticated USING (es_staff());
