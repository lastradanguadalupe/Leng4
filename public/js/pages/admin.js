// ==============================================================================
// public/js/pages/admin.js
// Panel de Administrador: CRUD Proyectos/Demos/Servicios, Usuarios y Gráficos RPC
// ==============================================================================

import { requireRole, initAuth } from "../core/auth.js";
import { ProyectosService } from "../services/proyectos.service.js";
import { DemosService } from "../services/demos.service.js";
import { ServiciosService } from "../services/servicios.service.js";
import { UsuariosService } from "../services/usuarios.service.js";
import { AnalyticsService } from "../services/analytics.service.js";
import { uploadImage } from "../core/storage.js";
import { Toast } from "../components/toast.js";
import { Modal } from "../components/modal.js";
import { CustomCursor } from "../components/cursor.js";
import { escapeHTML } from "../core/security.js";
import { CONFIG } from "../config.js";

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

  const labels = data.map(d => d.title);
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
          <img src="${p.thumbnail_url}" alt="${escapeHTML(p.title)}" style="width: 56px; height: 36px; object-fit: cover; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);">
        </td>
        <td>
          <strong>${escapeHTML(p.title)}</strong><br>
          <small class="text-white-50">/${escapeHTML(p.slug)}</small>
        </td>
        <td>
          <div class="d-flex gap-1 flex-wrap">
            ${(p.tech_stack || []).map(t => `<span class="badge badge-tech small">${escapeHTML(t)}</span>`).join("")}
          </div>
        </td>
        <td>
          ${p.demos?.length ? `<span class="badge badge-accent">${p.demos.length} demos</span>` : `<span class="badge bg-secondary">Sin demos</span>`}
        </td>
        <td>
          ${p.published ? `<span class="badge bg-success">Publicado</span>` : `<span class="badge bg-secondary">Borrador</span>`}
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
        <td><div style="width: 32px; height: 32px;">${s.icon_svg}</div></td>
        <td><strong>${escapeHTML(s.title)}</strong></td>
        <td><small class="text-white-50">${(s.features || []).join(", ")}</small></td>
        <td>${s.is_active ? `<span class="badge bg-success">Activo</span>` : `<span class="badge bg-secondary">Inactivo</span>`}</td>
        <td>
          <button class="btn btn-sm btn-outline-custom btn-edit-servicio" data-id="${s.id}">Editar</button>
          <button class="btn btn-sm btn-danger btn-delete-servicio" data-id="${s.id}">Eliminar</button>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".btn-edit-servicio").forEach(btn => {
      btn.addEventListener("click", () => {
        const s = servicios.find(item => item.id === btn.getAttribute("data-id"));
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
          <strong>${escapeHTML(u.full_name || "Sin nombre")}</strong><br>
          <small class="text-white-50">${escapeHTML(u.email)}</small>
        </td>
        <td>
          <select class="form-select form-select-sm bg-dark text-white border-secondary select-user-role" data-id="${u.id}" style="width: 140px;">
            <option value="registrado" ${u.role === "registrado" ? "selected" : ""}>Registrado</option>
            <option value="operador" ${u.role === "operador" ? "selected" : ""}>Operador</option>
            <option value="admin" ${u.role === "admin" ? "selected" : ""}>Admin</option>
          </select>
        </td>
        <td>
          ${u.is_blocked ? `<span class="badge bg-danger">Bloqueado</span>` : `<span class="badge bg-success">Activo</span>`}
        </td>
        <td class="small text-white-50">${new Date(u.created_at).toLocaleDateString()}</td>
        <td>
          <div class="d-flex gap-2">
            <button class="btn btn-sm ${u.is_blocked ? 'btn-success' : 'btn-warning'} btn-toggle-block" data-id="${u.id}" data-blocked="${u.is_blocked}">
              ${u.is_blocked ? "Desbloquear" : "Bloquear"}
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
            <label class="form-label small text-white-50">Título del Proyecto</label>
            <input type="text" id="proy-title" class="form-control custom-input" value="${escapeHTML(proyecto?.title || '')}" required>
          </div>
          <div class="col-md-4">
            <label class="form-label small text-white-50">Slug (URL amigable)</label>
            <input type="text" id="proy-slug" class="form-control custom-input" value="${escapeHTML(proyecto?.slug || '')}" placeholder="ej: mi-proyecto-web" required>
          </div>
        </div>
        <div class="mb-3">
          <label class="form-label small text-white-50">Descripción Corta</label>
          <input type="text" id="proy-short" class="form-control custom-input" value="${escapeHTML(proyecto?.short_description || '')}" required>
        </div>
        <div class="mb-3">
          <label class="form-label small text-white-50">Descripción Completa (Arquitectura & Detalles)</label>
          <textarea id="proy-full" rows="3" class="form-control custom-input" required>${escapeHTML(proyecto?.full_description || '')}</textarea>
        </div>
        <div class="row g-3 mb-3">
          <div class="col-md-6">
            <label class="form-label small text-white-50">Stack Tecnológico (separado por comas)</label>
            <input type="text" id="proy-tech" class="form-control custom-input" value="${escapeHTML((proyecto?.tech_stack || []).join(', '))}" placeholder="JavaScript, PostgreSQL, GSAP" required>
          </div>
          <div class="col-md-6">
            <label class="form-label small text-white-50">Imagen de Portada (Subida o URL)</label>
            <input type="file" id="proy-file" class="form-control custom-input mb-1" accept="image/*">
            <input type="url" id="proy-thumb" class="form-control custom-input" value="${escapeHTML(proyecto?.thumbnail_url || '')}" placeholder="https://...">
          </div>
        </div>
        <div class="row g-3 mb-4">
          <div class="col-md-6">
            <label class="form-label small text-white-50">URL Repositorio GitHub</label>
            <input type="url" id="proy-repo" class="form-control custom-input" value="${escapeHTML(proyecto?.repo_url || '')}">
          </div>
          <div class="col-md-6">
            <label class="form-label small text-white-50">URL Demo Desplegada</label>
            <input type="url" id="proy-demo" class="form-control custom-input" value="${escapeHTML(proyecto?.demo_url || '')}">
          </div>
        </div>
        <div class="form-check mb-4">
          <input class="form-check-input" type="checkbox" id="proy-published" ${proyecto?.published !== false ? "checked" : ""}>
          <label class="form-check-label text-white small" for="proy-published">Publicar inmediatamente en el portfolio</label>
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

      if (fileInput?.files?.length > 0) {
        btn.innerHTML = "Validando firma y subiendo imagen...";
        const uploaded = await uploadImage(fileInput.files[0], "proyectos");
        thumbUrl = uploaded.url;
      }

      const techStack = document.getElementById("proy-tech").value.split(",").map(s => s.trim()).filter(Boolean);

      const payload = {
        title: document.getElementById("proy-title").value,
        slug: document.getElementById("proy-slug").value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        short_description: document.getElementById("proy-short").value,
        full_description: document.getElementById("proy-full").value,
        tech_stack: techStack,
        thumbnail_url: thumbUrl || "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
        repo_url: document.getElementById("proy-repo").value || null,
        demo_url: document.getElementById("proy-demo").value || null,
        published: document.getElementById("proy-published").checked
      };

      if (isEdit) {
        await ProyectosService.update(proyecto.id, payload);
        Toast.success("Proyecto actualizado correctamente.");
      } else {
        await ProyectosService.create(payload);
        Toast.success("Proyecto creado exitosamente.");
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

function abrirModalServicio(servicio = null) {
  const isEdit = !!servicio;
  const html = `
    <div class="text-start">
      <h4 class="fw-bold mb-3">${isEdit ? "Editar Servicio" : "Nuevo Servicio"}</h4>
      <form id="form-admin-servicio">
        <div class="mb-3">
          <label class="form-label small text-white-50">Título del Servicio</label>
          <input type="text" id="serv-title" class="form-control custom-input" value="${escapeHTML(servicio?.title || '')}" required>
        </div>
        <div class="mb-3">
          <label class="form-label small text-white-50">Descripción</label>
          <textarea id="serv-desc" rows="3" class="form-control custom-input" required>${escapeHTML(servicio?.description || '')}</textarea>
        </div>
        <div class="mb-3">
          <label class="form-label small text-white-50">Icono SVG (código inline)</label>
          <textarea id="serv-icon" rows="2" class="form-control custom-input font-monospace small" required>${escapeHTML(servicio?.icon_svg || '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6049ea" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>')}</textarea>
        </div>
        <div class="mb-4">
          <label class="form-label small text-white-50">Características / Bullets (separados por comas)</label>
          <input type="text" id="serv-feat" class="form-control custom-input" value="${escapeHTML((servicio?.features || []).join(', '))}" required>
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
        title: document.getElementById("serv-title").value,
        description: document.getElementById("serv-desc").value,
        icon_svg: document.getElementById("serv-icon").value,
        features: document.getElementById("serv-feat").value.split(",").map(s => s.trim()).filter(Boolean),
        is_active: true
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
      Toast.error("Error al guardar servicio.");
    }
  });
}
