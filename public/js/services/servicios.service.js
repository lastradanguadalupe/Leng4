// ==============================================================================
// public/js/services/servicios.service.js
// Servicio de Servicios Profesionales Ofertados
//
// ESQUEMA REAL de la tabla `servicios` (verificado contra la base):
//   id (int), titulo, slug, descripcion, icono (slug, no SVG),
//   precio_desde (numeric), destacado (bool), activo (bool), orden (int),
//   creado_en, actualizado_en
//
// El código anterior consultaba nombres en inglés que NO existen
// (title, description, icon_svg, features, is_active). El filtro
// `.eq("is_active", true)` devolvía 400 con
// "column servicios.is_active does not exist", y de ahí venía el cartel
// "No se pudieron cargar los servicios".
// ==============================================================================

import { supabase } from "../core/supabase.js";

// Columnas públicas. Se listan explícitamente en lugar de `*` para no
// depender de que la tabla no cambie y para no traer datos de más.
const COLUMNAS_PUBLICAS = "id, titulo, slug, descripcion, icono, destacado, orden";
// `entregables` lo crea AJUSTES_PENDIENTES.sql. Si todavía no existe se reintenta sin ella.
const COLUMNAS_CON_ENTREGABLES = `${COLUMNAS_PUBLICAS}, entregables`;

export const ServiciosService = {
  /**
   * Obtiene los servicios ofertados.
   * @param {boolean} soloActivos filtra por `activo = true`
   */
  async getAll(soloActivos = true) {
    // El panel (soloActivos = false) necesita `activo` para mostrar el estado real.
    const extra = soloActivos ? "" : ", activo";
    const consulta = (columnas) => {
      let query = supabase.from("servicios").select(columnas + extra).order("orden", { ascending: true });
      if (soloActivos) query = query.eq("activo", true);
      return query;
    };

    let { data, error } = await consulta(COLUMNAS_CON_ENTREGABLES);
    if (error && error.code === "42703") {
      ({ data, error } = await consulta(COLUMNAS_PUBLICAS));
    }
    if (error) throw error;
    return data || [];
  },

  /**
   * Obtiene un servicio por su slug amigable.
   */
  async getBySlug(slug) {
    const { data, error } = await supabase
      .from("servicios")
      .select(COLUMNAS_PUBLICAS)
      .eq("slug", slug)
      .eq("activo", true)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Crea un servicio (Requiere Admin: lo impone RLS, no el front)
   */
  async create(servicio) {
    const { data, error } = await supabase
      .from("servicios")
      .insert(servicio)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Actualiza un servicio (Requiere Admin)
   */
  async update(id, updates) {
    const { data, error } = await supabase
      .from("servicios")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Elimina un servicio (Requiere Admin)
   */
  async delete(id) {
    const { error } = await supabase.from("servicios").delete().eq("id", id);
    if (error) throw error;
    return true;
  }
};
