// ==============================================================================
// public/js/services/proyectos.service.js
// Servicio de Proyectos y Casos de Éxito
//
// ESQUEMA REAL de `proyectos` (verificado contra la base, probando columna por
// columna qué responde la API como rol anon):
//
//   LEGIBLE por anon  -> id, titulo, slug, resumen, imagen_portada,
//                        categoria, anio, destacado, publicado, orden, creado_en
//   DENEGADO a anon   -> descripcion, url_repo, cliente
//
// Ese permiso por columna ES el bloqueo del lado del servidor que pide la
// consigna: el listado es público, pero el DETALLE no se puede leer sin sesión
// aunque alguien llame a la API a mano. La tabla `demos` devuelve 0 filas a
// anon por RLS, así que las demos también están protegidas en el servidor.
//
// El código anterior pedía nombres en inglés inexistentes (title, published,
// short_description, thumbnail_url, tech_stack, repo_url) y el filtro
// `.eq("published", true)` devolvía 400 "column proyectos.published does not
// exist": de ahí venía "Error cargando proyectos del portfolio".
// ==============================================================================

import { supabase } from "../core/supabase.js";
import { CookieConsent } from "../components/cookie-consent.js";

// Columnas que anon tiene permitido leer, más el stack vía tabla puente.
const COLUMNAS_LISTADO =
  "id, titulo, slug, resumen, imagen_portada, anio, destacado, orden, proyecto_tecnologias(tecnologias(nombre, icono))";

// Columnas del detalle. Requieren sesión: a anon la API responde 401.
const COLUMNAS_DETALLE = `${COLUMNAS_LISTADO}, descripcion, url_repo, cliente`;

/**
 * Aplana el embed de PostgREST `proyecto_tecnologias(tecnologias(...))`
 * a un array simple de { nombre, icono }.
 */
function normalizarTecnologias(proyecto) {
  const puente = proyecto?.proyecto_tecnologias || [];
  const tecnologias = puente
    .map((fila) => fila?.tecnologias)
    .filter(Boolean);

  const { proyecto_tecnologias, ...resto } = proyecto;
  return { ...resto, tecnologias };
}

export const ProyectosService = {
  /**
   * Listado público de proyectos publicados.
   * No pide `descripcion` para no provocar un 401 innecesario.
   */
  async getAll(soloPublicados = true) {
    let query = supabase
      .from("proyectos")
      .select(COLUMNAS_LISTADO)
      .order("orden", { ascending: true });

    if (soloPublicados) {
      query = query.eq("publicado", true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(normalizarTecnologias);
  },

  /**
   * Detalle completo de un proyecto. Solo funciona con sesión iniciada:
   * sin sesión la base deniega las columnas `descripcion`, `url_repo` y
   * `cliente`, y este método propaga ese error para que la UI muestre el
   * bloqueo y el CTA de registro.
   */
  async getDetalle(slug) {
    const { data, error } = await supabase
      .from("proyectos")
      .select(COLUMNAS_DETALLE)
      .eq("slug", slug)
      .eq("publicado", true)
      .maybeSingle();

    if (error) throw error;
    return data ? normalizarTecnologias(data) : null;
  },

  /**
   * Demos interactivas de un proyecto.
   * RLS devuelve 0 filas sin sesión, así que un visitante nunca las obtiene.
   */
  async getDemos(proyectoId) {
    const { data, error } = await supabase
      .from("demos")
      .select("id, titulo, proyecto_id, tipo, instrucciones, orden")
      .eq("proyecto_id", proyectoId)
      .order("orden", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Crea un proyecto (Requiere Admin: lo impone RLS)
   */
  async create(proyecto) {
    const { data, error } = await supabase
      .from("proyectos")
      .insert(proyecto)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Actualiza un proyecto (Requiere Admin)
   */
  async update(id, updates) {
    const { data, error } = await supabase
      .from("proyectos")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Elimina un proyecto (Requiere Admin)
   */
  async delete(id) {
    const { error } = await supabase.from("proyectos").delete().eq("id", id);
    if (error) throw error;
    return true;
  },

  /**
   * Registra una vista del proyecto para métricas.
   *
   * Respeta el consentimiento de analítica: si la persona lo rechazó, no se
   * registra la vista ni se crea el identificador de sesión. Antes esta vía
   * medía igual, así que rechazar en el banner no alcanzaba para dejar de
   * ser contado y contradecía la Política de cookies.
   */
  async recordView(proyectoId) {
    if (!CookieConsent.puedeMedir()) return;

    let sessionId = sessionStorage.getItem("portfolio_session_id");
    if (!sessionId) {
      sessionId = "sess_" + Math.random().toString(36).substring(2, 10);
      sessionStorage.setItem("portfolio_session_id", sessionId);
    }

    try {
      await supabase.rpc("record_project_view", {
        p_proyecto_id: proyectoId,
        p_session_id: sessionId
      });
    } catch (err) {
      console.warn("No se pudo registrar la vista del proyecto:", err);
    }
  }
};
