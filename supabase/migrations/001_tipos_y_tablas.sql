-- ==============================================================================
-- supabase/migrations/001_tipos_y_tablas.sql
-- Extensiones, tipos enumerados, tablas e índices
--
-- Las 16 tablas del esquema `public`, con sus claves, restricciones y columnas
-- identity. Las tablas se crean en orden de dependencia (las claves foráneas
-- apuntan a `profiles` y `auth.users`).
--
-- Generada a partir del esquema real del proyecto (introspección de pg_catalog),
-- no del esquema en inglés de la primera versión del repositorio.
-- ==============================================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tipos enumerados
CREATE TYPE public.categoria_tec AS ENUM ('frontend', 'backend', 'base_datos', 'herramientas');
CREATE TYPE public.estado_consulta AS ENUM ('nueva', 'en_proceso', 'respondida', 'cerrada');
CREATE TYPE public.estado_envio AS ENUM ('pendiente', 'enviado', 'error', 'simulado');
CREATE TYPE public.proveedor_acceso AS ENUM ('google', 'password');
CREATE TYPE public.rol_usuario AS ENUM ('registrado', 'operador', 'admin');
CREATE TYPE public.tipo_consulta AS ENUM ('general', 'cotizacion', 'asesoria');
CREATE TYPE public.tipo_demo AS ENUM ('iframe', 'video', 'galeria', 'codigo');
CREATE TYPE public.tipo_trayectoria AS ENUM ('educacion', 'experiencia');

-- Tablas
CREATE TABLE public.config_sitio (
  clave text NOT NULL,
  valor jsonb NOT NULL,
  actualizado_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT config_clave_formato CHECK ((clave ~ '^[a-z0-9_]+$'::text)),
  CONSTRAINT config_sitio_pkey PRIMARY KEY (clave)
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  nombre text NOT NULL,
  apellido text,
  email text NOT NULL,
  avatar_url text,
  rol rol_usuario NOT NULL DEFAULT 'registrado'::rol_usuario,
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  ultimo_acceso timestamp with time zone,
  bloqueado boolean NOT NULL DEFAULT false,
  CONSTRAINT profiles_apellido_largo CHECK (((apellido IS NULL) OR (char_length(apellido) <= 60))),
  CONSTRAINT profiles_email_formato CHECK ((email ~* '^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$'::text)),
  CONSTRAINT profiles_email_key UNIQUE (email),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT profiles_nombre_largo CHECK (((char_length(nombre) >= 2) AND (char_length(nombre) <= 60))),
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

CREATE TABLE public.tecnologias (
  id bigint NOT NULL,
  nombre text NOT NULL,
  categoria categoria_tec NOT NULL,
  icono text,
  nivel smallint,
  orden smallint NOT NULL DEFAULT 0,
  CONSTRAINT tecnologias_nivel_rango CHECK (((nivel IS NULL) OR ((nivel >= 1) AND (nivel <= 100)))),
  CONSTRAINT tecnologias_nombre_key UNIQUE (nombre),
  CONSTRAINT tecnologias_nombre_largo CHECK (((char_length(nombre) >= 1) AND (char_length(nombre) <= 40))),
  CONSTRAINT tecnologias_pkey PRIMARY KEY (id)
);

CREATE TABLE public.proyectos (
  id bigint NOT NULL,
  titulo text NOT NULL,
  slug text NOT NULL,
  resumen text NOT NULL,
  descripcion text NOT NULL,
  imagen_portada text NOT NULL,
  cliente text,
  anio smallint,
  categoria text NOT NULL,
  url_repo text,
  url_vivo text,
  destacado boolean NOT NULL DEFAULT false,
  publicado boolean NOT NULL DEFAULT false,
  orden smallint NOT NULL DEFAULT 0,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  actualizado_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT proyectos_anio_rango CHECK (((anio IS NULL) OR ((anio >= 2015) AND (anio <= 2030)))),
  CONSTRAINT proyectos_categoria_val CHECK ((categoria = ANY (ARRAY['Landing'::text, 'Web App'::text, 'E-commerce'::text, 'API'::text, 'Corporativo'::text]))),
  CONSTRAINT proyectos_desc_largo CHECK (((char_length(descripcion) >= 50) AND (char_length(descripcion) <= 5000))),
  CONSTRAINT proyectos_pkey PRIMARY KEY (id),
  CONSTRAINT proyectos_repo_https CHECK (((url_repo IS NULL) OR (url_repo ~ '^https://'::text))),
  CONSTRAINT proyectos_resumen_largo CHECK (((char_length(resumen) >= 10) AND (char_length(resumen) <= 200))),
  CONSTRAINT proyectos_slug_formato CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text)),
  CONSTRAINT proyectos_slug_key UNIQUE (slug),
  CONSTRAINT proyectos_titulo_largo CHECK (((char_length(titulo) >= 3) AND (char_length(titulo) <= 120))),
  CONSTRAINT proyectos_vivo_https CHECK (((url_vivo IS NULL) OR (url_vivo ~ '^https://'::text)))
);

CREATE TABLE public.servicios (
  id bigint NOT NULL,
  titulo text NOT NULL,
  slug text NOT NULL,
  descripcion text NOT NULL,
  icono text,
  precio_desde numeric(10,2),
  destacado boolean NOT NULL DEFAULT false,
  activo boolean NOT NULL DEFAULT true,
  orden smallint NOT NULL DEFAULT 0,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  actualizado_en timestamp with time zone NOT NULL DEFAULT now(),
  entregables text[] NOT NULL DEFAULT ARRAY[]::text[],
  CONSTRAINT servicios_desc_largo CHECK (((char_length(descripcion) >= 10) AND (char_length(descripcion) <= 600))),
  CONSTRAINT servicios_pkey PRIMARY KEY (id),
  CONSTRAINT servicios_precio_pos CHECK (((precio_desde IS NULL) OR (precio_desde >= (0)::numeric))),
  CONSTRAINT servicios_slug_formato CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text)),
  CONSTRAINT servicios_slug_key UNIQUE (slug),
  CONSTRAINT servicios_titulo_largo CHECK (((char_length(titulo) >= 3) AND (char_length(titulo) <= 80)))
);

CREATE TABLE public.testimonios (
  id bigint NOT NULL,
  autor text NOT NULL,
  rol_autor text,
  empresa text,
  texto text NOT NULL,
  avatar_url text,
  orden smallint NOT NULL DEFAULT 0,
  publicado boolean NOT NULL DEFAULT false,
  servicio text,
  estrellas smallint NOT NULL DEFAULT 5,
  CONSTRAINT testimonios_autor_largo CHECK (((char_length(autor) >= 2) AND (char_length(autor) <= 80))),
  CONSTRAINT testimonios_estrellas_rango CHECK (((estrellas >= 1) AND (estrellas <= 5))),
  CONSTRAINT testimonios_pkey PRIMARY KEY (id),
  CONSTRAINT testimonios_texto_largo CHECK (((char_length(texto) >= 20) AND (char_length(texto) <= 600)))
);

CREATE TABLE public.trayectoria (
  id bigint NOT NULL,
  tipo tipo_trayectoria NOT NULL,
  titulo text NOT NULL,
  institucion text NOT NULL,
  desde date NOT NULL,
  hasta date,
  descripcion text,
  orden smallint NOT NULL DEFAULT 0,
  CONSTRAINT trayectoria_fechas CHECK (((hasta IS NULL) OR (hasta >= desde))),
  CONSTRAINT trayectoria_pkey PRIMARY KEY (id),
  CONSTRAINT trayectoria_titulo_largo CHECK (((char_length(titulo) >= 3) AND (char_length(titulo) <= 120)))
);

CREATE TABLE public.faqs (
  id bigint NOT NULL,
  pregunta text NOT NULL,
  respuesta text NOT NULL,
  orden smallint NOT NULL DEFAULT 0,
  publicado boolean NOT NULL DEFAULT true,
  CONSTRAINT faqs_pkey PRIMARY KEY (id),
  CONSTRAINT faqs_pregunta_largo CHECK (((char_length(pregunta) >= 10) AND (char_length(pregunta) <= 200))),
  CONSTRAINT faqs_respuesta_largo CHECK (((char_length(respuesta) >= 20) AND (char_length(respuesta) <= 1500)))
);

CREATE TABLE public.consultas (
  id bigint NOT NULL,
  nombre text NOT NULL,
  email text NOT NULL,
  telefono text,
  tipo tipo_consulta NOT NULL,
  asunto text NOT NULL,
  mensaje text NOT NULL,
  presupuesto_estimado numeric(12,2),
  plazo_estimado text,
  tecnologia_interes text,
  estado estado_consulta NOT NULL DEFAULT 'nueva'::estado_consulta,
  user_id uuid,
  pais text,
  ciudad text,
  consentimiento boolean NOT NULL,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT consultas_asesoria_tecnologia CHECK ((((tipo = 'asesoria'::tipo_consulta) AND (tecnologia_interes IS NOT NULL)) OR ((tipo <> 'asesoria'::tipo_consulta) AND (tecnologia_interes IS NULL)))),
  CONSTRAINT consultas_asunto_largo CHECK (((char_length(asunto) >= 4) AND (char_length(asunto) <= 120))),
  CONSTRAINT consultas_campos_segun_tipo CHECK ((((tipo = 'cotizacion'::tipo_consulta) AND (presupuesto_estimado IS NOT NULL)) OR ((tipo <> 'cotizacion'::tipo_consulta) AND (presupuesto_estimado IS NULL)))),
  CONSTRAINT consultas_consentimiento CHECK ((consentimiento = true)),
  CONSTRAINT consultas_email_fmt CHECK ((email ~* '^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$'::text)),
  CONSTRAINT consultas_mensaje_largo CHECK (((char_length(mensaje) >= 20) AND (char_length(mensaje) <= 2000))),
  CONSTRAINT consultas_nombre_fmt CHECK ((nombre ~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ''\s-]+$'::text)),
  CONSTRAINT consultas_nombre_largo CHECK (((char_length(nombre) >= 2) AND (char_length(nombre) <= 80))),
  CONSTRAINT consultas_pkey PRIMARY KEY (id),
  CONSTRAINT consultas_plazo_val CHECK (((plazo_estimado IS NULL) OR (plazo_estimado = ANY (ARRAY['urgente'::text, '1mes'::text, '3meses'::text, 'flexible'::text])))),
  CONSTRAINT consultas_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE public.accesos (
  id bigint NOT NULL,
  user_id uuid NOT NULL,
  proveedor proveedor_acceso NOT NULL,
  agente_hash text,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT accesos_pkey PRIMARY KEY (id),
  CONSTRAINT accesos_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE public.respuestas (
  id bigint NOT NULL,
  consulta_id bigint NOT NULL,
  operador_id uuid,
  cuerpo text NOT NULL,
  enviado_a text NOT NULL,
  enviado_en timestamp with time zone,
  estado_envio estado_envio NOT NULL DEFAULT 'pendiente'::estado_envio,
  proveedor_id text,
  error_detalle text,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT respuestas_consulta_id_fkey FOREIGN KEY (consulta_id) REFERENCES consultas(id) ON DELETE CASCADE,
  CONSTRAINT respuestas_cuerpo_largo CHECK (((char_length(cuerpo) >= 10) AND (char_length(cuerpo) <= 5000))),
  CONSTRAINT respuestas_destino_fmt CHECK ((enviado_a ~* '^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$'::text)),
  CONSTRAINT respuestas_operador_id_fkey FOREIGN KEY (operador_id) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT respuestas_pkey PRIMARY KEY (id)
);

CREATE TABLE public.demos (
  id bigint NOT NULL,
  proyecto_id bigint NOT NULL,
  titulo text NOT NULL,
  tipo tipo_demo NOT NULL,
  url_embed text NOT NULL,
  instrucciones text,
  orden smallint NOT NULL DEFAULT 0,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT demos_embed_https CHECK ((url_embed ~ '^https://'::text)),
  CONSTRAINT demos_instr_largo CHECK (((instrucciones IS NULL) OR (char_length(instrucciones) <= 1000))),
  CONSTRAINT demos_pkey PRIMARY KEY (id),
  CONSTRAINT demos_proyecto_id_fkey FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
  CONSTRAINT demos_titulo_largo CHECK (((char_length(titulo) >= 3) AND (char_length(titulo) <= 120)))
);

CREATE TABLE public.proyecto_imagenes (
  id bigint NOT NULL,
  proyecto_id bigint NOT NULL,
  url text NOT NULL,
  alt text NOT NULL,
  orden smallint NOT NULL DEFAULT 0,
  CONSTRAINT proyecto_imagenes_alt_largo CHECK (((char_length(alt) >= 5) AND (char_length(alt) <= 120))),
  CONSTRAINT proyecto_imagenes_pkey PRIMARY KEY (id),
  CONSTRAINT proyecto_imagenes_proyecto_id_fkey FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE
);

CREATE TABLE public.proyecto_tecnologias (
  proyecto_id bigint NOT NULL,
  tecnologia_id bigint NOT NULL,
  CONSTRAINT proyecto_tecnologias_pkey PRIMARY KEY (proyecto_id, tecnologia_id),
  CONSTRAINT proyecto_tecnologias_proyecto_id_fkey FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
  CONSTRAINT proyecto_tecnologias_tecnologia_id_fkey FOREIGN KEY (tecnologia_id) REFERENCES tecnologias(id) ON DELETE CASCADE
);

CREATE TABLE public.visitas (
  id bigint NOT NULL,
  path text NOT NULL,
  referrer text,
  session_id text NOT NULL,
  es_registrado boolean NOT NULL DEFAULT false,
  user_id uuid,
  pais text,
  agente_hash text,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  ruta text,
  referente text,
  autenticado boolean NOT NULL DEFAULT false,
  usuario_id uuid,
  ciudad text,
  ip_hash text,
  dispositivo text,
  resolucion text,
  CONSTRAINT visitas_path_largo CHECK (((char_length(path) >= 1) AND (char_length(path) <= 200))),
  CONSTRAINT visitas_pkey PRIMARY KEY (id),
  CONSTRAINT visitas_session_largo CHECK (((char_length(session_id) >= 8) AND (char_length(session_id) <= 64))),
  CONSTRAINT visitas_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT visitas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE public.vistas_proyecto (
  id bigint NOT NULL DEFAULT nextval('vistas_proyecto_id_seq'::regclass),
  proyecto_id bigint NOT NULL,
  session_id text NOT NULL,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT vistas_proyecto_pkey PRIMARY KEY (id),
  CONSTRAINT vistas_proyecto_proyecto_id_fkey FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
  CONSTRAINT vistas_proyecto_unica UNIQUE (proyecto_id, session_id)
);

-- Columnas identity
ALTER TABLE public.accesos ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
ALTER TABLE public.consultas ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
ALTER TABLE public.demos ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
ALTER TABLE public.faqs ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
ALTER TABLE public.proyecto_imagenes ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
ALTER TABLE public.proyectos ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
ALTER TABLE public.respuestas ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
ALTER TABLE public.servicios ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
ALTER TABLE public.tecnologias ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
ALTER TABLE public.testimonios ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
ALTER TABLE public.trayectoria ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
ALTER TABLE public.visitas ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;

-- Índices (los de claves primarias y únicas ya los crean las restricciones)
CREATE INDEX IF NOT EXISTS accesos_creado_idx ON public.accesos USING btree (creado_en DESC);
CREATE INDEX IF NOT EXISTS accesos_user_idx ON public.accesos USING btree (user_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS consultas_tipo_idx ON public.consultas USING btree (tipo, creado_en DESC);
CREATE INDEX IF NOT EXISTS consultas_user_idx ON public.consultas USING btree (user_id);
CREATE INDEX IF NOT EXISTS consultas_creado_idx ON public.consultas USING btree (creado_en DESC);
CREATE INDEX IF NOT EXISTS consultas_estado_idx ON public.consultas USING btree (estado, creado_en DESC);
CREATE INDEX IF NOT EXISTS demos_proyecto_idx ON public.demos USING btree (proyecto_id, orden);
CREATE INDEX IF NOT EXISTS faqs_publicado_idx ON public.faqs USING btree (publicado, orden);
CREATE INDEX IF NOT EXISTS profiles_rol_idx ON public.profiles USING btree (rol);
CREATE INDEX IF NOT EXISTS proyecto_imagenes_proyecto_idx ON public.proyecto_imagenes USING btree (proyecto_id, orden);
CREATE INDEX IF NOT EXISTS proyecto_tecnologias_tec_idx ON public.proyecto_tecnologias USING btree (tecnologia_id);
CREATE INDEX IF NOT EXISTS proyectos_slug_idx ON public.proyectos USING btree (slug);
CREATE INDEX IF NOT EXISTS proyectos_publicado_idx ON public.proyectos USING btree (publicado, orden);
CREATE INDEX IF NOT EXISTS proyectos_categoria_idx ON public.proyectos USING btree (categoria);
CREATE INDEX IF NOT EXISTS respuestas_consulta_idx ON public.respuestas USING btree (consulta_id, creado_en);
CREATE INDEX IF NOT EXISTS servicios_activo_idx ON public.servicios USING btree (activo, orden);
CREATE INDEX IF NOT EXISTS tecnologias_categoria_idx ON public.tecnologias USING btree (categoria, orden);
CREATE INDEX IF NOT EXISTS testimonios_publicado_idx ON public.testimonios USING btree (publicado, orden);
CREATE INDEX IF NOT EXISTS trayectoria_tipo_idx ON public.trayectoria USING btree (tipo, desde DESC);
CREATE INDEX IF NOT EXISTS visitas_path_idx ON public.visitas USING btree (path, creado_en DESC);
CREATE INDEX IF NOT EXISTS visitas_creado_idx ON public.visitas USING btree (creado_en DESC);
CREATE INDEX IF NOT EXISTS visitas_registrado_idx ON public.visitas USING btree (es_registrado, creado_en DESC);
CREATE INDEX IF NOT EXISTS visitas_session_idx ON public.visitas USING btree (session_id);
CREATE INDEX IF NOT EXISTS visitas_creado_en_idx ON public.visitas USING btree (creado_en);
CREATE INDEX IF NOT EXISTS vistas_proyecto_proyecto_idx ON public.vistas_proyecto USING btree (proyecto_id);
