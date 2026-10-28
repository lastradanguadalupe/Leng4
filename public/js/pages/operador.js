// ==============================================================================
// public/js/pages/operador.js
// Panel de Operador: Gestión de Consultas, Filtros y Respuestas por Email
// ==============================================================================

import { requireRole, initAuth, getCurrentUser } from "../core/auth.js";
import { ConsultasService } from "../services/consultas.service.js";
import { Toast } from "../components/toast.js";
import { Modal } from "../components/modal.js";
import { CustomCursor } from "../components/cursor.js";
import { escapeHTML } from "../core/security.js";
import { CONFIG } from "../config.js";

let currentConsultas = [];
let selectedConsulta = null;

document.addEventListener("DOMContentLoaded", async () => {
  CustomCursor.init();
  await initAuth();

  // Validar rol de Operador o Administrador
  const authorized = await requireRole([CONFIG.ROLES.OPERADOR, CONFIG.ROLES.ADMIN]);
  if (!authorized) return;

  initFilters();
  await cargarConsultas();
});

/**
 * Carga las consultas según los filtros activos
 */
async function cargarConsultas() {
  const container = document.getElementById("consultas-list-tbody");
  if (!container) return;

  const tipo = document.getElementById("filter-tipo")?.value || "todos";
  const estado = document.getElementById("filter-estado")?.value || "todos";
  const busqueda = document.getElementById("search-consultas")?.value || "";

  container.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-white-50">Cargando consultas...</td></tr>`;

  try {
    currentConsultas = await ConsultasService.getConsultas({ tipo, estado, busqueda });

    if (!currentConsultas.length) {
      container.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-white-50">No se encontraron consultas con los filtros seleccionados.</td></tr>`;
      return;
    }

    container.innerHTML = currentConsultas.map((c) => {
      let badgeEstado = "bg-secondary";
      if (c.estado === "nueva") badgeEstado = "bg-primary";
      else if (c.estado === "en_seguimiento") badgeEstado = "bg-warning text-dark";
      else if (c.estado === "respondida") badgeEstado = "bg-success";

      // La columna es `creado_en`: con `created_at` la fecha salía "Invalid Date".
      const fecha = new Date(c.creado_en).toLocaleDateString([], {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      });

      return `
        <tr class="align-middle">
          <td><span class="badge ${badgeEstado}">${c.estado}</span></td>
          <td><span class="badge badge-accent">${c.tipo}</span></td>
          <td>
            <strong>${escapeHTML(c.nombre)}</strong><br>
            <small class="text-white-50">${escapeHTML(c.email)}</small>
          </td>
          <td>
            <div class="fw-semibold text-white">${escapeHTML(c.asunto)}</div>
            <small class="text-white-50 text-truncate d-inline-block" style="max-width: 280px;">
              ${escapeHTML(c.mensaje)}
            </small>
          </td>
          <td class="small text-white-50">${fecha}</td>
          <td>
            <button class="btn btn-sm btn-outline-custom btn-ver-detalle" data-id="${c.id}">
              Gestionar
            </button>
          </td>
        </tr>
      `;
    }).join("");

    // Event listeners para botones de gestión
    container.querySelectorAll(".btn-ver-detalle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        abrirModalGestion(id);
      });
    });

  } catch (err) {
    console.error("Error cargando consultas:", err);
    // Antes solo salía un toast y la tabla quedaba con "Cargando consultas..."
    // para siempre, sin manera de reintentar.
    container.innerHTML = `
      <tr><td colspan="6" class="text-center py-4">
        <div class="text-white-50 mb-2">No pudimos traer las consultas.</div>
        <button type="button" class="btn btn-sm btn-outline-custom" id="btn-reintentar-consultas">Reintentar</button>
      </td></tr>`;
    document
      .getElementById("btn-reintentar-consultas")
      ?.addEventListener("click", () => cargarConsultas());
    Toast.error("No pudimos traer las consultas.");
  }
}

/**
 * Abre el modal con el detalle completo, historial de respuestas y formulario de envío
 */
async function abrirModalGestion(consultaId) {
  // `consultaId` llega del atributo data-id, que siempre es texto, mientras que
  // `c.id` es un entero de la base. Con `===` nunca coincidían y el botón
  // "Gestionar" no abría nada.
  selectedConsulta = currentConsultas.find((c) => String(c.id) === String(consultaId));
  if (!selectedConsulta) {
    Toast.error("No encontramos esa consulta. Probá recargar la lista.");
    return;
  }

  const respuestas = await ConsultasService.getHistorialRespuestas(consultaId);

  const html = `
    <div class="consulta-detail-modal text-start">
      <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary">
        <div>
          <span class="badge badge-accent mb-1">${selectedConsulta.tipo.toUpperCase()}</span>
          <h4 class="fw-bold mb-0">${escapeHTML(selectedConsulta.asunto)}</h4>
        </div>
        <div class="d-flex gap-2">
          <select id="select-cambiar-estado" class="form-select form-select-sm bg-dark text-white border-secondary" style="width: 160px;">
            <option value="nueva" ${selectedConsulta.estado === "nueva" ? "selected" : ""}>Nueva</option>
            <option value="en_seguimiento" ${selectedConsulta.estado === "en_seguimiento" ? "selected" : ""}>En Seguimiento</option>
            <option value="respondida" ${selectedConsulta.estado === "respondida" ? "selected" : ""}>Respondida</option>
          </select>
        </div>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-sm-6">
          <small class="text-white-50">Remitente:</small>
          <div class="fw-bold">${escapeHTML(selectedConsulta.nombre)} &lt;${escapeHTML(selectedConsulta.email)}&gt;</div>
        </div>
        <div class="col-sm-6 text-sm-end">
          <small class="text-white-50">Origen:</small>
          <div>${selectedConsulta.ciudad || "Desconocida"}, ${selectedConsulta.pais || "Desconocido"}</div>
        </div>
      </div>

      <div class="p-3 mb-4 rounded" style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);">
        <small class="text-white-50 d-block mb-1">Mensaje de la consulta:</small>
        <p class="mb-0 text-white" style="white-space: pre-wrap;">${escapeHTML(selectedConsulta.mensaje)}</p>
      </div>

      <!-- HISTORIAL DE RESPUESTAS -->
      <h5 class="fw-bold mb-3 text-accent">Historial de Respuestas (${respuestas.length})</h5>
      <div class="respuestas-history mb-4" style="max-height: 200px; overflow-y: auto;">
        ${respuestas.length === 0 ? `
          <div class="text-white-50 small p-2">Aún no se han enviado respuestas a este contacto.</div>
        ` : respuestas.map(r => `
          <div class="p-2 mb-2 rounded bg-dark border border-secondary small">
            <div class="d-flex justify-content-between text-white-50 mb-1">
              <span>Atendido por: <strong>${escapeHTML(r.profiles?.nombre || "Operador")}</strong></span>
              <span>${new Date(r.creado_en).toLocaleString()}</span>
            </div>
            <div class="text-white">${escapeHTML(r.cuerpo || "")}</div>
            ${
              r.enviado_en
                ? `<div class="text-white-50 mt-1">Enviado por correo el ${new Date(r.enviado_en).toLocaleString()}</div>`
                : `<div class="mt-1" style="color: #d9bf5a;">Guardada en el historial, pero el correo no se envió</div>`
            }
          </div>
        `).join("")}
      </div>

      <!-- FORMULARIO DE RESPUESTA POR EMAIL -->
      <div class="reply-box p-3 rounded" style="background: rgba(96, 73, 234, 0.05); border: 1px solid rgba(96, 73, 234, 0.3);">
        <h5 class="fw-bold mb-2">Responder por Correo Electrónico</h5>
        <form id="form-responder-consulta">
          <div class="mb-2">
            <label class="form-label small text-white-50">Asunto de respuesta</label>
            <input type="text" id="reply-asunto" class="form-control form-control-sm custom-input" value="Re: ${escapeHTML(selectedConsulta.asunto)}" required>
          </div>
          <div class="mb-3">
            <label class="form-label small text-white-50">Mensaje de respuesta</label>
            <textarea id="reply-mensaje" rows="4" class="form-control form-control-sm custom-input" placeholder="Escribe tu respuesta aquí..." required></textarea>
          </div>
          <div class="d-flex justify-content-end gap-2">
            <button type="submit" class="btn btn-accent-custom btn-sm" id="btn-enviar-respuesta">
              ✉ Enviar Respuesta por Email
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  Modal.open(html);

  // Vincular cambio de estado directo
  const selectEstado = document.getElementById("select-cambiar-estado");
  if (selectEstado) {
    const ETIQUETAS_ESTADO = {
      nueva: "Nueva",
      en_seguimiento: "En seguimiento",
      respondida: "Respondida"
    };

    selectEstado.addEventListener("change", async () => {
      try {
        await ConsultasService.updateEstado(consultaId, selectEstado.value);
        Toast.success(`Estado actualizado a "${ETIQUETAS_ESTADO[selectEstado.value] || selectEstado.value}".`);
        cargarConsultas();
      } catch (err) {
        console.error("Error al actualizar el estado:", err);
        Toast.error("No pudimos actualizar el estado.");
      }
    });
  }

  // Vincular envío de respuesta
  const formReply = document.getElementById("form-responder-consulta");
  if (formReply) {
    formReply.addEventListener("submit", async (e) => {
      e.preventDefault();
      const asunto = document.getElementById("reply-asunto").value;
      const mensaje = document.getElementById("reply-mensaje").value;
      const btn = document.getElementById("btn-enviar-respuesta");

      try {
        btn.disabled = true;
        btn.innerHTML = "Enviando email...";

        const { correoEnviado } = await ConsultasService.responderConsulta({
          consultaId: selectedConsulta.id,
          destinatarioEmail: selectedConsulta.email,
          asunto: asunto,
          mensaje: mensaje
        });

        // No afirmamos que salió el correo si no salió: hoy la Edge Function
        // reply-contact no está desplegada, así que lo normal es lo segundo.
        if (correoEnviado) {
          Toast.success("Respuesta enviada por correo y guardada en el historial.");
        } else {
          Toast.warning(
            "Respuesta guardada en el historial, pero el correo no se envió: falta desplegar la Edge Function."
          );
        }
        Modal.close();
        cargarConsultas();
      } catch (err) {
        console.error("Error respondiendo consulta:", err);
        Toast.error(err.message || "Error al enviar la respuesta.");
      } finally {
        btn.disabled = false;
        btn.innerHTML = "✉ Enviar Respuesta por Email";
      }
    });
  }
}

/**
 * Inicializa filtros con debounce
 */
function initFilters() {
  const filterTipo = document.getElementById("filter-tipo");
  const filterEstado = document.getElementById("filter-estado");
  const searchInput = document.getElementById("search-consultas");

  if (filterTipo) filterTipo.addEventListener("change", () => cargarConsultas());
  if (filterEstado) filterEstado.addEventListener("change", () => cargarConsultas());

  let timeout = null;
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => cargarConsultas(), 300);
    });
  }
}
