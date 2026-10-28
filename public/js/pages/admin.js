// ==============================================================================
// public/js/pages/admin.js
// Panel de Administrador: CRUD Proyectos/Demos/Servicios, Usuarios y Gráficos RPC
// ==============================================================================

import { requireRole, initAuth } from "../core/auth.js";
import { ProyectosService } from "../services/proyectos.service.js";
import { DemosService } from "../services/demos.service.js";
import { ServiciosService } from "../services/servicios.service.js";
import { TestimoniosService } from "../services/testimonios.service.js";
import { UsuariosService } from "../services/usuarios.service.js";
import { AnalyticsService } from "../services/analytics.service.js";
import { uploadImage } from "../core/storage.js";
import { Toast } from "../components/toast.js";
import { Modal } from "../components/modal.js";
import { CustomCursor } from "../components/cursor.js";
import { escapeHTML } from "../core/security.js";
import { CONFIG } from "../config.js";
import { supabase } from "../core/supabase.js";
import { iconoSVG, slugsDeIconos } from "../data/iconos.js";
import "../core/diagnostico.js";

/**
 * URL pública de una imagen del bucket a partir de su ruta.
 * `proyectos.imagen_portada` guarda la ruta ("proyectos/x.webp"), no la URL.
 */
function portadaUrl(ruta) {
  if (!ruta) return "";
  try {
    const { data } = supabase.storage.from(CONFIG.STORAGE_BUCKET).getPublicUrl(ruta);
    return data?.publicUrl || "";
  } catch {
    return "";
  }
}

// Instancias de Chart.js
let chartTraffic = null;
let chartConsultas = null;
let chartRegistrations = null;
let chartProjects = null;

document.addEventListener("DOMContentLoaded", async () => {
  CustomCursor.init();
  await initAuth();

  // Protección estricta: solo Administradores
  const authorized = await requireRole([CONFIG.ROLES.ADMIN]);
  if (!authorized) return;

  initNavigationTabs();
  await loadDashboardKPIs();
  initAnalyticsCharts();

  // Cargar tablas de gestión
  await Promise.all([
    cargarTablaProyectos(),
    cargarTablaServicios(),
    cargarTablaTestimonios(),
    cargarTablaUsuarios()
  ]);

  initCreateButtons();
});

/**
 * Pestañas internas del panel
 */
function initNavigationTabs() {
  const tabButtons = document.querySelectorAll(".admin-tab-btn");
  const tabPanes = document.querySelectorAll(".admin-tab-pane");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-tab");
      tabButtons.forEach(b => b.classList.remove("active"));
      tabPanes.forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      const targetPane = document.getElementById(`tab-${target}`);
      if (targetPane) targetPane.classList.add("active");
    });
  });
}

/**
 * 1. KPIs Globales
 */
async function loadDashboardKPIs() {
  try {
    const summary = await AnalyticsService.getSummary();
    document.getElementById("kpi-visitas-totales").textContent = summary.total_visitas || 0;
    document.getElementById("kpi-visitas-auth").textContent = summary.visitas_auth || 0;
    document.getElementById("kpi-visitas-unicas").textContent = summary.visitas_unicas || 0;
    document.getElementById("kpi-total-usuarios").textContent = summary.total_usuarios || 0;
    document.getElementById("kpi-total-consultas").textContent = summary.total_consultas || 0;
  } catch (err) {
    console.error("Error al cargar KPIs:", err);
  }
}

/**
 * 2. Gráficos Interactivos con Chart.js y Consultas Parametrizadas
 */
function initAnalyticsCharts() {
  const filterForm = document.getElementById("analytics-filter-form");
  const startDateInput = document.getElementById("analytics-start-date");
  const endDateInput = document.getElementById("analytics-end-date");
  const groupBySelect = document.getElementById("analytics-group-by");

  // Fechas predeterminadas: últimos 30 días
  const today = new Date();
  const past30 = new Date();
  past30.setDate(today.getDate() - 30);

  if (startDateInput) startDateInput.value = past30.toISOString().split("T")[0];
  if (endDateInput) endDateInput.value = today.toISOString().split("T")[0];

  const updateAllCharts = async () => {
    const startDate = startDateInput?.value || past30.toISOString().split("T")[0];
    const endDate = endDateInput?.value || today.toISOString().split("T")[0];
    const groupBy = groupBySelect?.value || "day";

    await Promise.all([
      renderTrafficChart(startDate, endDate, groupBy),
      renderConsultasChart(startDate, endDate),
      renderRegistrationsChart(startDate, endDate, groupBy),
      renderTopProjectsChart()
    ]);
  };

  if (filterForm) {
    filterForm.addEventListener("submit", (e) => {
      e.preventDefault();
      updateAllCharts();
    });
  }

  // Render inicial
  updateAllCharts();
}

async function renderTrafficChart(startDate, endDate, groupBy) {
  const ctx = document.getElementById("chart-traffic-canvas")?.getContext("2d");
  if (!ctx || !window.Chart) return;

  const data = await AnalyticsService.getTrafficTrends({ startDate, endDate, groupBy });

  const labels = data.map(d => d.periodo);
  const totalVisits = data.map(d => d.visitas_totales);
  const authVisits = data.map(d => d.visitas_autenticadas);
  const anonVisits = data.map(d => d.visitas_anonimas);

  if (chartTraffic) chartTraffic.destroy();

  chartTraffic = new window.Chart(ctx, {
    type: "bar",
    data: {
      labels: labels.length ? labels : ["Sin datos en rango"],
      datasets: [
        {
          label: "Visitas Autenticadas",
          data: authVisits.length ? authVisits : [0],
          backgroundColor: "#6049ea",
          borderRadius: 4
        },
        {
          label: "Visitas Anónimas (Generales)",
          data: anonVisits.length ? anonVisits : [0],
          backgroundColor: "rgba(255, 255, 255, 0.15)",
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true, grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#ffffff80" } },
        y: { stacked: true, grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#ffffff80" } }
      },
      plugins: {
        legend: { labels: { color: "#ffffff" } }
      }
    }
  });
}

async function renderConsultasChart(startDate, endDate) {
  const ctx = document.getElementById("chart-consultas-canvas")?.getContext("2d");
  if (!ctx || !window.Chart) return;

  const data = await AnalyticsService.getConsultasByType({ startDate, endDate });

  const labels = data.map(d => d.tipo.toUpperCase());
  const totals = data.map(d => d.total);

  if (chartConsultas) chartConsultas.destroy();

  chartConsultas = new window.Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels.length ? labels : ["General", "Cotización", "Asesoría"],
      datasets: [{
        data: totals.length ? totals : [4, 6, 2],
        backgroundColor: ["#6049ea", "rgba(96,73,234,0.5)", "#ffffff"],
        borderColor: "#000000",
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { color: "#ffffff" } }
      }
    }
  });
}

async function renderRegistrationsChart(startDate, endDate, groupBy) {
  const ctx = document.getElementById("chart-registrations-canvas")?.getContext("2d");
  if (!ctx || !window.Chart) return;

  const data = await AnalyticsService.getRegistrationsTrend({ startDate, endDate, groupBy });

  const labels = data.map(d => d.periodo);
  const values = data.map(d => d.nuevos_usuarios);

  if (chartRegistrations) chartRegistrations.destroy();

  chartRegistrations = new window.Chart(ctx, {
    type: "line",
    data: {
      labels: labels.length ? labels : ["Día 1", "Día 2", "Día 3"],
      datasets: [{
        label: "Nuevos Usuarios Registrados",
        data: values.length ? values : [1, 3, 2],
        borderColor: "#6049ea",
        backgroundColor: "rgba(96, 73, 234, 0.15)",
        fill: true,
        tension: 0.35,
        pointBackgroundColor: "#ffffff"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#ffffff80" } },
        y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#ffffff80", stepSize: 1 } }
      },
      plugins: {
        legend: { labels: { color: "#ffffff" } }
      }
    }
  });
}

async function renderTopProjectsChart() {
  const ctx = document.getElementById("chart-projects-canvas")?.getContext("2d");
  if (!ctx || !window.Chart) return;

  const data = await AnalyticsService.getTopProjects(5);

  const labels = data.map(d => d.titulo);
  const views = data.map(d => d.total_views);

  if (chartProjects) chartProjects.destroy();

  chartProjects = new window.Chart(ctx, {
    type: "bar",
    data: {
      labels: labels.length ? labels : ["Proyecto 1", "Proyecto 2"],
      datasets: [{
        label: "Vistas Únicas",
        data: views.length ? views : [45, 30],
        backgroundColor: "#6049ea",
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#ffffff80" } },
        y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#ffffff" } }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

/**
 * 3. CRUD de Proyectos y Demos
 */
async function cargarTablaProyectos() {
  const tbody = document.getElementById("tabla-proyectos-tbody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-white-50">Cargando proyectos...</td></tr>`;

  try {
    const proyectos = await ProyectosService.getAll(false);
    if (!proyectos.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-white-50">No hay proyectos creados.</td></tr>`;
      return;
    }

    tbody.innerHTML = proyectos.map(p => `
      <tr class="align-middle">
        <td>
          ${
            p.imagen_portada
              ? `<img src="${portadaUrl(p.imagen_portada)}" alt="Portada de ${escapeHTML(p.titulo)}" style="width: 56px; height: 36px; object-fit: cover; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);">`
              : `<div style="width: 56px; height: 36px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); background: rgba(96,73,234,0.15);"></div>`
          }
        </td>
        <td>
          <strong>${escapeHTML(p.titulo)}</strong><br>
          <small class="text-white-50">/${escapeHTML(p.slug)}</small>
        </td>
        <td>
          <div class="d-flex gap-1 flex-wrap">
            ${(p.tecnologias || []).map(t => `<span class="badge badge-tech small">${escapeHTML(t.nombre || t)}</span>`).join("")}
          </div>
        </td>
        <td>
          ${p.demos?.length ? `<span class="badge badge-accent">${p.demos.length} demos</span>` : `<span class="badge bg-secondary">Sin demos</span>`}
        </td>
        <td>
          ${p.publicado ? `<span class="badge bg-success">Publicado</span>` : `<span class="badge bg-secondary">Borrador</span>`}
        </td>
        <td>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-custom btn-edit-proyecto" data-id="${p.id}">Editar</button>
            <button class="btn btn-sm btn-danger btn-delete-proyecto" data-id="${p.id}">Eliminar</button>
          </div>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".btn-edit-proyecto").forEach(btn => {
      btn.addEventListener("click", () => {
        const p = proyectos.find(item => item.id === btn.getAttribute("data-id"));
        abrirModalProyecto(p);
      });
    });

    tbody.querySelectorAll(".btn-delete-proyecto").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (confirm("¿Estás seguro de que deseas eliminar este proyecto y sus demos vinculadas?")) {
          try {
            await ProyectosService.delete(btn.getAttribute("data-id"));
            Toast.success("Proyecto eliminado correctamente.");
            cargarTablaProyectos();
          } catch (err) {
            Toast.error("Error al eliminar proyecto.");
          }
        }
      });
    });
  } catch (err) {
    console.error("Error cargando tabla proyectos:", err);
  }
}

/**
 * 4. CRUD de Servicios
 */
async function cargarTablaServicios() {
  const tbody = document.getElementById("tabla-servicios-tbody");
  if (!tbody) return;

  try {
    const servicios = await ServiciosService.getAll(false);
    tbody.innerHTML = servicios.map(s => `
      <tr class="align-middle">
        <td><div style="width: 32px; height: 32px; color: var(--color-accent-light);">${iconoSVG(s.icono, 28)}</div></td>
        <td><strong>${escapeHTML(s.titulo)}</strong></td>
        <td><small class="text-white-50">${(s.entregables || []).map(e => escapeHTML(e)).join(", ")}</small></td>
        <td>${s.activo ? `<span class="badge bg-success">Activo</span>` : `<span class="badge bg-secondary">Inactivo</span>`}</td>
        <td>
          <button class="btn btn-sm btn-outline-custom btn-edit-servicio" data-id="${s.id}">Editar</button>
          <button class="btn btn-sm btn-danger btn-delete-servicio" data-id="${s.id}">Eliminar</button>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".btn-edit-servicio").forEach(btn => {
      btn.addEventListener("click", () => {
        const s = servicios.find(item => String(item.id) === btn.getAttribute("data-id"));
        abrirModalServicio(s);
      });
    });

    tbody.querySelectorAll(".btn-delete-servicio").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (confirm("¿Deseas eliminar este servicio?")) {
          await ServiciosService.delete(btn.getAttribute("data-id"));
          Toast.success("Servicio eliminado.");
          cargarTablaServicios();
        }
      });
    });
  } catch (err) {
    console.error("Error cargando servicios:", err);
  }
}

/**
 * 4.b CRUD de Testimonios
 */
async function cargarTablaTestimonios() {
  const tbody = document.getElementById("tabla-testimonios-tbody");
  if (!tbody) return;

  try {
    const testimonios = await TestimoniosService.getAllAdmin();

    if (!testimonios.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-white-50 py-4">Todavía no hay testimonios cargados.</td></tr>`;
      return;
    }

    tbody.innerHTML = testimonios.map(t => `
      <tr class="align-middle">
        <td><strong>${escapeHTML(t.autor)}</strong><br><small class="text-white-50">${escapeHTML([t.rol_autor, t.empresa].filter(Boolean).join(" · "))}</small></td>
        <td><small class="text-white-50">${escapeHTML((t.texto || "").slice(0, 90))}${(t.texto || "").length > 90 ? "…" : ""}</small></td>
        <td><small>${escapeHTML(t.servicio || "—")}</small></td>
        <td>${t.publicado ? `<span class="badge bg-success">Publicado</span>` : `<span class="badge bg-secondary">Oculto</span>`}</td>
        <td>
          <button class="btn btn-sm btn-outline-custom btn-edit-testimonio" data-id="${t.id}">Editar</button>
          <button class="btn btn-sm btn-danger btn-delete-testimonio" data-id="${t.id}">Eliminar</button>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".btn-edit-testimonio").forEach(btn => {
      btn.addEventListener("click", () => {
        const t = testimonios.find(item => String(item.id) === btn.getAttribute("data-id"));
        abrirModalTestimonio(t);
      });
    });

    tbody.querySelectorAll(".btn-delete-testimonio").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm("¿Deseas eliminar este testimonio?")) return;
        try {
          await TestimoniosService.delete(btn.getAttribute("data-id"));
          Toast.success("Testimonio eliminado.");
          cargarTablaTestimonios();
        } catch (err) {
          console.error("Error eliminando testimonio:", err);
          Toast.error("No pudimos eliminar el testimonio.");
        }
      });
    });
  } catch (err) {
    console.error("Error cargando testimonios:", err);
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-white-50 py-4">No pudimos cargar los testimonios.</td></tr>`;
  }
}

/**
 * 5. Gestión de Usuarios Registrados (Promoción / Requisitos Directos)
 */
async function cargarTablaUsuarios() {
  const tbody = document.getElementById("tabla-usuarios-tbody");
  if (!tbody) return;

  const busqueda = document.getElementById("search-usuarios")?.value || "";
  const rol = document.getElementById("filter-user-role")?.value || "todos";

  try {
    const usuarios = await UsuariosService.getAll({ busqueda, rol });
    tbody.innerHTML = usuarios.map(u => `
      <tr class="align-middle">
        <td>
          <strong>${escapeHTML(u.nombre || "Sin nombre")}</strong><br>
          <small class="text-white-50">${escapeHTML(u.email)}</small>
        </td>
        <td>
          <select class="form-select form-select-sm bg-dark text-white border-secondary select-user-role" data-id="${u.id}" style="width: 140px;">
            <option value="registrado" ${u.rol === "registrado" ? "selected" : ""}>Registrado</option>
            <option value="operador" ${u.rol === "operador" ? "selected" : ""}>Operador</option>
            <option value="admin" ${u.rol === "admin" ? "selected" : ""}>Admin</option>
          </select>
        </td>
        <td>
          ${u.bloqueado ? `<span class="badge bg-danger">Bloqueado</span>` : `<span class="badge bg-success">Activo</span>`}
        </td>
        <td class="small text-white-50">${new Date(u.creado_en).toLocaleDateString()}</td>
        <td>
          <div class="d-flex gap-2">
            <button class="btn btn-sm ${u.bloqueado ? 'btn-success' : 'btn-warning'} btn-toggle-block" data-id="${u.id}" data-blocked="${!!u.bloqueado}">
              ${u.bloqueado ? "Desbloquear" : "Bloquear"}
            </button>
            <button class="btn btn-sm btn-danger btn-delete-user" data-id="${u.id}">Eliminar</button>
          </div>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".select-user-role").forEach(sel => {
      sel.addEventListener("change", async () => {
        try {
          await UsuariosService.updateRole(sel.getAttribute("data-id"), sel.value);
          Toast.success("Rol de usuario actualizado.");
        } catch (err) {
          Toast.error("Error al actualizar rol.");
        }
      });
    });

    tbody.querySelectorAll(".btn-toggle-block").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const currentBlocked = btn.getAttribute("data-blocked") === "true";
        try {
          await UsuariosService.toggleBlock(id, !currentBlocked);
          Toast.success(currentBlocked ? "Usuario desbloqueado." : "Usuario bloqueado.");
          cargarTablaUsuarios();
        } catch (err) {
          Toast.error("Error al actualizar bloqueo de usuario.");
        }
      });
    });

    tbody.querySelectorAll(".btn-delete-user").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (confirm("¿Estás seguro de eliminar este usuario? Perderá acceso a la plataforma.")) {
          try {
            await UsuariosService.deleteUser(btn.getAttribute("data-id"));
            Toast.success("Usuario eliminado.");
            cargarTablaUsuarios();
          } catch (err) {
            Toast.error("Error eliminando usuario.");
          }
        }
      });
    });
  } catch (err) {
    console.error("Error cargando usuarios:", err);
  }
}

/**
 * Modales de Creación y Edición
 */
function initCreateButtons() {
  document.getElementById("btn-nuevo-proyecto")?.addEventListener("click", () => abrirModalProyecto());
  document.getElementById("btn-nuevo-servicio")?.addEventListener("click", () => abrirModalServicio());
  document.getElementById("btn-nuevo-testimonio")?.addEventListener("click", () => abrirModalTestimonio());

  const searchUsers = document.getElementById("search-usuarios");
  const filterRole = document.getElementById("filter-user-role");

  if (searchUsers) searchUsers.addEventListener("input", () => cargarTablaUsuarios());
  if (filterRole) filterRole.addEventListener("change", () => cargarTablaUsuarios());
}

function abrirModalProyecto(proyecto = null) {
  const isEdit = !!proyecto;
  const html = `
    <div class="text-start">
      <h4 class="fw-bold mb-3">${isEdit ? "Editar Proyecto" : "Nuevo Proyecto"}</h4>
      <form id="form-admin-proyecto">
        <div class="row g-3 mb-3">
          <div class="col-md-8">
            <label class="form-label small text-white-50" for="proy-titulo">Título del Proyecto</label>
            <input type="text" id="proy-titulo" class="form-control custom-input" value="${escapeHTML(proyecto?.titulo || '')}" required>
          </div>
          <div class="col-md-4">
            <label class="form-label small text-white-50" for="proy-slug">Slug (URL amigable)</label>
            <input type="text" id="proy-slug" class="form-control custom-input" value="${escapeHTML(proyecto?.slug || '')}" placeholder="ej: mi-proyecto-web" required>
          </div>
        </div>
        <div class="mb-3">
          <label class="form-label small text-white-50" for="proy-resumen">Resumen (se ve en la grilla pública)</label>
          <input type="text" id="proy-resumen" class="form-control custom-input" value="${escapeHTML(proyecto?.resumen || '')}" required>
        </div>
        <div class="mb-3">
          <label class="form-label small text-white-50" for="proy-descripcion">Descripción completa (solo para usuarios registrados)</label>
          <textarea id="proy-descripcion" rows="3" class="form-control custom-input" required>${escapeHTML(proyecto?.descripcion || '')}</textarea>
        </div>
        <div class="row g-3 mb-3">
          <div class="col-md-6">
            <label class="form-label small text-white-50" for="proy-tecnologias">Tecnologías (separadas por comas)</label>
            <input type="text" id="proy-tecnologias" class="form-control custom-input" value="${escapeHTML((proyecto?.tecnologias || []).map(t => t.nombre || t).join(', '))}" placeholder="JavaScript, PostgreSQL, Supabase">
            <small class="text-white-50">Tienen que coincidir con la tabla <code>tecnologias</code>.</small>
          </div>
          <div class="col-md-6">
            <label class="form-label small text-white-50" for="proy-file">Imagen de portada</label>
            <input type="file" id="proy-file" class="form-control custom-input mb-1" accept="image/*">
            <input type="text" id="proy-portada" class="form-control custom-input" value="${escapeHTML(proyecto?.imagen_portada || '')}" placeholder="proyectos/mi-portada.webp">
            <small class="text-white-50">Ruta dentro del bucket, no una URL completa.</small>
          </div>
        </div>
        <div class="row g-3 mb-4">
          <div class="col-md-5">
            <label class="form-label small text-white-50" for="proy-repo">URL del repositorio</label>
            <input type="url" id="proy-repo" class="form-control custom-input" value="${escapeHTML(proyecto?.url_repo || '')}">
          </div>
          <div class="col-md-4">
            <label class="form-label small text-white-50" for="proy-categoria">Categoría</label>
            <input type="text" id="proy-categoria" class="form-control custom-input" value="${escapeHTML(proyecto?.categoria || '')}" placeholder="Web App">
          </div>
          <div class="col-md-3">
            <label class="form-label small text-white-50" for="proy-anio">Año</label>
            <input type="number" id="proy-anio" class="form-control custom-input" min="2000" max="2100" value="${escapeHTML(String(proyecto?.anio || new Date().getFullYear()))}">
          </div>
        </div>
        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" id="proy-publicado" ${proyecto?.publicado !== false ? "checked" : ""}>
          <label class="form-check-label text-white small" for="proy-publicado">Publicar en el portfolio</label>
        </div>
        <div class="form-check mb-4">
          <input class="form-check-input" type="checkbox" id="proy-destacado" ${proyecto?.destacado ? "checked" : ""}>
          <label class="form-check-label text-white small" for="proy-destacado">Destacado</label>
        </div>
        <div class="d-flex justify-content-end gap-2">
          <button type="submit" class="btn btn-accent-custom" id="btn-save-proy">Guardar Proyecto</button>
        </div>
      </form>
    </div>
  `;

  Modal.open(html);

  document.getElementById("form-admin-proyecto")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btn-save-proy");
    btn.disabled = true;

    try {
      let thumbUrl = document.getElementById("proy-thumb").value;
      const fileInput = document.getElementById("proy-file");

      // `imagen_portada` guarda la RUTA dentro del bucket, no una URL pública.
      let rutaPortada = document.getElementById("proy-portada").value.trim() || null;

      if (fileInput?.files?.length > 0) {
        btn.innerHTML = "Validando firma y subiendo imagen...";
        const uploaded = await uploadImage(fileInput.files[0], "proyectos");
        rutaPortada = uploaded.path;
      }

      const nombresTecnologias = document
        .getElementById("proy-tecnologias")
        .value.split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        titulo: document.getElementById("proy-titulo").value,
        slug: document.getElementById("proy-slug").value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        resumen: document.getElementById("proy-resumen").value,
        descripcion: document.getElementById("proy-descripcion").value,
        imagen_portada: rutaPortada,
        url_repo: document.getElementById("proy-repo").value || null,
        categoria: document.getElementById("proy-categoria").value || null,
        anio: Number(document.getElementById("proy-anio").value) || null,
        publicado: document.getElementById("proy-publicado").checked,
        destacado: document.getElementById("proy-destacado").checked
      };

      let proyectoId = proyecto?.id;

      if (isEdit) {
        await ProyectosService.update(proyecto.id, payload);
        Toast.success("Proyecto actualizado correctamente.");
      } else {
        const creado = await ProyectosService.create(payload);
        proyectoId = creado?.id;
        Toast.success("Proyecto creado exitosamente.");
      }

      // Las tecnologías viven en la tabla puente `proyecto_tecnologias`, no en
      // una columna del proyecto: se sincronizan aparte.
      if (proyectoId) {
        const noEncontradas = await ProyectosService.setTecnologias(proyectoId, nombresTecnologias);
        if (noEncontradas.length) {
          Toast.warning(
            `No existen en la tabla tecnologias: ${noEncontradas.join(", ")}. El resto se guardó.`
          );
        }
      }

      Modal.close();
      cargarTablaProyectos();
    } catch (err) {
      console.error("Error guardando proyecto:", err);
      Toast.error(err.message || "Error al guardar el proyecto.");
    } finally {
      btn.disabled = false;
      btn.innerHTML = "Guardar Proyecto";
    }
  });
}

function abrirModalTestimonio(testimonio = null) {
  const isEdit = !!testimonio;
  const opcionesEstrellas = [5, 4, 3, 2, 1]
    .map(n => `<option value="${n}" ${Number(testimonio?.estrellas ?? 5) === n ? "selected" : ""}>${n}</option>`)
    .join("");

  Modal.open(`
    <div class="text-start">
      <h4 class="fw-bold mb-3">${isEdit ? "Editar Testimonio" : "Nuevo Testimonio"}</h4>
      <form id="form-admin-testimonio">
        <div class="row g-3 mb-3">
          <div class="col-md-6">
            <label class="form-label small text-white-50" for="test-autor">Autor</label>
            <input type="text" id="test-autor" class="form-control custom-input" value="${escapeHTML(testimonio?.autor || '')}" required>
          </div>
          <div class="col-md-6">
            <label class="form-label small text-white-50" for="test-rol">Cargo</label>
            <input type="text" id="test-rol" class="form-control custom-input" value="${escapeHTML(testimonio?.rol_autor || '')}">
          </div>
          <div class="col-md-6">
            <label class="form-label small text-white-50" for="test-empresa">Empresa</label>
            <input type="text" id="test-empresa" class="form-control custom-input" value="${escapeHTML(testimonio?.empresa || '')}">
          </div>
          <div class="col-md-6">
            <label class="form-label small text-white-50" for="test-servicio">Servicio contratado</label>
            <input type="text" id="test-servicio" class="form-control custom-input" value="${escapeHTML(testimonio?.servicio || '')}">
          </div>
        </div>
        <div class="mb-3">
          <label class="form-label small text-white-50" for="test-texto">Testimonio</label>
          <textarea id="test-texto" rows="3" class="form-control custom-input" required>${escapeHTML(testimonio?.texto || '')}</textarea>
        </div>
        <div class="row g-3 mb-4">
          <div class="col-md-4">
            <label class="form-label small text-white-50" for="test-estrellas">Estrellas</label>
            <select id="test-estrellas" class="form-select custom-input">${opcionesEstrellas}</select>
          </div>
          <div class="col-md-4">
            <label class="form-label small text-white-50" for="test-orden">Orden</label>
            <input type="number" id="test-orden" class="form-control custom-input" min="0" value="${Number(testimonio?.orden ?? 0)}">
          </div>
          <div class="col-md-4 d-flex align-items-end">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="test-publicado" ${testimonio?.publicado !== false ? "checked" : ""}>
              <label class="form-check-label text-white small" for="test-publicado">Publicado</label>
            </div>
          </div>
        </div>
        <div class="d-flex justify-content-end gap-2">
          <button type="submit" class="btn btn-accent-custom">Guardar Testimonio</button>
        </div>
      </form>
    </div>
  `);

  document.getElementById("form-admin-testimonio")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const payload = {
        autor: document.getElementById("test-autor").value.trim(),
        rol_autor: document.getElementById("test-rol").value.trim() || null,
        empresa: document.getElementById("test-empresa").value.trim() || null,
        servicio: document.getElementById("test-servicio").value.trim() || null,
        texto: document.getElementById("test-texto").value.trim(),
        estrellas: Number(document.getElementById("test-estrellas").value),
        orden: Number(document.getElementById("test-orden").value) || 0,
        publicado: document.getElementById("test-publicado").checked
      };

      if (isEdit) {
        await TestimoniosService.update(testimonio.id, payload);
        Toast.success("Testimonio actualizado.");
      } else {
        await TestimoniosService.create(payload);
        Toast.success("Testimonio creado.");
      }

      Modal.close();
      cargarTablaTestimonios();
    } catch (err) {
      console.error("Error al guardar el testimonio:", err);
      if (err?.code === "42703") {
        Toast.error("Faltan las columnas `servicio` o `estrellas`. Corré supabase/AJUSTES_PENDIENTES.sql en el SQL Editor.");
      } else {
        Toast.error("No pudimos guardar el testimonio.");
      }
    }
  });
}

function abrirModalServicio(servicio = null) {
  const isEdit = !!servicio;
  const html = `
    <div class="text-start">
      <h4 class="fw-bold mb-3">${isEdit ? "Editar Servicio" : "Nuevo Servicio"}</h4>
      <form id="form-admin-servicio">
        <div class="row g-3 mb-3">
          <div class="col-md-8">
            <label class="form-label small text-white-50" for="serv-titulo">Título del Servicio</label>
            <input type="text" id="serv-titulo" class="form-control custom-input" value="${escapeHTML(servicio?.titulo || '')}" required>
          </div>
          <div class="col-md-4">
            <label class="form-label small text-white-50" for="serv-slug">Slug</label>
            <input type="text" id="serv-slug" class="form-control custom-input" value="${escapeHTML(servicio?.slug || '')}" placeholder="desarrollo-web" required>
          </div>
        </div>
        <div class="mb-3">
          <label class="form-label small text-white-50" for="serv-descripcion">Descripción</label>
          <textarea id="serv-descripcion" rows="3" class="form-control custom-input" required>${escapeHTML(servicio?.descripcion || '')}</textarea>
        </div>
        <div class="mb-3">
          <label class="form-label small text-white-50" for="serv-icono">Icono</label>
          <select id="serv-icono" class="form-select custom-input">
            ${slugsDeIconos()
              .map(
                (slug) =>
                  `<option value="${slug}" ${servicio?.icono === slug ? "selected" : ""}>${slug}</option>`
              )
              .join("")}
          </select>
          <small class="text-white-50">
            La base guarda un nombre de icono, no código SVG: el dibujo sale del
            catálogo en <code>js/data/iconos.js</code>.
          </small>
        </div>
        <div class="row g-3 mb-4">
          <div class="col-md-8">
            <label class="form-label small text-white-50" for="serv-entregables">Entregables (separados por comas)</label>
            <input type="text" id="serv-entregables" class="form-control custom-input" value="${escapeHTML((servicio?.entregables || []).join(', '))}">
          </div>
          <div class="col-md-4 d-flex align-items-end">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="serv-activo" ${servicio?.activo !== false ? "checked" : ""}>
              <label class="form-check-label text-white small" for="serv-activo">Activo</label>
            </div>
          </div>
        </div>
        <div class="d-flex justify-content-end gap-2">
          <button type="submit" class="btn btn-accent-custom">Guardar Servicio</button>
        </div>
      </form>
    </div>
  `;

  Modal.open(html);

  document.getElementById("form-admin-servicio")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const payload = {
        titulo: document.getElementById("serv-titulo").value,
        slug: document.getElementById("serv-slug").value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        descripcion: document.getElementById("serv-descripcion").value,
        icono: document.getElementById("serv-icono").value,
        entregables: document
          .getElementById("serv-entregables")
          .value.split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        activo: document.getElementById("serv-activo").checked
      };

      if (isEdit) {
        await ServiciosService.update(servicio.id, payload);
        Toast.success("Servicio actualizado.");
      } else {
        await ServiciosService.create(payload);
        Toast.success("Servicio creado.");
      }

      Modal.close();
      cargarTablaServicios();
    } catch (err) {
      console.error("Error al guardar el servicio:", err);
      if (err?.code === "42703") {
        Toast.error(
          "Falta la columna `entregables`. Corré supabase/AJUSTES_PENDIENTES.sql en el SQL Editor."
        );
      } else {
        Toast.error("No pudimos guardar el servicio.");
      }
    }
  });
}
