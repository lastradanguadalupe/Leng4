# Portfolio Fullstack Developer & CRM de Operador / Administrador
### Trabajo Práctico Integrador – Lenguajes 4 (2026)

Plataforma web profesional para un Desarrollador Fullstack con panel de gestión para operadores, panel de control y analítica para administradores, autenticación en Supabase (Email + Google OAuth), y sistema de diseño Dark Minimalist de alto impacto inspirado en Awwwards y Behance.

---

## 🚀 1. Características Principales

### A. Para Visitantes y Usuarios Registrados
- **Hero & Presentación**: Tipografía dinámica Raleway, marquee tecnológico continuo, badges animados y microinteracciones de cursor magnético con halo morado pastel (`#6049ea`).
- **Servicios & Tecnologías**: Renderizado dinámico de especialidades fullstack desde PostgreSQL con efectos 3D Tilt y spotlight especular.
- **Demos Interactivas Restringidas**: Visualización de proyectos para todos los visitantes, pero acceso a las **demos ejecutables en vivo (canvas y sandbox)** bloqueado exclusivamente para **usuarios autenticados**, incentivando el registro con un CTA inmersivo.
- **Formulario de Contacto Avanzado**: Soporta consultas generales, cotizaciones y asesoría técnica; protegido contra spam mediante técnica **Honeypot** y **Rate Limiting** por IP/sesión; guarda en base de datos y dispara notificación por correo electrónico.
- **Web APIs Modernas (Nivel 5 Integrantes)**:
  - **GitHub REST API**: Obtención en tiempo real de repositorios, estrellas, forks y lenguajes del desarrollador con fallback en caché.
  - **IP Geolocation & Open-Meteo API**: Detección geográfica del visitante con widget en vivo de clima y hora local.
  - **Clipboard & Web Share API**: Compartir el portfolio o copiar email con un solo clic.

### B. Para el Rol Operador
- **Panel de Consultas**: Filtrado reactivo por tipo (`general`, `cotizacion`, `asesoria`) y por estado (`nueva`, `en_seguimiento`, `respondida`), además de búsqueda en vivo con debounce.
- **Gestión de Respuestas por Correo**: Editor para responder directamente al cliente por email mediante Edge Function (Resend) con registro y auditoría del historial de comunicaciones.

### C. Para el Rol Administrador (Requisitos de Promoción / Aprobación Directa)
- **CRUD Completo de Contenidos**:
  - Proyectos (título, slug amigable, descripción corta/completa, stack tecnológico, URLs de demo y GitHub, publicación).
  - Demos interactivas y Servicios ofertados.
  - Subida de imágenes a Supabase Storage con **validación estricta de firma de archivo (Magic Bytes)** contra extensiones camufladas.
- **Gestión de Usuarios Registrados**: Búsqueda, cambio de roles en vivo (`registrado`, `operador`, `admin`), bloqueo de cuentas (`is_blocked`) y eliminación controlada.
- **Métricas y Contadores de Visitas (Analytics)**:
  - Contador de visitas generales (visitante único por sesión).
  - Contador específico de accesos de usuarios autenticados.
- **Gráficos Interactivos Parametrizados (Chart.js + RPC Postgres)**:
  - Filtro por rango de fechas y agrupación temporal (`día`, `semana`, `mes`).
  - Gráfico de Tráfico general vs. autenticado.
  - Gráfico de distribución de Consultas por tipo.
  - Gráfico de tendencia de nuevos registros de usuarios.
  - Gráfico de Proyectos más visualizados.

---

## 🎨 2. Sistema de Diseño (Design System)

Inspirado en los portfolios más premiados de Awwwards y en el manual de marca entregable (`/manual.html`):

| Token CSS | Valor | Uso |
|---|---|---|
| `--color-bg` | `#000000` | Fondo negro absoluto, máximo contraste y elegancia OLED |
| `--color-text` | `#ffffff` | Texto principal, títulos e iconografía primaria |
| `--color-accent` | `#6049ea` | Morado pastel de acento: botones, halos, gradientes y glows |
| `--color-surface` | `rgba(255, 255, 255, 0.04)` | Superficies glassmorphism con backdrop-filter blur(16px) |
| `--color-border` | `rgba(255, 255, 255, 0.08)` | Bordes sutiles de 1px |
| `--font-main` | `'Raleway', sans-serif` | Tipografía principal (pesos 300 a 900) |

---

## 👥 3. Usuarios de Demostración (Seed)

Para probar los diferentes roles y permisos en la plataforma:

| Rol | Correo Electrónico | Contraseña Demo | Permisos |
|---|---|---|---|
| **Administrador** | `admin@portfolio.dev` | `Admin1234!` | Acceso total: CRUD, gestión de usuarios y analítica |
| **Operador** | `operador@portfolio.dev` | `Operador1234!` | Gestión y respuesta por email a consultas y cotizaciones |
| **Registrado** | `usuario@portfolio.dev` | `Usuario1234!` | Acceso completo al sandbox y demos interactivas |

---

## 🛠️ 4. Estructura del Proyecto

```
Leng4/
├── .env.example                       # Variables de entorno documentadas
├── vercel.json                        # Configuración de despliegue y headers de seguridad
├── README.md                          # Documentación del proyecto
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql     # Tablas: profiles, proyectos, demos, servicios, consultas, analytics
│   │   ├── 002_rls_policies.sql       # Políticas RLS estrictas por rol
│   │   ├── 003_analytics_rpc.sql      # Funciones RPC en Postgres para gráficos parametrizados
│   │   └── 004_storage_setup.sql      # Configuración de bucket 'portfolio-assets'
│   ├── seed.sql                       # Datos iniciales realistas para evaluación
│   └── functions/
│       ├── send-email/index.ts        # Edge Function: Notificación de nuevo contacto
│       └── reply-contact/index.ts     # Edge Function: Respuesta de operador por email
└── public/
    ├── index.html                     # Landing page principal
    ├── login.html                     # Auth: Login, Registro, Google OAuth, Recuperar
    ├── manual.html                    # Anteproyecto: Manual de Marca / Guía de Estilo (Behance)
    ├── terminos.html                  # Legal: Términos y condiciones
    ├── privacidad.html                # Legal: Política de privacidad (Ley 25.326)
    ├── cookies.html                   # Legal: Política de cookies + gestión del consentimiento
    ├── panel/
    │   ├── admin.html                 # Panel de Administrador
    │   └── operador.html              # Panel de Operador
    ├── css/
    │   ├── variables.css              # Tokens de diseño y paleta
    │   ├── bootstrap-custom.css       # Overrides y personalización de Bootstrap 5
    │   ├── animations.css             # Micro-animaciones, glows y keyframes
    │   ├── components.css             # Modales, toasts, cursor, cards y badges
    │   └── main.css                   # Layout global y reset
    └── js/
        ├── config.js                  # Configuración global y credenciales
        ├── core/                      # Supabase client, Auth, Storage y Seguridad
        ├── services/                  # Servicios API (Proyectos, Consultas, Usuarios, Analytics, GitHub, Clima)
        ├── components/                # Navbar, Cursor, Toast, Modal
        ├── animations/                # GSAP, Lenis Smooth Scroll, 3D Tilt
        └── pages/                     # Controladores de página
```

---

## 🏷️ 4.b Nombre de la Marca (pendiente de definición)

El proyecto **todavía no tiene nombre**. Mientras no lo tenga, el sitio muestra
únicamente el isotipo `✦` en la navbar y en el footer.

Cuando el equipo lo decida, se completa en **un solo lugar**:

```js
// public/js/core/brand.js
export const BRAND_NAME = null;   // ← poner acá el nombre, entre comillas
```

Con eso el nombre aparece automáticamente en la navbar, el footer, el `<title>`
de cada página y la línea legal. Los elementos que lo reciben están marcados en
el HTML con `data-brand-name`, `data-brand-tagline` y `data-brand-legal`.

---

## ⚖️ 4.c Páginas Legales y Consentimiento

- **`/terminos`**, **`/privacidad`** y **`/cookies`** (con *rewrites* en `vercel.json`).
- La Política de privacidad detalla qué datos se recolectan, con qué finalidad,
  cuánto se conservan y cómo ejercer los derechos de acceso, rectificación y
  supresión, con mención expresa de la **Ley 25.326** y de la Agencia de Acceso
  a la Información Pública.
- Un **banner discreto** pide consentimiento para la analítica. Si la persona
  **rechaza, no se cuenta la visita**: ni `AnalyticsService.recordVisit()` ni
  `ProyectosService.recordView()` se ejecutan, y no se crea el identificador de
  sesión. La preferencia se puede cambiar desde la propia Política de cookies.
- La dirección IP del visitante **no se almacena**: se guarda un hash SHA-256
  truncado e irreversible.

> Las tres páginas incluyen un aviso visible de que se trata de un proyecto académico.

---

## 💻 5. Instrucciones de Ejecución Local (Localhost)

1. **Configuración de variables de entorno**:
   - Copia `.env.example` a `.env`.
   - Coloca tu `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

2. **Ejecución de Migraciones en Supabase**:
   - En tu proyecto de Supabase, ve a la sección **SQL Editor**.
   - Ejecuta en orden los archivos de `supabase/migrations/`:
     - `001_initial_schema.sql`
     - `002_rls_policies.sql`
     - `003_analytics_rpc.sql`
     - `004_storage_setup.sql`
   - Opcionalmente ejecuta `supabase/seed.sql` para tener proyectos, servicios y métricas de demostración cargadas al instante.

3. **Iniciar el servidor local**:
   - Al estar construido en **JavaScript Vanilla con Módulos ES**, no requiere procesos de compilación complejos. Puedes servir la carpeta `public/` con cualquier servidor estático:
     ```bash
     # Con npx serve
     npx serve public -p 3000

     # Con Python
     python -m http.server 3000 --directory public

     # Con Live Server de VS Code / IDE
     # Clic derecho en public/index.html -> Open with Live Server
     ```
   - Abre tu navegador en `http://localhost:3000`.

---

## ☁️ 6. Despliegue en Vercel

1. Sube el repositorio a **GitHub**.
2. Ingresa a [Vercel](https://vercel.com) y selecciona **Add New Project** -> Importa tu repositorio.
3. En **Root Directory**, selecciona `public` (o deja la raíz ya que `vercel.json` se encarga del enrutamiento).
4. En **Environment Variables**, define:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Haz clic en **Deploy**. ¡El sitio estará disponible globalmente con certificados SSL y CDN!
