-- ==============================================================================
-- 001_initial_schema.sql
-- Base de Datos para Portfolio Fullstack - TPI Lenguajes 4
-- ==============================================================================

-- 1. Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS (idempotentes: se pueden re-ejecutar sin error)
DO $$
BEGIN
    CREATE TYPE public.user_role AS ENUM ('visitante', 'registrado', 'operador', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE public.consulta_tipo AS ENUM ('general', 'cotizacion', 'asesoria');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE public.consulta_estado AS ENUM ('nueva', 'en_seguimiento', 'respondida');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. TABLA: profiles (perfiles sincronizados con auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL DEFAULT '',
    avatar_url TEXT DEFAULT '',
    role user_role NOT NULL DEFAULT 'registrado',
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    last_sign_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Trigger para updated_at en profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Función y trigger para auto-crear perfil al registrarse en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_count INT;
    assigned_role user_role := 'registrado';
BEGIN
    -- Si es el primer usuario en la base, hacerlo admin por defecto
    SELECT COUNT(*) INTO user_count FROM public.profiles;
    IF user_count = 0 THEN
        assigned_role := 'admin';
    END IF;

    INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        assigned_role
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. TABLA: servicios
CREATE TABLE IF NOT EXISTS public.servicios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    icon_svg TEXT NOT NULL,
    features TEXT[] DEFAULT ARRAY[]::TEXT[],
    orden INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_title_length CHECK (char_length(title) >= 3)
);

DROP TRIGGER IF EXISTS set_servicios_updated_at ON public.servicios;

CREATE TRIGGER set_servicios_updated_at
BEFORE UPDATE ON public.servicios
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 5. TABLA: proyectos
CREATE TABLE IF NOT EXISTS public.proyectos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(150) NOT NULL UNIQUE,
    title VARCHAR(180) NOT NULL,
    short_description VARCHAR(300) NOT NULL,
    full_description TEXT NOT NULL,
    thumbnail_url TEXT NOT NULL,
    gallery_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    tech_stack TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    repo_url TEXT,
    demo_url TEXT,
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    published BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_proy_title CHECK (char_length(title) >= 3),
    CONSTRAINT chk_proy_slug CHECK (slug ~ '^[a-z0-9-]+$')
);

DROP TRIGGER IF EXISTS set_proyectos_updated_at ON public.proyectos;

CREATE TRIGGER set_proyectos_updated_at
BEFORE UPDATE ON public.proyectos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 6. TABLA: demos (interactivas vinculadas a proyectos o independientes)
CREATE TABLE IF NOT EXISTS public.demos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proyecto_id UUID REFERENCES public.proyectos(id) ON DELETE CASCADE,
    title VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    embed_url TEXT,
    interactive_type VARCHAR(50) NOT NULL DEFAULT 'iframe', -- 'iframe', 'canvas', 'component'
    config_json JSONB DEFAULT '{}'::jsonb,
    is_public_preview BOOLEAN NOT NULL DEFAULT FALSE, -- Si false, requiere estar registrado
    orden INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS set_demos_updated_at ON public.demos;

CREATE TRIGGER set_demos_updated_at
BEFORE UPDATE ON public.demos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 7. TABLA: consultas (mensajes de contacto y cotizaciones)
CREATE TABLE IF NOT EXISTS public.consultas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    nombre VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL,
    tipo consulta_tipo NOT NULL DEFAULT 'general',
    asunto VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    estado consulta_estado NOT NULL DEFAULT 'nueva',
    ip_origen TEXT,
    pais TEXT,
    ciudad TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_consulta_nombre CHECK (char_length(trim(nombre)) >= 2),
    CONSTRAINT chk_consulta_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_consulta_mensaje CHECK (char_length(trim(mensaje)) >= 10 AND char_length(mensaje) <= 3000)
);

DROP TRIGGER IF EXISTS set_consultas_updated_at ON public.consultas;

CREATE TRIGGER set_consultas_updated_at
BEFORE UPDATE ON public.consultas
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 8. TABLA: respuestas_consultas (historial de respuestas de operadores)
CREATE TABLE IF NOT EXISTS public.respuestas_consultas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consulta_id UUID NOT NULL REFERENCES public.consultas(id) ON DELETE CASCADE,
    operador_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    destinatario_email VARCHAR(255) NOT NULL,
    asunto VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    enviado_exitosamente BOOLEAN NOT NULL DEFAULT TRUE,
    provider_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_resp_mensaje CHECK (char_length(trim(mensaje)) >= 5)
);

-- Trigger para cambiar el estado de la consulta a 'respondida' al guardar respuesta
CREATE OR REPLACE FUNCTION trigger_actualizar_estado_consulta()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.consultas
    SET estado = 'respondida', updated_at = timezone('utc'::text, now())
    WHERE id = NEW.consulta_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_respuesta_creada ON public.respuestas_consultas;

CREATE TRIGGER on_respuesta_creada
AFTER INSERT ON public.respuestas_consultas
FOR EACH ROW
EXECUTE FUNCTION trigger_actualizar_estado_consulta();

-- 9. TABLA: analytics_visitas (contadores de visitas generales y autenticadas)
CREATE TABLE IF NOT EXISTS public.analytics_visitas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_authenticated BOOLEAN NOT NULL DEFAULT FALSE,
    page_path TEXT NOT NULL DEFAULT '/',
    referrer TEXT,
    ip_hash TEXT,
    pais TEXT,
    ciudad TEXT,
    user_agent TEXT,
    device_type VARCHAR(30) DEFAULT 'desktop',
    screen_resolution VARCHAR(30),
    visited_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_analytics_fecha ON public.analytics_visitas(fecha);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON public.analytics_visitas(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_auth ON public.analytics_visitas(is_authenticated);

-- 10. TABLA: project_views (seguimiento de proyectos más visualizados)
CREATE TABLE IF NOT EXISTS public.project_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proyecto_id UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    session_id TEXT NOT NULL,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_project_views_proyecto ON public.project_views(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_project_views_fecha ON public.project_views(fecha);
