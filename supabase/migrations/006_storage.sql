-- ==============================================================================
-- supabase/migrations/006_storage.sql
-- Buckets de Storage y sus políticas
--
-- avatares (público, 1 MB), publico (público, 2 MB) y galeria (privado, 2 MB).
-- Solo imágenes; los tipos MIME permitidos se validan además en el cliente
-- por magic bytes.
--
-- Generada a partir del esquema real del proyecto (introspección de pg_catalog),
-- no del esquema en inglés de la primera versión del repositorio.
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('avatares', 'avatares', true, 1048576, '{image/webp,image/jpeg,image/png}') ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('galeria', 'galeria', false, 2097152, '{image/webp,image/jpeg,image/png}') ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('publico', 'publico', true, 2097152, '{image/webp,image/jpeg,image/png,image/svg+xml}') ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatares: cada uno borra el suyo" ON storage.objects;
CREATE POLICY "avatares: cada uno borra el suyo" ON storage.objects AS PERMISSIVE FOR DELETE TO public USING (((bucket_id = 'avatares'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

DROP POLICY IF EXISTS "avatares: cada uno reemplaza el suyo" ON storage.objects;
CREATE POLICY "avatares: cada uno reemplaza el suyo" ON storage.objects AS PERMISSIVE FOR UPDATE TO public USING (((bucket_id = 'avatares'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))) WITH CHECK (((bucket_id = 'avatares'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

DROP POLICY IF EXISTS "avatares: cada uno sube el suyo" ON storage.objects;
CREATE POLICY "avatares: cada uno sube el suyo" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'avatares'::text) AND (auth.uid() IS NOT NULL) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

DROP POLICY IF EXISTS "avatares: el admin gestiona todos" ON storage.objects;
CREATE POLICY "avatares: el admin gestiona todos" ON storage.objects AS PERMISSIVE FOR ALL TO public USING (((bucket_id = 'avatares'::text) AND es_admin())) WITH CHECK (((bucket_id = 'avatares'::text) AND es_admin()));

DROP POLICY IF EXISTS "avatares: lectura para cualquiera" ON storage.objects;
CREATE POLICY "avatares: lectura para cualquiera" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'avatares'::text));

DROP POLICY IF EXISTS "galeria: lectura sólo con sesión" ON storage.objects;
CREATE POLICY "galeria: lectura sólo con sesión" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING (((bucket_id = 'galeria'::text) AND (auth.uid() IS NOT NULL)));

DROP POLICY IF EXISTS "galeria: sólo el admin borra" ON storage.objects;
CREATE POLICY "galeria: sólo el admin borra" ON storage.objects AS PERMISSIVE FOR DELETE TO public USING (((bucket_id = 'galeria'::text) AND es_admin()));

DROP POLICY IF EXISTS "galeria: sólo el admin reemplaza" ON storage.objects;
CREATE POLICY "galeria: sólo el admin reemplaza" ON storage.objects AS PERMISSIVE FOR UPDATE TO public USING (((bucket_id = 'galeria'::text) AND es_admin())) WITH CHECK (((bucket_id = 'galeria'::text) AND es_admin()));

DROP POLICY IF EXISTS "galeria: sólo el admin sube" ON storage.objects;
CREATE POLICY "galeria: sólo el admin sube" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'galeria'::text) AND es_admin()));

DROP POLICY IF EXISTS "publico: lectura para cualquiera" ON storage.objects;
CREATE POLICY "publico: lectura para cualquiera" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'publico'::text));

DROP POLICY IF EXISTS "publico: sólo el admin borra" ON storage.objects;
CREATE POLICY "publico: sólo el admin borra" ON storage.objects AS PERMISSIVE FOR DELETE TO public USING (((bucket_id = 'publico'::text) AND es_admin()));

DROP POLICY IF EXISTS "publico: sólo el admin reemplaza" ON storage.objects;
CREATE POLICY "publico: sólo el admin reemplaza" ON storage.objects AS PERMISSIVE FOR UPDATE TO public USING (((bucket_id = 'publico'::text) AND es_admin())) WITH CHECK (((bucket_id = 'publico'::text) AND es_admin()));

DROP POLICY IF EXISTS "publico: sólo el admin sube" ON storage.objects;
CREATE POLICY "publico: sólo el admin sube" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'publico'::text) AND es_admin()));
