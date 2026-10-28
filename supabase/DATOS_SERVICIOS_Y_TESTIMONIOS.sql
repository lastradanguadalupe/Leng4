-- =============================================================================
-- DATOS_SERVICIOS_Y_TESTIMONIOS.sql
--
-- Completa el contenido que pide el diseño: 8 servicios y 6 testimonios.
-- CORRER DESPUÉS de AJUSTES_PENDIENTES.sql (usa las columnas `entregables`,
-- `servicio` y `estrellas` que crea ese archivo).
--
-- Es aditivo e idempotente: no borra filas ni columnas y se puede correr más de
-- una vez (cada INSERT verifica que la fila no exista).
--
-- Los testimonios son ILUSTRATIVOS (personas y empresas ficticias) y así se
-- aclara en el sitio y en el README.
-- =============================================================================

-- 1. Servicios nuevos (5) --------------------------------------------------------
INSERT INTO public.servicios (titulo, slug, descripcion, icono, activo, orden, entregables)
SELECT v.titulo, v.slug, v.descripcion, v.icono, TRUE, v.orden, v.entregables
FROM (VALUES
  ('Aplicaciones web y SaaS', 'aplicaciones-web-y-saas',
   'Productos con cuentas, roles y paneles de gestión, listos para crecer de un prototipo a un servicio en uso.',
   'capas', 2, ARRAY['Autenticación y roles', 'Panel de administración', 'Métricas de uso']),
  ('Bases de datos y Supabase', 'bases-de-datos-y-supabase',
   'Modelado relacional en PostgreSQL con políticas de seguridad a nivel de fila y migraciones versionadas.',
   'base-datos', 4, ARRAY['Modelo entidad-relación', 'Políticas RLS', 'Migraciones SQL']),
  ('E-commerce y pasarelas de pago', 'ecommerce-y-pasarelas-de-pago',
   'Tiendas con catálogo, carrito y cobro online, con el flujo de compra cuidado de punta a punta.',
   'carrito', 5, ARRAY['Catálogo y carrito', 'Integración de pagos', 'Gestión de pedidos']),
  ('UX/UI, prototipado y animaciones', 'ux-ui-prototipado-y-animaciones',
   'Interfaces pensadas desde el uso real: prototipos navegables y animaciones que guían sin distraer.',
   'lapiz', 6, ARRAY['Prototipo navegable', 'Sistema de diseño', 'Animaciones web']),
  ('Integraciones y automatización', 'integraciones-y-automatizacion',
   'Conectamos tus herramientas y automatizamos las tareas repetitivas para que el equipo pierda menos tiempo.',
   'enlace', 7, ARRAY['Conexión entre sistemas', 'Flujos automatizados', 'Avisos y reportes'])
) AS v(titulo, slug, descripcion, icono, orden, entregables)
WHERE NOT EXISTS (SELECT 1 FROM public.servicios s WHERE s.slug = v.slug);

-- 2. Orden de los 8 servicios que se muestran --------------------------------------
UPDATE public.servicios SET orden = 1 WHERE slug = 'desarrollo-web-a-medida';
UPDATE public.servicios SET orden = 3 WHERE slug = 'apis-y-bases-de-datos';
UPDATE public.servicios SET orden = 8 WHERE slug = 'asesoria-tecnica';

-- "Landing pages" no está entre los 8 pedidos por la consigna: se oculta (no se
-- borra). Para volver a mostrarlo: UPDATE public.servicios SET activo = TRUE WHERE slug = 'landing-pages';
UPDATE public.servicios SET activo = FALSE, orden = 9 WHERE slug = 'landing-pages';

-- 3. Testimonios nuevos (3 -> 6) ---------------------------------------------------
INSERT INTO public.testimonios (autor, rol_autor, empresa, texto, publicado, orden, servicio, estrellas)
SELECT v.autor, v.rol_autor, v.empresa, v.texto, TRUE, v.orden, v.servicio, 5
FROM (VALUES
  ('Julieta Barrionuevo', 'Gerente comercial', 'Distribuidora Del Sur',
   'Pasamos de pedidos por planilla a una tienda donde cada cliente ve su lista de precios. Se redujeron los errores de carga y el equipo de ventas respira.',
   4, 'E-commerce y pasarelas de pago'),
  ('Facundo Ibarra', 'Director de producto', 'Cooperativa Horizonte',
   'Teníamos la idea y no sabíamos por dónde arrancar. Nos armaron un prototipo navegable en pocos días y recién después se escribió código. Eso nos ahorró mucho ida y vuelta.',
   5, 'UX/UI, prototipado y animaciones'),
  ('Carolina Sosa', 'Responsable de operaciones', 'Taller Metalúrgico Sosa',
   'Conectaron el sistema de stock con los avisos por correo y ahora nadie carga los mismos datos dos veces. Entregaron documentado y respondieron cada duda posterior.',
   6, 'Integraciones y automatización')
) AS v(autor, rol_autor, empresa, texto, orden, servicio)
WHERE NOT EXISTS (SELECT 1 FROM public.testimonios t WHERE t.autor = v.autor);

-- 4. Comprobación -----------------------------------------------------------------
SELECT 'servicios activos' AS control, count(*) AS cantidad FROM public.servicios WHERE activo
UNION ALL
SELECT 'servicios activos con 3 entregables', count(*) FROM public.servicios WHERE activo AND cardinality(entregables) = 3
UNION ALL
SELECT 'testimonios publicados', count(*) FROM public.testimonios WHERE publicado;
-- Esperado: 8 / 8 / 6
