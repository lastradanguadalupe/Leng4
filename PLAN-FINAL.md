# Plan para terminar el TP Integrador — Lenguajes 4

> **Para el modelo que ejecute esto:** leé entero el bloque "Contexto" antes de
> tocar un archivo. Hay un desfasaje de esquema entre el repositorio y la base
> de datos que ya se corrigió en el código, y si lo desconocés vas a "arreglar"
> cosas que están bien y romper lo que funciona.
>
> Las tareas están ordenadas por dependencia. Hacelas de a una, en orden, y
> verificá cada criterio de aceptación antes de pasar a la siguiente.

Estado al escribir este plan: rama `gaston/setup-entorno`, 3 commits, el último
sin pushear. Base de datos **sin** el SQL aplicado.

---

## Contexto que no se puede ignorar

### 1. La base está en español, el repositorio en inglés

Las migraciones de `supabase/migrations/001..004` describen un esquema en inglés
(`title`, `description`, `is_active`, `published`, `tech_stack`) que **nunca se
aplicó** a ningún proyecto de Supabase. La base real usa español.

**No ejecutes `001..004`.** Crearían tablas paralelas y romperían lo que anda.
Si sobra tiempo al final, reescribilas para que reflejen la base real (tarea 11).

Esquema real, verificado columna por columna contra la API:

| Tabla | Columnas |
|---|---|
| `servicios` | `id, titulo, slug, descripcion, icono, precio_desde, destacado, activo, orden, creado_en` |
| `proyectos` | `id, titulo, slug, resumen, descripcion*, imagen_portada, categoria, anio, destacado, publicado, orden, url_repo*, cliente*, creado_en` |
| `demos` | `id, titulo, proyecto_id, tipo, instrucciones, orden, creado_en` |
| `testimonios` | `id, autor, rol_autor, empresa, texto, avatar_url, publicado, orden` |
| `consultas` | `id, nombre, email, telefono, tipo, asunto, mensaje, estado, pais, ciudad, creado_en` |
| `respuestas` | `id, consulta_id, operador_id, cuerpo, creado_en, enviado_en` |
| `profiles` | `id, rol, nombre, email, avatar_url, creado_en` |
| `visitas` | `id, session_id, pais, creado_en` |
| `tecnologias` | `id, nombre, categoria, icono, nivel, orden` |
| `proyecto_tecnologias` | `proyecto_id, tecnologia_id` |

Las marcadas con `*` **no son legibles por el rol `anon`**: es el bloqueo del
detalle que exige la consigna, hecho con permisos por columna. No lo toques.
`demos` devuelve 0 filas a un visitante por RLS, por el mismo motivo.

Existe además una vista `proyectos_publicos` con las columnas públicas.

### 2. Hay dos proyectos de Supabase en juego

- `rhiayaozcmbqxrqzxvcd` — al que apunta `public/js/config.js` hoy.
- Uno **nuevo**, en la cuenta de Guadalupe, donde ella cargó 8 servicios.
  Falta que pase la URL y la clave `sb_publishable_...`.

**Si el proyecto nuevo ya está disponible, la tarea 0 es obligatoria y va primero.**

### 3. Regla de oro: nunca inventar datos

En este proyecto ya aparecieron **tres** lugares que fabricaban información y la
mostraban como real. Los tres se corrigieron:

- El gráfico "proyectos más vistos" devolvía `total_views: (limit - idx) * 12`.
- `github.service.js` devolvía tres repositorios ficticios con estrellas falsas.
- El historial del operador marcaba el correo como enviado sin haberlo enviado.

Si una consulta falla, mostrá un estado vacío o de error. **No rellenes con
números verosímiles.** Es un trabajo que se evalúa.

### 4. Lo que está verificado y lo que no

**Verificado en navegador** (1920/1440/1280/768/360): hero, servicios y
proyectos cargando de la base, footer, 3 páginas legales, banner de cookies,
ojo de contraseña en los 5 campos, guards de ruta, protección de redirección
abierta, y 8 consultas de lectura que antes fallaban con `42703`.

**Sin verificar, hay que probarlo a mano:** los 4 flujos de login, el envío del
formulario de contacto, y el interior de los dos paneles (necesitan sesión con
rol `operador` o `admin`, que depende del SQL).

### 5. Restricciones de diseño

- Paleta: **solo** `#000000`, `#ffffff`, `#6049ea`. Derivados con opacidad.
- Tipografía: **solo** Raleway.
- Framework CSS: Bootstrap 5 (es obligatorio por consigna, no lo saques).
- Respetar `prefers-reduced-motion` en toda animación nueva.
- El nombre de la marca se define **solo** en `BRAND_NAME` (`js/core/brand.js`).
  Hoy está en `null` y se muestra solo el isotipo ✦. No hardcodees nombres.

### 6. Servidor local

`python -m http.server` **no** manda `Cache-Control` y el navegador se queda con
los módulos JS viejos, lo que hace imposible verificar cambios. Usá un servidor
que mande `no-store`. Si editás un módulo y no ves el cambio, es la caché:
forzá recarga con Ctrl+Shift+R.

---

## Tarea 0 — Apuntar al proyecto de Supabase nuevo

**Solo si ya tenés la URL y la clave.** Si no, saltá a la tarea 1.

1. En `public/js/config.js`, reemplazar `SUPABASE_URL` y `SUPABASE_ANON_KEY`.
   Actualizar también `.env` (hoy es decorativo: nadie lo lee, ver tarea 12).
2. **Antes de tocar nada más**, mapear el esquema del proyecto nuevo y
   compararlo con la tabla del Contexto. Para cada tabla, probar columna por
   columna: HTTP 200 = legible, 400 = no existe, 401/403 = existe sin permiso.
3. Correr `await __diag()` en la consola del navegador: imprime config, estado
   de la API, tablas legibles y si el detalle sigue protegido.
4. **Si algún nombre cambió, pará y reportalo** antes de seguir. No ajustes el
   código a ciegas.

**Aceptación:** `__diag()` dice "Sin problemas detectados" y las secciones de
servicios y proyectos cargan de la base nueva.

---

## Tarea 1 — Arreglar la sensación de lag al scrollear

**Diagnóstico ya hecho, no lo repitas.** Medí los tiempos de frame mientras
scrolleaba: **60 FPS estables, 16,7 ms promedio, peor frame 17,6 ms, cero frames
caídos.** El problema **no** es rendimiento ni la computadora.

La causa es **Lenis**, la librería de scroll suave. Estaba cargando desde una URL
que daba 404, así que el sitio usaba scroll nativo (instantáneo). Al corregir el
CDN, Lenis empezó a funcionar con `duration: 1.2`: la rueda ya no mueve la página
al instante, la desliza durante más de un segundo. Eso se siente como lag aunque
no se caiga ningún frame.

Hay además un conflicto: `document.documentElement` tiene
`scroll-behavior: smooth` **y** Lenis activo al mismo tiempo (verificado:
`clases_html: "lenis lenis-smooth"` + `scroll_behavior_css: "smooth"`). Dos
mecanismos de scroll suave peleando entre sí.

**Qué hacer en `public/js/animations/lenis-scroll.js`:**

1. Bajar la suavidad a algo que se sienta inmediato: reemplazar
   `duration: 1.2` por `lerp: 0.12` (Lenis usa uno o el otro, no ambos).
   Si prefieren mantener `duration`, bajarlo a `0.6` como máximo.
2. Eliminar el conflicto: cuando Lenis se inicializa correctamente, poner
   `document.documentElement.style.scrollBehavior = "auto"`. El `smooth` nativo
   debe quedar **solo** en las ramas de fallback y de `prefers-reduced-motion`.
3. Agregar un interruptor: si `BRAND`/`CONFIG` tiene `SMOOTH_SCROLL: false`, no
   inicializar Lenis. Así se puede apagar sin borrar código.

**Aceptación:** la rueda mueve la página sin sensación de arrastre;
`getComputedStyle(document.documentElement).scrollBehavior` devuelve `"auto"`
con Lenis activo; `await __diag()` sigue sin errores.

### Tarea 1.b — Bajar el costo de las animaciones (opcional pero recomendado)

No causa el lag en una máquina normal, pero son costos reales que van a pesar en
la notebook del aula o en un celular. Medido: **18 animaciones infinitas
simultáneas** y **12 elementos con `backdrop-filter`**.

1. **`lock-glow` y `cta-latido` animan `box-shadow`**, que repinta en cada frame.
   Hay 5 de cada una (una por tarjeta de proyecto) = 10 elementos repintando
   siempre. Reescribirlas para animar `opacity` sobre un pseudo-elemento
   `::after` con el glow ya dibujado. Animar `opacity` y `transform` es gratis
   para el compositor; `box-shadow` no.
2. **`.hero-visual::before` tiene `filter: blur(42px)` y encima se le anima
   `opacity` y `transform: scale()`** (`hero-glow-pulse`). Cada frame vuelve a
   calcular un blur de 42px. Es lo más caro de la página. Sacar el `scale()` del
   keyframe y dejar solo `opacity`; o mejor, reemplazar el `filter: blur` por un
   `radial-gradient` grande, que no necesita blur.
3. **Pausar lo que no se ve.** Con un `IntersectionObserver`, agregar una clase
   `.fuera-de-vista { animation-play-state: paused; }` a las tarjetas de proyecto
   y a la marquesina cuando salen del viewport.
4. `.project-overlay` tiene `backdrop-filter: blur(6px)` siempre activo aunque
   esté en `opacity: 0`. Aplicar el blur solo en `.project-card:hover
   .project-overlay`.

**Aceptación:** las animaciones se siguen viendo igual; las animaciones
infinitas simultáneas bajan de 18 a menos de 8 con la página quieta arriba.

---

## Tarea 2 — Correr el SQL (bloquea casi todo lo demás)

`supabase/AJUSTES_PENDIENTES.sql`, 597 líneas, se pega **completo** en
Supabase → SQL Editor → Run. Es aditivo e idempotente: no borra tablas, ni
filas, ni columnas, y se puede correr más de una vez.

Qué crea: el trigger que crea el perfil al registrarse, `profiles.bloqueado`,
`testimonios.servicio` y `.estrellas`, `servicios.entregables`, las columnas que
faltan en `visitas`, la tabla `vistas_proyecto`, y **las 7 funciones de analítica
que no existen** (hoy los contadores de visitas y los 4 gráficos no funcionan: son
requisitos de promoción).

**Aceptación:** la sección 10 del archivo imprime una tabla de control donde todo
dice `true` y "perfiles sin usuario" da `0`.

**Sin esta tarea no se puede:** asignar rol `admin` u `operador`, probar los dos
paneles, ver ningún gráfico, bloquear cuentas, ni hacer las tareas 4, 5 y 6.

---

## Tarea 3 — Asignar los roles y probar login de punta a punta

1. Registrar las tres cuentas de demostración del README
   (`admin@portfolio.dev`, `operador@portfolio.dev`, `usuario@portfolio.dev`).
2. En Supabase → Table Editor → `profiles`, poner `rol = 'admin'` y
   `rol = 'operador'` en las dos primeras.
3. Para desarrollo conviene **desactivar temporalmente** Authentication → Providers
   → Email → "Confirm email", así el registro no espera correos. Reactivarlo
   antes de la entrega.
4. Probar y anotar en una tabla (flujo | anda sí/no | causa | arreglo):
   registro, login, credenciales incorrectas, usuario sin confirmar, cuenta
   bloqueada, Google OAuth, recuperación de contraseña completa (pedir enlace →
   abrirlo → definir la nueva → entrar con ella), cerrar sesión, persistencia al
   recargar, redirección por rol, y los guards de `/panel/admin.html` y
   `/panel/operador.html` con un usuario `registrado`.

**Aceptación:** los 11 flujos andan, los mensajes de error están en español y no
exponen texto crudo de Supabase, y un `registrado` no entra a ningún panel.

---

## Tarea 4 — Sección de testimonios

**No crear la tabla: `testimonios` ya existe** con 3 filas cargadas
(Mariela Acosta / Consultorio Los Olivos, Gustavo Peralta / Estudio Peralta
Arquitectura, Romina Ledesma / Grupo Andino). La tarea 2 le agrega `servicio` y
`estrellas`.

1. Cargar **3 testimonios más** para llegar a 6, mismo tono: español rioplatense
   neutro, 2–3 líneas, empresas ficticias, sin marcas ni personas reales.
2. Crear `public/js/services/testimonios.service.js` con `getAll()` filtrando
   `publicado = true` y ordenando por `orden`.
3. Nueva sección en `index.html` después de `#servicios`, con `id="testimonios"`
   y el título "Lo que dicen quienes ya trabajaron con nosotros".
4. Tarjetas: nombre, cargo, empresa, chip del servicio, 5 estrellas, y avatar
   con **las iniciales sobre un degradé morado**. El prompt de diseño pide
   explícitamente **no usar fotos de personas**, así que no hacen falta imágenes.
   Ignorar la columna `avatar_url`, que apunta a archivos que no existen.
5. UI: dos filas en marquesina inversa con pausa en hover (reusar
   `.marquee-container`), o carrusel con arrastre. En móvil, swipe. Accesible
   por teclado.
6. Abajo, 3 contadores animados (reusar `.stat-counter-value`, ya tiene la
   animación con GSAP): proyectos entregados, clientes satisfechos, años de
   experiencia combinada.
7. **Aviso obligatorio:** una línea discreta bajo la sección aclarando que los
   testimonios son ilustrativos para el trabajo académico, y lo mismo en el
   README.
8. Sumar el CRUD de testimonios al panel de administrador, siguiendo el patrón
   de `abrirModalServicio()` en `admin.js`.
9. Agregar "Testimonios" a la navbar y al footer.

**Aceptación:** 6 testimonios cargados de la base, con skeleton/error/vacío; la
marquesina pausa en hover; los contadores animan al entrar en viewport; el aviso
está visible; el CRUD crea, edita y borra.

---

## Tarea 5 — Completar servicios a 8 y agregar "Cómo trabajamos"

Hoy hay 4 en la base. La consigna de diseño pide 8:

1. Desarrollo web a medida (frontend + backend) — ya está
2. Aplicaciones web y SaaS
3. APIs y backend (REST / GraphQL, Node.js) — ya está como "APIs y bases de datos"
4. Bases de datos y Supabase / PostgreSQL (modelado, RLS, migraciones)
5. E-commerce y pasarelas de pago
6. UX/UI, prototipado y animaciones web
7. Integraciones y automatización de procesos
8. Asesoría técnica, code review y optimización — ya está

**Si el proyecto nuevo de Guadalupe ya tiene los 8, saltá el punto de carga.**

1. Insertar los que falten con `slug`, `icono` (uno de los slugs de
   `js/data/iconos.js`; si hace falta otro, agregarlo al catálogo) y los 3
   `entregables`.
2. Mostrar los 3 entregables en cada tarjeta, en lista corta con `.feature-dot`.
3. El botón "Cotizar" ya existe y preselecciona el tipo "cotización" — verificar
   que siga andando con 8 tarjetas.
4. Sin precios en la UI: usar "Cotizá tu proyecto". La columna `precio_desde`
   existe pero **no se muestra**.
5. Nueva franja "Cómo trabajamos" con 4 pasos (Descubrimiento → Diseño y
   prototipo → Desarrollo iterativo → Entrega y soporte) y una línea de progreso
   que se dibuja al scrollear, con ScrollTrigger (`initTimelineDraw()` en
   `gsap-animations.js` ya hace algo parecido con `strokeDashoffset`).

**Aceptación:** 8 tarjetas con 3 entregables cada una; la grilla no se rompe en
360 px; la franja de 4 pasos dibuja su línea al scrollear.

---

## Tarea 6 — Imágenes: de dónde sacarlas

Hoy faltan **5 portadas de proyectos**. Las rutas están en la base
(`proyectos/gestor-turnos.webp`, etc.) pero los archivos no están en Storage:
dan HTTP 400 y se ve un respaldo con las iniciales del proyecto sobre un degradé.

**Los avatares de testimonios NO hacen falta** (ver tarea 4, punto 4).

Tres caminos, de mejor a peor para este trabajo:

**A. Dejar el respaldo generado y no subir nada.** Ya está implementado y queda
coherente con el diseño dark minimalista: iniciales sobre degradé morado. Cero
trabajo, cero riesgo de licencias, y nada se ve roto. **Es la opción que
recomiendo si el tiempo apremia.** Si eligen esto, limpiar `imagen_portada` a
`NULL` en las 5 filas para no dejar rutas muertas.

**B. Mockups generados con CSS/SVG.** Armar 5 "capturas" falsas pero propias:
una ventana de navegador en glassmorphism con una grilla, un calendario, una
tabla de precios, etc. Ya hay un patrón hecho: `.hero-code-window` en
`main.css`. Queda mejor que el stock genérico, es 100% propio y no hay licencias
que citar. Más trabajo: ~40 min por las 5.

**C. Fotos de stock libres.** Si quieren imágenes reales:
- **Unsplash** — https://unsplash.com — gratis, uso comercial permitido, no
  exige atribución. Buscar "dashboard", "laptop code", "architecture studio".
- **Pexels** — https://pexels.com — misma licencia.
- Importante: **convertir a `.webp`** (las rutas de la base esperan `.webp`),
  recortar a 16:9, bajar a ~1200 px de ancho y comprimir. Un `.jpg` de 4 MB
  arruina la carga del sitio.
- Aplicarles un overlay morado `rgba(96, 73, 234, 0.15)` para que no choquen con
  la paleta.
- Subir a Supabase → Storage → `portfolio-assets` → carpeta `proyectos/`, con
  **exactamente** los nombres que ya están en la base.
- La consigna valora el diseño propio: fotos de stock genéricas pueden jugar en
  contra. Si usan stock, que sea coherente con cada proyecto.

**Aceptación:** o las 5 portadas cargan (HTTP 200), o `imagen_portada` está en
`NULL` y se ve el respaldo. **No dejar rutas que apunten a archivos inexistentes.**

---

## Tarea 7 — Desplegar las Edge Functions

Las dos están en el repositorio pero **no desplegadas** (dan 404), así que no
sale ningún correo: ni el aviso de contacto nuevo ni la respuesta del operador.

1. `supabase functions deploy send-email` y `supabase functions deploy reply-contact`.
2. Cargar el secreto: `supabase secrets set RESEND_API_KEY=...` (hay que crear
   una cuenta gratis en resend.com y verificar un dominio o usar el de pruebas).
3. **`reply-contact/index.ts` ya se corrigió** para escribir en `respuestas` con
   la columna `cuerpo` y leer `profiles.rol`. **Revisar `send-email/index.ts`,
   que no se auditó**: puede tener los mismos nombres en inglés.
4. Probar: enviar una consulta desde el formulario y responderla desde el panel
   del operador.

**Aceptación:** llega el correo de aviso, llega la respuesta al remitente, y el
historial del operador muestra `enviado_en` con fecha (no el aviso ámbar de
"el correo no se envió").

---

## Tarea 8 — Configurar Google OAuth

1. Google Cloud Console → crear credenciales OAuth 2.0 → en "Authorized redirect
   URIs" poner exactamente `https://<ref-del-proyecto>.supabase.co/auth/v1/callback`.
2. Supabase → Authentication → Providers → Google → pegar Client ID y Secret.
3. Supabase → Authentication → URL Configuration → Site URL = el dominio de
   Vercel; Redirect URLs = `http://localhost:3000/login.html`,
   `http://127.0.0.1:3000/login.html` y `https://<deploy>.vercel.app/login.html`.

**Aceptación:** "Continuar con Google" completa el circuito y crea el perfil con
rol `registrado`.

---

## Tarea 9 — Decidir los datos que faltan

1. **El nombre del proyecto.** Definirlo en `BRAND_NAME` (`js/core/brand.js`).
   Se propaga solo a navbar, footer, `<title>` y línea legal.
2. **LinkedIn.** Hoy el ícono está oculto porque no hay usuario. Completar
   `CONFIG.DEVELOPER_INFO.linkedin` o dejarlo oculto a propósito.
3. **Textos de relleno.** Decidir qué hacer con los números del perfil (5 años,
   28 proyectos, 99.9% uptime, 150k líneas) y los 3 roles del timeline de
   experiencia ("Senior Fullstack Architect, 2024 – Presente"). Son inventados.
   Para un TP está bien que sean ilustrativos, pero conviene que sean creíbles y
   consistentes entre sí, y que el grupo pueda defenderlos si les preguntan.

---

## Tarea 10 — Verificación final antes de entregar

1. Probar en **1920, 1440, 1280, 768 y 360 px**: sin scroll horizontal, sin
   secciones vacías, sin texto cortado.
2. **Consola sin errores.** Hoy quedan 5 errores HTTP 400 de las portadas
   que no existen: los resuelve la tarea 6.
3. `await __diag()` → "Sin problemas detectados".
4. Recorrer el sitio como visitante sin cuenta, como `registrado`, como
   `operador` y como `admin`.
5. Verificar los 4 gráficos del panel con datos reales (navegar un rato primero
   para que haya visitas que contar).
6. Probar el banner de cookies: rechazar y confirmar que **no** se crea
   `portfolio_session_id` en `sessionStorage` ni se registran visitas.
7. Revisar las 3 páginas legales: `/terminos`, `/privacidad`, `/cookies`.
8. Confirmar que el deploy de Vercel sirve la versión nueva (hoy `main` sigue en
   el commit viejo y muestra el nombre "Alex Mercer", que ya no está en la rama).

---

## Tarea 11 — Reescribir las migraciones (si sobra tiempo)

`supabase/migrations/001..004` describen un esquema que no existe. Para la
documentación que pide la consigna, deberían reflejar la base real. Generarlas
desde el esquema vivo (`supabase db dump --schema public`) y reemplazar las
viejas, dejando `AJUSTES_PENDIENTES.sql` como histórico.

---

## Tarea 12 — Limpieza final

1. **`.env` es decorativo.** Nadie lo lee: `window.__ENV__` no se define en
   ningún lado y el sitio es estático sin build. Las credenciales reales están
   en `public/js/config.js`. Dos opciones: borrar `.env` y corregir el README
   (que hoy manda a configurarlo, lo cual no tiene efecto), o cargar
   `window.__ENV__` desde un `js/env.js` ignorado por git. **Recomiendo la
   primera:** es un sitio estático, el patrón `.env` no aplica, y la clave
   publishable es pública por diseño.
2. **`schema.json`** en la raíz es basura: contiene una respuesta de error de la
   API de Supabase que quedó guardada por accidente
   (`{"message":"Secret API key required"...}`). Borrarlo.
3. Falta `.env.example`, que el README menciona. Si se elige borrar `.env`, el
   README deja de necesitarlo.
4. Borrar este archivo (`PLAN-FINAL.md`) antes de la entrega final.

---

## Orden recomendado

```
0  (si hay credenciales nuevas) → 2 (SQL) → 3 (roles y login)
                                     ↓
        1 (lag) ──────────────────── 4 (testimonios) ── 5 (8 servicios)
                                     ↓
                    6 (imágenes) ── 7 (Edge Functions) ── 8 (Google)
                                     ↓
                            9 (datos) → 10 (verificación) → 12 (limpieza)
```

La tarea 1 es independiente y rápida: se puede hacer en cualquier momento.
La tarea 2 bloquea 3, 4, 5 y 7.

## Lo que no hay que romper

- Los permisos por columna de `proyectos` y la RLS de `demos`: son el bloqueo
  del detalle que exige la consigna.
- El honeypot y el rate limiting del formulario de contacto.
- La validación por firma binaria (magic bytes) de las imágenes que se suben.
- El hash SHA-256 de la IP en `analytics.service.js`: antes era base64
  reversible y la política de privacidad prometía lo contrario.
- El consentimiento de analítica: si se rechaza, **no** se cuentan visitas ni
  vistas de proyecto.
- Los guards de rol y la validación del parámetro `next` (open redirect).
