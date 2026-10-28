// ==============================================================================
// public/js/pages/home.js
// Controlador Principal de la Home (Visitante & Usuario Registrado)
// ==============================================================================

import { initAuth, getCurrentUser, onAuthStateChange } from "../core/auth.js";
import { ServiciosService } from "../services/servicios.service.js";
import { ProyectosService } from "../services/proyectos.service.js";
import { ConsultasService } from "../services/consultas.service.js";
import { GithubService } from "../services/github.service.js";
import { WeatherService } from "../services/weather.service.js";
import { AnalyticsService } from "../services/analytics.service.js";
import { Navbar } from "../components/navbar.js";
import { CustomCursor } from "../components/cursor.js";
import { Modal } from "../components/modal.js";
import { Toast } from "../components/toast.js";
import { initSmoothScroll } from "../animations/lenis-scroll.js";
import { init3DTilt } from "../animations/tilt-3d.js";
import { Animations } from "../animations/gsap-animations.js";
import { escapeHTML, isValidEmail, validateLength } from "../core/security.js";
import { applyBrand } from "../core/brand.js";
import { CookieConsent } from "../components/cookie-consent.js";
import { supabase } from "../core/supabase.js";
import { CONFIG } from "../config.js";
import { iconoSVG } from "../data/iconos.js";
import "../core/diagnostico.js";
import { SERVICIOS_RESPALDO, PROYECTOS_RESPALDO } from "../data/contenido-local.js";

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Inicializar componentes visuales y efectos
  applyBrand();
  Navbar.init();
  CustomCursor.init();
  initSmoothScroll();
  Animations.init();
  initHeroParallax();
  initBackToTop();

  // 2. Inicializar sesión de autenticación
  await initAuth();

  // 3. Geolocalización para el widget del footer y métricas de visita.
  //    La visita solo se cuenta si la persona aceptó la analítica.
  const geoData = await WeatherService.getVisitorGeoLocation();
  renderVisitorWidget(geoData);

  const medirVisita = () =>
    AnalyticsService.recordVisit({ path: window.location.pathname, geoData });

  if (CookieConsent.puedeMedir()) medirVisita();
  CookieConsent.init(medirVisita);

  // 4. Cargar contenido dinámico
  await Promise.all([
    cargarServicios(),
    cargarProyectos(),
    cargarReposGithub()
  ]);

  // Inicializar tilt 3D tras montar elementos
  init3DTilt();

  // 5. Vincular formulario de contacto
  initContactForm(geoData);

  // 6. Botones de compartir y copiar
  initShareActions();

  // 7. Botones "Cotizar" de las tarjetas de servicio
  initBotonesCotizar();

  // 8. Aviso si un guard de rol nos devolvió a la home
  avisarAccesoDenegado();
});

/**
 * `requireRole` redirige acá con ?acceso=denegado en lugar de usar alert().
 * El acceso real a los datos lo corta RLS; esto es solo el aviso.
 */
function avisarAccesoDenegado() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("acceso") !== "denegado") return;

  Toast.error("Tu cuenta no tiene permisos para esa sección.");
  params.delete("acceso");
  const query = params.toString();
  history.replaceState(null, "", window.location.pathname + (query ? `?${query}` : "") + window.location.hash);
}

/**
 * Los botones "Cotizar" llevan al formulario con el tipo de consulta
 * "cotización" ya elegido y el asunto precargado con el servicio.
 */
function initBotonesCotizar() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-cotizar");
    if (!btn) return;

    const servicio = btn.getAttribute("data-servicio") || "";
    const selectTipo = document.getElementById("contacto-tipo");
    const inputAsunto = document.getElementById("contacto-asunto");

    if (selectTipo) selectTipo.value = "cotizacion";
    if (inputAsunto && servicio && !inputAsunto.value) {
      inputAsunto.value = `Cotización: ${servicio}`;
    }
  });
}

/**
 * Parallax suave de la ventana de código del hero siguiendo el mouse.
 * Escribe las variables CSS --tilt-x / --tilt-y que usa .hero-code-window.
 */
function initHeroParallax() {
  const visual = document.getElementById("hero-visual");
  const ventana = document.getElementById("hero-code-window");
  if (!visual || !ventana) return;

  // Sin parallax en táctil ni con movimiento reducido.
  if (
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  const MAX_DEG = 7;

  window.addEventListener(
    "mousemove",
    (e) => {
      const rect = visual.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;

      // Posición relativa al centro del visual, normalizada a -1..1
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const nx = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth / 2)));
      const ny = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight / 2)));

      ventana.style.setProperty("--tilt-y", `${nx * MAX_DEG}deg`);
      ventana.style.setProperty("--tilt-x", `${-ny * MAX_DEG}deg`);
    },
    { passive: true }
  );
}

/**
 * Botón "Volver arriba" del footer.
 */
function initBackToTop() {
  const btn = document.getElementById("btn-back-to-top");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: suave ? "smooth" : "auto" });
  });
}

/**
 * Renderiza el widget de clima y ubicación del visitante en el footer.
 * Usa IP Geolocation (ipapi.co) + Open-Meteo, dos de las Web APIs del trabajo.
 * Vivía en el hero; se movió al footer para despejar el título.
 */
async function renderVisitorWidget(geo) {
  const widgetEl = document.getElementById("visitor-live-widget");
  if (!widgetEl) return;

  // Si la geolocalización por IP falló, no mostramos nada: es un adorno.
  if (!geo || geo.latitude == null || geo.longitude == null) return;

  const weather = await WeatherService.getLocalWeather(geo.latitude, geo.longitude);

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const partes = [
    `<span>Nos visitás desde <strong>${escapeHTML(geo.city)}, ${escapeHTML(geo.country)}</strong></span>`
  ];

  if (weather && weather.temperature != null) {
    partes.push(
      `<span class="text-white-50" aria-hidden="true">·</span>`,
      `<span>${weather.icon} ${weather.temperature}°C</span>`
    );
  }

  partes.push(
    `<span class="text-white-50" aria-hidden="true">·</span>`,
    `<span>${timeStr}</span>`
  );

  widgetEl.innerHTML = `
    <div class="visitor-live-badge d-inline-flex align-items-center gap-2 flex-wrap">
      <span class="pulse-indicator"></span>
      ${partes.join("")}
    </div>
  `;
}

/* ---------------------------------------------------------------------------
 * Estados compartidos de carga / error / vacío
 * ------------------------------------------------------------------------ */

/** Tarjetas fantasma mientras llega la respuesta. */
function skeletonGrid(cantidad, claseCol = "col-md-6 col-lg-3", alto = 230) {
  return Array.from({ length: cantidad })
    .map(
      () => `
      <div class="${claseCol}">
        <div class="skeleton-card" style="height: ${alto}px" aria-hidden="true">
          <div class="skeleton-linea" style="width: 52px; height: 52px; border-radius: 10px;"></div>
          <div class="skeleton-linea" style="width: 70%;"></div>
          <div class="skeleton-linea" style="width: 100%;"></div>
          <div class="skeleton-linea" style="width: 85%;"></div>
        </div>
      </div>`
    )
    .join("");
}

/**
 * Estado de error amable, sin rojo agresivo y con botón de reintento.
 * El error técnico ya quedó en la consola: acá no se muestra crudo.
 */
function estadoError(mensaje, idBotonReintentar) {
  return `
    <div class="col-12">
      <div class="estado-vacio text-center">
        <div class="estado-vacio__icono" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 1 1-6.22-8.56"/><path d="M21 3v6h-6"/>
          </svg>
        </div>
        <p class="estado-vacio__texto">${escapeHTML(mensaje)}</p>
        <button type="button" class="btn btn-outline-custom btn-sm" id="${idBotonReintentar}">
          Reintentar
        </button>
      </div>
    </div>`;
}

/** Estado vacío (la consulta anduvo pero no hay filas). */
function estadoVacio(mensaje) {
  return `
    <div class="col-12">
      <div class="estado-vacio text-center">
        <p class="estado-vacio__texto mb-0">${escapeHTML(mensaje)}</p>
      </div>
    </div>`;
}

/**
 * Carga los servicios profesionales ofertados desde Supabase.
 * Orden de preferencia: base real -> contenido local de respaldo.
 * Nunca se le muestra un cartel rojo al visitante.
 */
async function cargarServicios() {
  const container = document.getElementById("servicios-grid");
  if (!container) return;

  container.innerHTML = skeletonGrid(4);

  const pintar = (servicios, esRespaldo) => {
    container.innerHTML =
      servicios
        .map(
          (s) => `
      <div class="col-md-6 col-lg-3 reveal-item">
        <div class="service-card card-tilt-3d h-100 p-4 d-flex flex-column">
          <div class="service-icon mb-3">${iconoSVG(s.icono)}</div>
          <h4 class="service-title fw-bold mb-3">${escapeHTML(s.titulo)}</h4>
          <p class="service-desc text-white-50 mb-4 flex-grow-1">${escapeHTML(s.descripcion || "")}</p>
          <a href="#contacto" class="btn btn-outline-custom btn-sm align-self-start btn-cotizar"
             data-servicio="${escapeHTML(s.titulo)}">Cotizar</a>
        </div>
      </div>`
        )
        .join("") + (esRespaldo ? avisoRespaldo() : "");
  };

  try {
    const servicios = await ServiciosService.getAll(true);

    if (!servicios.length) {
      container.innerHTML = estadoVacio("Todavía no hay servicios publicados.");
      return;
    }

    pintar(servicios, false);
  } catch (err) {
    // La causa raíz queda visible para quien desarrolla.
    console.error("Error al cargar servicios:", err);

    if (SERVICIOS_RESPALDO.length) {
      pintar(SERVICIOS_RESPALDO, true);
    } else {
      container.innerHTML = estadoError(
        "No pudimos traer los servicios en este momento.",
        "btn-reintentar-servicios"
      );
      document
        .getElementById("btn-reintentar-servicios")
        ?.addEventListener("click", cargarServicios);
    }
  }
}

/** Aviso discreto de que lo que se ve es contenido de referencia. */
function avisoRespaldo() {
  return `
    <div class="col-12">
      <p class="aviso-respaldo">
        Mostrando contenido de referencia: no pudimos conectarnos a la base en este momento.
      </p>
    </div>`;
}

/**
 * URL pública de una imagen del bucket de Storage.
 * Devuelve null si el proyecto no tiene portada cargada.
 */
function urlPortada(ruta) {
  if (!ruta) return null;
  try {
    const { data } = supabase.storage.from(CONFIG.STORAGE_BUCKET).getPublicUrl(ruta);
    return data?.publicUrl || null;
  } catch {
    return null;
  }
}

/**
 * Portada: el respaldo va SIEMPRE como capa de fondo (iniciales sobre un
 * degradé) y la imagen real se apoya encima. Si el archivo no está en Storage
 * —hoy las rutas de `imagen_portada` apuntan a archivos que no se subieron— no
 * tapa nada y se ve el respaldo, sin depender de un `onerror`.
 */
function portadaProyecto(titulo, rutaImagen) {
  const iniciales = titulo
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");

  const respaldo = `<div class="project-thumb project-thumb--placeholder" aria-hidden="true"><span>${escapeHTML(iniciales)}</span></div>`;

  const url = urlPortada(rutaImagen);
  if (!url) return respaldo;

  return `${respaldo}<img src="${url}" alt="Portada de ${escapeHTML(titulo)}" class="project-thumb project-thumb--foto" loading="lazy" />`;
}

/**
 * Carga los proyectos y gestiona el acceso restringido a demos.
 *
 * El listado es público; el detalle y las demos los bloquea la BASE (permisos
 * por columna en `proyectos.descripcion` y RLS en `demos`). El overlay del
 * front es la señal visual de ese bloqueo, no el bloqueo en sí.
 */
async function cargarProyectos() {
  const container = document.getElementById("proyectos-grid");
  if (!container) return;

  container.innerHTML = skeletonGrid(4, "col-lg-6", 330);

  const pintar = (proyectos, esRespaldo) => {
    const haySesion = !!getCurrentUser();

    container.innerHTML =
      proyectos
        .map((p, idx) => {
          const tecnologias = (p.tecnologias || [])
            .map((t) => `<span class="badge badge-tech">${escapeHTML(t.nombre || t)}</span>`)
            .join("");

          const portada = portadaProyecto(p.titulo, p.imagen_portada);

          return `
        <div class="col-lg-6 reveal-item">
          <div class="project-card card-tilt-3d h-100" data-id="${p.id}" data-slug="${escapeHTML(p.slug || "")}">
            <div class="project-thumb-wrapper">
              ${portada}
              <div class="project-overlay d-flex flex-column align-items-center justify-content-center gap-3 p-3">
                ${
                  haySesion
                    ? `<button class="btn btn-accent-custom btn-sm btn-ver-demo" data-project-id="${p.id}">
                         ▶ Probar demo interactiva
                       </button>
                       <button class="btn btn-outline-custom btn-sm btn-ver-detalle" data-slug="${escapeHTML(p.slug || "")}">
                         Ver detalle
                       </button>`
                    : `<div class="lock-icon-glow mb-1" aria-hidden="true">
                         <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff"
                              stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                           <rect x="3" y="11" width="18" height="11" rx="2"/>
                           <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                         </svg>
                       </div>
                       <button class="btn btn-accent-custom btn-sm btn-cta-registro btn-pedir-auth">
                         Registrate para ver la demo
                       </button>
                       <span class="small text-white-50">El detalle y el sandbox requieren cuenta</span>`
                }
              </div>
            </div>
            <div class="project-content p-4">
              <div class="d-flex justify-content-between align-items-start mb-2 gap-2">
                <span class="project-number text-accent-gradient">${String(idx + 1).padStart(2, "0")}</span>
                <div class="d-flex gap-1 flex-wrap justify-content-end">${tecnologias}</div>
              </div>
              <h3 class="project-title fw-bold mb-2">${escapeHTML(p.titulo)}</h3>
              <p class="project-desc text-white-50 mb-3">${escapeHTML(p.resumen || "")}</p>
              <div class="d-flex align-items-center justify-content-between gap-2">
                ${p.anio ? `<span class="small text-white-50">${escapeHTML(String(p.anio))}</span>` : "<span></span>"}
                ${
                  !haySesion
                    ? `<a href="/login.html#registro" class="small text-accent text-decoration-none fw-bold">Crear cuenta →</a>`
                    : ""
                }
              </div>
            </div>
          </div>
        </div>`;
        })
        .join("") + (esRespaldo ? avisoRespaldo() : "");
  };

  try {
    const proyectos = await ProyectosService.getAll(true);

    if (!proyectos.length) {
      container.innerHTML = estadoVacio("Todavía no hay proyectos publicados.");
      return;
    }

    pintar(proyectos, false);
    vincularAccionesProyectos(container, proyectos);
  } catch (err) {
    console.error("Error al cargar proyectos:", err);

    if (PROYECTOS_RESPALDO.length) {
      pintar(PROYECTOS_RESPALDO, true);
      vincularAccionesProyectos(container, PROYECTOS_RESPALDO);
    } else {
      container.innerHTML = estadoError(
        "No pudimos traer los proyectos en este momento.",
        "btn-reintentar-proyectos"
      );
      document
        .getElementById("btn-reintentar-proyectos")
        ?.addEventListener("click", cargarProyectos);
    }
  }
}

/**
 * Delegación de clics de las tarjetas de proyecto.
 * Se vincula una sola vez por render para no apilar listeners.
 */
function vincularAccionesProyectos(container, proyectos) {
  if (container.dataset.listenerVinculado === "1") return;
  container.dataset.listenerVinculado = "1";

  container.addEventListener("click", async (e) => {
    // Visitante sin cuenta
    if (e.target.closest(".btn-pedir-auth")) {
      Modal.showAuthRequired("Acceso a Demos Interactivas");
      return;
    }

    // Detalle (requiere sesión; la base deniega las columnas sin ella)
    const btnDetalle = e.target.closest(".btn-ver-detalle");
    if (btnDetalle) {
      const slug = btnDetalle.getAttribute("data-slug");
      try {
        btnDetalle.disabled = true;
        const detalle = await ProyectosService.getDetalle(slug);
        if (!detalle) {
          Toast.error("No encontramos ese proyecto.");
          return;
        }
        Modal.showDemo({
          title: detalle.titulo,
          description: detalle.descripcion || detalle.resumen,
          interactive_type: "detalle"
        });
      } catch (err) {
        console.error("Error al abrir el detalle del proyecto:", err);
        Modal.showAuthRequired("Detalle del Proyecto");
      } finally {
        btnDetalle.disabled = false;
      }
      return;
    }

    // Demo interactiva
    const btnDemo = e.target.closest(".btn-ver-demo");
    if (btnDemo) {
      const proyectoId = btnDemo.getAttribute("data-project-id");
      try {
        btnDemo.disabled = true;
        ProyectosService.recordView(proyectoId);

        const demos = await ProyectosService.getDemos(proyectoId);
        if (!demos.length) {
          // RLS no devolvió nada: o no hay demos cargadas, o falta sesión.
          const proyecto = proyectos.find((p) => String(p.id) === String(proyectoId));
          Modal.showDemo({
            title: proyecto?.titulo || "Demo interactiva",
            description:
              "Todavía no hay una demo cargada para este proyecto. Mientras tanto podés ver el detalle.",
            interactive_type: "canvas"
          });
          return;
        }

        const demo = demos[0];
        Modal.showDemo({
          title: demo.titulo,
          description: demo.instrucciones || "",
          interactive_type: demo.tipo || "canvas"
        });
      } catch (err) {
        console.error("Error al abrir la demo:", err);
        Modal.showAuthRequired("Demos Interactivas");
      } finally {
        btnDemo.disabled = false;
      }
    }
  });
}

/**
 * Carga los repositorios reales de GitHub usando la GitHub REST API
 */
async function cargarReposGithub() {
  const container = document.getElementById("github-repos-container");
  if (!container) return;

  container.innerHTML = skeletonGrid(3, "col-md-4", 150);

  try {
    const repos = await GithubService.getUserRepositories();

    // Estado vacío explícito: antes la función hacía `return` y dejaba la
    // sección con el título y un hueco, sin explicar nada.
    if (!repos.length) {
      container.innerHTML = estadoVacio(
        "No pudimos traer la actividad de GitHub en este momento."
      );
      return;
    }

    container.innerHTML = repos.slice(0, 3).map(r => `
      <div class="col-md-4 reveal-item">
        <a href="${r.url}" target="_blank" rel="noopener noreferrer" class="github-repo-card d-block p-4 text-decoration-none">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="repo-name fw-bold text-white">${escapeHTML(r.name)}</span>
            <span class="text-accent small">★ ${r.stars}</span>
          </div>
          <p class="repo-desc text-white-50 small mb-3">${escapeHTML(r.description)}</p>
          <div class="d-flex justify-content-between align-items-center text-white-50 small">
            <span class="d-flex align-items-center gap-2">
              <span class="lang-color-dot" style="background: #6049ea;"></span>
              ${escapeHTML(r.language)}
            </span>
            <span>Fork: ${r.forks}</span>
          </div>
        </a>
      </div>
    `).join("");
  } catch (err) {
    console.warn("No se pudieron renderizar los repositorios de GitHub:", err);
    container.innerHTML = estadoError(
      "No pudimos traer la actividad de GitHub.",
      "btn-reintentar-github"
    );
    document
      .getElementById("btn-reintentar-github")
      ?.addEventListener("click", cargarReposGithub);
  }
}

/**
 * Maneja el formulario de contacto con sanitización y anti-spam
 */
function initContactForm(geoData) {
  const form = document.getElementById("contact-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector("button[type='submit']");
    const originalBtnText = submitBtn.innerHTML;

    // Extraer campos
    const nombre = form.nombre?.value || "";
    const email = form.email?.value || "";
    const tipo = form.tipo?.value || "general";
    const asunto = form.asunto?.value || "";
    const mensaje = form.mensaje?.value || "";
    const honeypot = form.honeypot?.value || "";

    // Validaciones estrictas en cliente
    if (!validateLength(nombre, 2, 100)) {
      Toast.error("Por favor ingresa tu nombre completo (mínimo 2 caracteres).");
      form.nombre?.focus();
      return;
    }

    if (!isValidEmail(email)) {
      Toast.error("Por favor ingresa un correo electrónico válido.");
      form.email?.focus();
      return;
    }

    if (!validateLength(asunto, 3, 200)) {
      Toast.error("El asunto debe contener entre 3 y 200 caracteres.");
      form.asunto?.focus();
      return;
    }

    if (!validateLength(mensaje, 10, 3000)) {
      Toast.error("El mensaje debe contener al menos 10 caracteres.");
      form.mensaje?.focus();
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Enviando mensaje...</span>`;

      await ConsultasService.enviarConsulta({
        nombre,
        email,
        tipo,
        asunto,
        mensaje,
        honeypot,
        geoData
      });

      Toast.success("¡Tu consulta ha sido enviada con éxito! Nos comunicaremos a la brevedad.");
      form.reset();
    } catch (err) {
      console.error("Error enviando consulta:", err);
      Toast.error(err.message || "Ocurrió un error al enviar tu consulta. Inténtalo nuevamente.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });
}

/**
 * Acciones para compartir el portfolio o copiar email
 */
function initShareActions() {
  const shareBtn = document.getElementById("btn-share-portfolio");
  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      const shared = await WeatherService.shareContent({
        title: document.title,
        text: "Explorá proyectos fullstack, demos interactivas y arquitectura moderna.",
        url: window.location.href
      });
      if (shared) {
        Toast.success("Enlace copiado o compartido exitosamente.");
      }
    });
  }

  const copyEmailBtn = document.getElementById("btn-copy-email");
  if (copyEmailBtn) {
    copyEmailBtn.addEventListener("click", async () => {
      const email = copyEmailBtn.getAttribute("data-email") || "lastradanguadalupe@gmail.com";
      await WeatherService.copyToClipboard(email);
      Toast.success(`Email (${email}) copiado al portapapeles.`);
    });
  }
}
