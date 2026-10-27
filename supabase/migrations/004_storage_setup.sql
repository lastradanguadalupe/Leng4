-- ==============================================================================
-- 004_storage_setup.sql
-- Configuración de Buckets de Storage y Políticas de Seguridad
-- ==============================================================================

-- 1. Crear el bucket 'portfolio-assets' si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'portfolio-assets',
    'portfolio-assets',
    true,
    5242880, -- 5 MB máximo
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

-- 2. Políticas RLS para storage.objects

-- Lectura pública para cualquier objeto en portfolio-assets
DROP POLICY IF EXISTS "Lectura publica portfolio assets" ON storage.objects;
CREATE POLICY "Lectura publica portfolio assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'portfolio-assets');

-- Subida de archivos: Solo Administradores y Operadores (o usuario subiendo su propio avatar)
DROP POLICY IF EXISTS "Subida autorizada portfolio assets" ON storage.objects;
CREATE POLICY "Subida autorizada portfolio assets"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'portfolio-assets'
    AND (
        -- Admin u operador pueden subir a cualquier carpeta del bucket
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'operador')
        -- O usuario autenticado subiendo a su propia subcarpeta 'avatars/<user_id>/...'
        OR (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text)
    )
);

-- Actualización: Admin o dueño del avatar
DROP POLICY IF EXISTS "Update autorizado portfolio assets" ON storage.objects;
CREATE POLICY "Update autorizado portfolio assets"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'portfolio-assets'
    AND (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'operador')
        OR (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text)
    )
);

-- Eliminación: Solo Administrador
DROP POLICY IF EXISTS "Delete solo admin portfolio assets" ON storage.objects;
CREATE POLICY "Delete solo admin portfolio assets"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'portfolio-assets'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
