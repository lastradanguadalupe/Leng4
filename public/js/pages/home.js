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

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Inicializar componentes visuales y efectos
  Navbar.init();
  CustomCursor.init();
  initSmoothScroll();
  Animations.init();

  // 2. Inicializar sesión de autenticación
  await initAuth();

  // 3. Capturar métricas de visita y geolocalización
  const geoData = await WeatherService.getVisitorGeoLocation();
  AnalyticsService.recordVisit({ path: window.location.pathname, geoData });
  renderVisitorWidget(geoData);

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
});

/**
 * Renderiza el widget de clima y visitante en vivo
 */
async function renderVisitorWidget(geo) {
  const widgetEl = document.getElementById("visitor-live-widget");
  if (!widgetEl) return;

  const weather = await WeatherService.getLocalWeather(geo.latitude, geo.longitude);

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  widgetEl.innerHTML = `
    <div class="visitor-live-badge d-inline-flex align-items-center gap-2">
      <span class="pulse-indicator"></span>
      <span>Conectado desde <strong>${escapeHTML(geo.city)}, ${escapeHTML(geo.country)}</strong></span>
      <span class="text-white-50">|</span>
      <span>${weather.icon} ${weather.temperature}°C (${weather.description})</span>
      <span class="text-white-50">|</span>
      <span>${timeStr} local</span>
    </div>
  `;
}

/**
 * Carga los servicios profesionales ofertados desde Supabase
 */
async function cargarServicios() {
  const container = document.getElementById("servicios-grid");
  if (!container) return;

  try {
    const servicios = await ServiciosService.getAll(true);
    if (!servicios.length) {
      container.innerHTML = `<div class="col-12 text-center text-white-50 py-4">No hay servicios disponibles en este momento.</div>`;
      return;
    }

    container.innerHTML = servicios.map(s => `
      <div class="col-md-6 col-lg-3 reveal-item">
        <div class="service-card card-tilt-3d h-100 p-4">
          <div class="service-icon mb-3">${s.icon_svg}</div>
          <h4 class="service-title fw-bold mb-3">${escapeHTML(s.title)}</h4>
          <p class="service-desc text-white-50 mb-4">${escapeHTML(s.description)}</p>
          <ul class="service-features list-unstyled mb-0">
            ${(s.features || []).map(f => `
              <li class="d-flex align-items-center gap-2 mb-2 text-white-50 small">
                <span class="feature-dot"></span>
                <span>${escapeHTML(f)}</span>
              </li>
            `).join("")}
          </ul>
        </div>
      </div>
    `).join("");
  } catch (err) {
    console.error("Error al cargar servicios:", err);
    container.innerHTML = `<div class="col-12 text-center text-danger py-4">No se pudieron cargar los servicios. Revisa la conexión con Supabase.</div>`;
  }
}

/**
 * Carga los proyectos y gestiona el acceso restringido a demos
 */
async function cargarProyectos() {
  const container = document.getElementById("proyectos-grid");
  if (!container) return;

  try {
    const proyectos = await ProyectosService.getAll(true);
    if (!proyectos.length) {
      container.innerHTML = `<div class="col-12 text-center text-white-50 py-5">No hay proyectos publicados actualmente.</div>`;
      return;
    }

    const isUserAuth = !!getCurrentUser();

    container.innerHTML = proyectos.map((p, idx) => {
      const techBadges = (p.tech_stack || []).map(t => `<span class="badge badge-tech">${escapeHTML(t)}</span>`).join("");
      const hasDemos = p.demos && p.demos.length > 0;

      return `
        <div class="col-lg-6 reveal-item">
          <div class="project-card card-tilt-3d h-100" data-id="${p.id}">
            <div class="project-thumb-wrapper">
              <img src="${p.thumbnail_url}" alt="${escapeHTML(p.title)}" class="project-thumb img-fluid" loading="lazy" />
              <div class="project-overlay d-flex align-items-center justify-content-center gap-3">
                ${isUserAuth && hasDemos ? `
                  <button class="btn btn-accent-custom btn-sm btn-view-demo" data-demo-id="${p.demos[0].id}" data-project-id="${p.id}">
                    ▶ Probar Demo Interactiva
                  </button>
                ` : `
                  <button class="btn btn-locked-custom btn-sm btn-request-auth">
                    🔒 Demo (Requiere Registro)
                  </button>
                `}
                ${p.repo_url ? `
                  <a href="${p.repo_url}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-custom btn-sm">
                    GitHub ↗
                  </a>
                ` : ""}
              </div>
            </div>
            <div class="project-content p-4">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <span class="project-number text-accent-gradient">0${idx + 1}</span>
                <div class="d-flex gap-1 flex-wrap">${techBadges}</div>
              </div>
              <h3 class="project-title fw-bold mb-2">${escapeHTML(p.title)}</h3>
              <p class="project-desc text-white-50 mb-3">${escapeHTML(p.short_description)}</p>
              ${!isUserAuth ? `
                <div class="auth-gate-banner p-2 rounded text-center small text-white-50">
                  <span>Acceso a métricas completas y sandbox reservado para <a href="/login.html" class="text-accent text-decoration-none fw-bold">usuarios registrados</a></span>
                </div>
              ` : ""}
            </div>
          </div>
        </div>
      `;
    }).join("");

    // Manejar clics en demos y restricciones
    container.addEventListener("click", async (e) => {
      const authBtn = e.target.closest(".btn-request-auth");
      if (authBtn) {
        Modal.showAuthRequired("Acceso a Demos Interactivas");
        return;
      }

      const demoBtn = e.target.closest(".btn-view-demo");
      if (demoBtn) {
        const demoId = demoBtn.getAttribute("data-demo-id");
        const projectId = demoBtn.getAttribute("data-project-id");
        
        // Registrar vista del proyecto
        if (projectId) {
          ProyectosService.recordView(projectId);
        }

        // Buscar demo en los datos del proyecto
        const proj = proyectos.find(p => p.id === projectId);
        const demo = proj?.demos?.find(d => d.id === demoId);

        if (demo) {
          Modal.showDemo(demo);
        } else {
          Toast.info("Cargando simulador de demostración...");
          Modal.showDemo({
            title: proj?.title || "Demo Interactiva",
            description: "Simulador interactivo en tiempo real conectado a Supabase.",
            interactive_type: "canvas"
          });
        }
      }
    });

  } catch (err) {
    console.error("Error al cargar proyectos:", err);
    container.innerHTML = `<div class="col-12 text-center text-danger py-4">Error cargando proyectos del portfolio.</div>`;
  }
}

/**
 * Carga los repositorios reales de GitHub usando la GitHub REST API
 */
async function cargarReposGithub() {
  const container = document.getElementById("github-repos-container");
  if (!container) return;

  try {
    const repos = await GithubService.getUserRepositories();
    if (!repos.length) return;

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
        title: "Alex Mercer | Fullstack Architect Portfolio",
        text: "Explora proyectos fullstack, demos interactivas y arquitectura moderna.",
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
      const email = copyEmailBtn.getAttribute("data-email") || "alex.mercer.dev@gmail.com";
      await WeatherService.copyToClipboard(email);
      Toast.success(`Email (${email}) copiado al portapapeles.`);
    });
  }
}
