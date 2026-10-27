-- ==============================================================================
-- seed.sql
-- Datos iniciales y de demostración para Portfolio Fullstack - TPI Lenguajes 4
-- ==============================================================================

-- 1. SERVICIOS PROFESIONALES OFERTADOS
INSERT INTO public.servicios (id, title, description, icon_svg, features, orden, is_active)
VALUES
(
    '11111111-1111-1111-1111-111111111101',
    'Desarrollo Web Fullstack Moderno',
    'Construcción de aplicaciones web de alto impacto, escalables y resilientes de extremo a extremo. Arquitecturas basadas en microservicios, SPA y SSR con estándares de calidad Awwwards.',
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6049ea" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>',
    ARRAY['Single Page Applications (SPA) & SSR', 'Bases de datos SQL & NoSQL optimizadas', 'Integraciones de pasarelas de pago y WebSockets', 'Rendimiento 95+ en Google Lighthouse'],
    1,
    true
),
(
    '11111111-1111-1111-1111-111111111102',
    'Arquitectura de APIs & Backend Serverless',
    'Diseño e implementación de APIs RESTful y GraphQL robustas, seguras con OAuth2/JWT y desplegadas en infraestructuras Edge Functions de baja latencia con Supabase o Node.js.',
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6049ea" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>',
    ARRAY['Modelado relacional y políticas de seguridad RLS', 'Caché con Redis y Edge Caching', 'Documentación interactiva OpenAPI / Swagger', 'Webhooks y automatizaciones asíncronas'],
    2,
    true
),
(
    '11111111-1111-1111-1111-111111111103',
    'Diseño UX/UI & Animaciones Avanzadas',
    'Creación de interfaces inmersivas con estética Dark Minimalist, tipografía de alta jerarquía, microinteracciones fluidas a 60fps con GSAP, ScrollTrigger, Lenis y animaciones Lottie.',
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6049ea" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>',
    ARRAY['Design System personalizado en tokens CSS', 'Animaciones de scroll horizontal y pin con GSAP', 'Accesibilidad AA y navegación por teclado', 'Experiencia Mobile-First de alta fidelidad'],
    3,
    true
),
(
    '11111111-1111-1111-1111-111111111104',
    'Consultoría Técnica & Auditoría de Rendimiento',
    'Análisis exhaustivo de bases de código existentes, optimización de Core Web Vitals, reestructuración de esquemas de bases de datos y migración segura hacia servicios cloud modernos.',
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6049ea" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    ARRAY['Diagnóstico de consultas lentas en Postgres', 'Mitigación de vulnerabilidades OWASP Top 10', 'Refactorización y tipado riguroso', 'Estrategias de despliegue continuo (CI/CD)'],
    4,
    true
)
ON CONFLICT (id) DO NOTHING;

-- 2. PROYECTOS DESTACADOS
INSERT INTO public.proyectos (id, slug, title, short_description, full_description, thumbnail_url, gallery_urls, tech_stack, repo_url, demo_url, featured, published, orden)
VALUES
(
    '22222222-2222-2222-2222-222222222201',
    'nexus-analytics-saas',
    'Nexus Cloud Analytics Platform',
    'Plataforma integral de métricas en tiempo real para aplicaciones distribuidas con visualización gráfica interactiva y geolocalización de tráfico.',
    'Nexus es una solución SaaS diseñada para desarrolladores que necesitan monitorear tráfico de alta concurrencia con métricas parametrizadas por día, semana y mes. Construido con PostgreSQL, Supabase RLS, Chart.js dinámico y microfrontends modulares. Soporta alertas automáticas vía email y exportación de reportes analíticos.',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    ARRAY['https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80'],
    ARRAY['JavaScript ES', 'PostgreSQL', 'Supabase', 'Chart.js', 'Bootstrap 5', 'Vercel'],
    'https://github.com/developer/nexus-analytics',
    'https://nexus-analytics.demo.dev',
    true,
    true,
    1
),
(
    '22222222-2222-2222-2222-222222222202',
    'aura-ecommerce-headless',
    'Aura Headless Luxury Storefront',
    'Experiencia de comercio electrónico de lujo con renderizado ultra-rápido, animaciones GSAP de 60fps y checkout seguro.',
    'Un e-commerce conceptual de alta gama centrado en una experiencia estética impecable inspirada en Awwwards. Utiliza navegación fluida con scroll suave Lenis, transiciones de vista de catálogo 3D con tilt interactivo, persistencia de sesión con OAuth2 y procesamiento reactivo de pedidos.',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
    ARRAY['https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1200&q=80'],
    ARRAY['GSAP', 'Lenis', 'Supabase Auth', 'Stripe API', 'HTML5 Canvas', 'CSS3'],
    'https://github.com/developer/aura-storefront',
    'https://aura-store.demo.dev',
    true,
    true,
    2
),
(
    '22222222-2222-2222-2222-222222222203',
    'vortex-task-collab',
    'Vortex Collaborative Task Flow',
    'Sistema de gestión de proyectos y tareas en tiempo real con sincronización bidireccional y tableros kanban interactivos.',
    'Vortex permite a equipos ágiles organizar sprints, asignar responsabilidades y chatear contextualmente dentro de cada tarea. Implementa listeners de Supabase Realtime, drag and drop nativo accesible, notificaciones de escritorio y registro de auditoría de actividad para administradores.',
    'https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?auto=format&fit=crop&w=1200&q=80',
    ARRAY['https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80'],
    ARRAY['Supabase Realtime', 'PostgreSQL', 'WebSockets', 'Bootstrap 5', 'Lottie'],
    'https://github.com/developer/vortex-collab',
    'https://vortex-flow.demo.dev',
    true,
    true,
    3
),
(
    '22222222-2222-2222-2222-222222222204',
    'pulse-dev-portfolio-system',
    'Pulse Portfolio & Operator CRM',
    'Arquitectura de portfolio para desarrolladores fullstack con CRM de operadores para atención de consultas y estadísticas.',
    'El sistema integral diseñado como Trabajo Práctico Integrador de Lenguajes 4: gestión de visitas y accesos autenticados, consultas parametrizadas en PostgreSQL, panel operador con respuestas por correo electrónico e integración con Web APIs modernas (GitHub, Clima, GeoIP, Share API).',
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
    ARRAY['https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80'],
    ARRAY['PostgreSQL', 'Supabase', 'Chart.js', 'GSAP', 'Resend API', 'GitHub API'],
    'https://github.com/developer/pulse-portfolio',
    'https://pulse-portfolio.demo.dev',
    true,
    true,
    4
)
ON CONFLICT (id) DO NOTHING;

-- 3. DEMOS INTERACTIVAS (Para usuarios registrados)
INSERT INTO public.demos (id, proyecto_id, title, description, embed_url, interactive_type, is_public_preview, orden)
VALUES
(
    '33333333-3333-3333-3333-333333333301',
    '22222222-2222-2222-2222-222222222201',
    'Simulador Interactivo de Gráficos Nexus',
    'Permite ajustar parámetros de tráfico, filtrar por rangos temporales y previsualizar la respuesta de las funciones RPC de PostgreSQL en tiempo real.',
    'https://charts-demo.internal/preview',
    'component',
    false,
    1
),
(
    '33333333-3333-3333-3333-333333333302',
    '22222222-2222-2222-2222-222222222202',
    'Explorador 3D de Productos Aura',
    'Demostración interactiva de renderizado dinámico con manipulación de rotación y texturas usando WebGL y shaders ligeros.',
    'https://aura-3d.internal/preview',
    'canvas',
    false,
    2
),
(
    '33333333-3333-3333-3333-333333333303',
    '22222222-2222-2222-2222-222222222203',
    'Tablero Kanban Reactivo Vortex',
    'Módulo de prueba de sincronización colaborativa donde puedes arrastrar tarjetas, editar prioridades y simular usuarios simultáneos.',
    'https://vortex-demo.internal/preview',
    'component',
    false,
    3
)
ON CONFLICT (id) DO NOTHING;

-- 4. CONSULTAS DE PRUEBA (Para el Panel de Operadores)
INSERT INTO public.consultas (id, nombre, email, tipo, asunto, mensaje, estado, ip_origen, pais, ciudad, created_at)
VALUES
(
    '44444444-4444-4444-4444-444444444401',
    'Lucía Gómez (Tech Lead en InnovaLab)',
    'lucia.gomez@innovalab.io',
    'cotizacion',
    'Cotización para refactorización de portal B2B',
    'Hola, vimos tus proyectos en el portfolio y estamos buscando un desarrollador Fullstack Senior para renovar nuestra plataforma de clientes. Nos interesa la integración con Supabase y animaciones GSAP. ¿Cuál es tu disponibilidad y tarifa horaria para comenzar el próximo mes?',
    'nueva',
    '181.44.120.5',
    'Argentina',
    'Córdoba',
    timezone('utc'::text, now() - INTERVAL '3 hours')
),
(
    '44444444-4444-4444-4444-444444444402',
    'Marcos Benítez (Fundador de NexoPay)',
    'marcos@nexopay.co',
    'asesoria',
    'Asesoría en arquitectura de base de datos Postgres y RLS',
    'Estimado, requerimos una asesoría puntual de 5 horas para auditar nuestras políticas de seguridad RLS en Supabase y optimizar ciertas consultas analíticas complejas que tienen cuellos de botella.',
    'en_seguimiento',
    '190.225.10.88',
    'Argentina',
    'Buenos Aires',
    timezone('utc'::text, now() - INTERVAL '1 day')
),
(
    '44444444-4444-4444-4444-444444444403',
    'Camila Duarte',
    'camila.duarte@gmail.com',
    'general',
    'Felicitaciones por el diseño y consulta sobre stack',
    '¡Increíble trabajo con la estética oscura y las animaciones! Quería consultarte qué librería utilizaste para el scroll horizontal y cómo gestionas la autenticación entre Supabase y Vercel. Un saludo.',
    'respondida',
    '186.130.40.12',
    'Argentina',
    'Rosario',
    timezone('utc'::text, now() - INTERVAL '4 days')
)
ON CONFLICT (id) DO NOTHING;

-- 5. HISTORIAL DE RESPUESTA DE OPERADOR
-- Nota: para asociar a un operador real, cuando se cree el usuario operador se actualiza el operador_id
-- o se inserta la respuesta desde la interfaz.

-- 6. VISITAS DE ANALYTICS HISTÓRICAS DE EJEMPLO (Últimos 14 días para gráficos inmediatos)
INSERT INTO public.analytics_visitas (session_id, is_authenticated, page_path, ip_hash, pais, ciudad, device_type, visited_at, fecha)
SELECT
    'session_' || i || '_' || s,
    (s % 3 = 0), -- 33% autenticadas
    CASE (s % 4)
        WHEN 0 THEN '/'
        WHEN 1 THEN '/#proyectos'
        WHEN 2 THEN '/manual'
        ELSE '/#contacto'
    END,
    md5('ip_' || i || '_' || s),
    CASE (s % 3)
        WHEN 0 THEN 'Argentina'
        WHEN 1 THEN 'Uruguay'
        ELSE 'Chile'
    END,
    CASE (s % 3)
        WHEN 0 THEN 'Buenos Aires'
        WHEN 1 THEN 'Montevideo'
        ELSE 'Santiago'
    END,
    CASE (s % 2)
        WHEN 0 THEN 'desktop'
        ELSE 'mobile'
    END,
    (CURRENT_DATE - (i || ' days')::INTERVAL) + ((s * 45) || ' minutes')::INTERVAL,
    (CURRENT_DATE - (i || ' days')::INTERVAL)::DATE
FROM generate_series(0, 14) AS i,
     generate_series(1, 8) AS s
WHERE NOT EXISTS (
    SELECT 1 FROM public.analytics_visitas WHERE session_id LIKE 'session\_%'
);

-- 7. VISTAS DE PROYECTOS HISTÓRICAS
INSERT INTO public.project_views (proyecto_id, session_id, viewed_at, fecha)
SELECT
    CASE (s % 4)
        WHEN 0 THEN '22222222-2222-2222-2222-222222222201'::UUID
        WHEN 1 THEN '22222222-2222-2222-2222-222222222202'::UUID
        WHEN 2 THEN '22222222-2222-2222-2222-222222222203'::UUID
        ELSE '22222222-2222-2222-2222-222222222204'::UUID
    END,
    'session_pv_' || i || '_' || s,
    (CURRENT_DATE - (i || ' days')::INTERVAL) + ((s * 30) || ' minutes')::INTERVAL,
    (CURRENT_DATE - (i || ' days')::INTERVAL)::DATE
FROM generate_series(0, 14) AS i,
     generate_series(1, 5) AS s
WHERE NOT EXISTS (
    SELECT 1 FROM public.project_views WHERE session_id LIKE 'session\_pv\_%'
);
