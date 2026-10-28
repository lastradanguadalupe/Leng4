-- ==============================================================================
-- supabase/migrations/003_vistas.sql
-- Vistas
--
-- proyectos_publicos: listado público sin las columnas sensibles.
-- storage_huerfanos: archivos de Storage que ningún registro referencia.
-- Ambas con security_invoker, así que respetan las políticas de quien consulta.
--
-- Generada a partir del esquema real del proyecto (introspección de pg_catalog),
-- no del esquema en inglés de la primera versión del repositorio.
-- ==============================================================================

CREATE OR REPLACE VIEW public.proyectos_publicos WITH (security_invoker=on) AS  SELECT id,
    titulo,
    slug,
    resumen,
    imagen_portada,
    categoria,
    anio,
    destacado,
    orden,
    creado_en
   FROM proyectos
  WHERE publicado = true;

CREATE OR REPLACE VIEW public.storage_huerfanos WITH (security_invoker=on) AS  SELECT bucket_id,
    name AS path,
    created_at,
    round(((metadata ->> 'size'::text)::numeric) / 1024::numeric, 1) AS kb
   FROM storage.objects o
  WHERE (bucket_id = ANY (ARRAY['publico'::text, 'galeria'::text])) AND NOT (EXISTS ( SELECT 1
           FROM proyectos p
          WHERE p.imagen_portada = ((o.bucket_id || '/'::text) || o.name) OR p.imagen_portada = o.name)) AND NOT (EXISTS ( SELECT 1
           FROM proyecto_imagenes pi
          WHERE pi.url = ((o.bucket_id || '/'::text) || o.name) OR pi.url = o.name)) AND NOT (EXISTS ( SELECT 1
           FROM testimonios t
          WHERE t.avatar_url = ((o.bucket_id || '/'::text) || o.name) OR t.avatar_url = o.name));
