// ==============================================================================
// public/js/services/testimonios.service.js
// Testimonios de clientes (ilustrativos, para el trabajo académico)
//
// ESQUEMA REAL de la tabla `testimonios`:
//   id, autor, rol_autor, empresa, texto, avatar_url, publicado, orden
// AJUSTES_PENDIENTES.sql agrega además `servicio` y `estrellas`.
// `avatar_url` se ignora a propósito: apunta a archivos que no existen y el
// diseño usa iniciales sobre un degradé, nunca fotos de personas.
// ==============================================================================

import { supabase } from "../core/supabase.js";

const COLUMNAS_BASE = "id, autor, rol_autor, empresa, texto, orden";
const COLUMNAS_AMPLIADAS = `${COLUMNAS_BASE}, servicio, estrellas`;

export const TestimoniosService = {
  /**
   * Testimonios publicados, ordenados por `orden`.
   * Si todavía no se corrió el SQL (faltan `servicio`/`estrellas`, error 42703)
   * se reintenta con las columnas originales en lugar de mostrar un error.
   */
  async getAll() {
    const consulta = (columnas) =>
      supabase
        .from("testimonios")
        .select(columnas)
        .eq("publicado", true)
        .order("orden", { ascending: true });

    let { data, error } = await consulta(COLUMNAS_AMPLIADAS);
    if (error && error.code === "42703") {
      ({ data, error } = await consulta(COLUMNAS_BASE));
    }
    if (error) throw error;
    return data || [];
  },

  /** Todos, publicados o no (panel de administración; lo limita RLS). */
  async getAllAdmin() {
    const { data, error } = await supabase
      .from("testimonios")
      .select("*")
      .order("orden", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async create(testimonio) {
    const { data, error } = await supabase.from("testimonios").insert(testimonio).select().single();
    if (error) throw error;
    return data;
  },

  async update(id, cambios) {
    const { data, error } = await supabase
      .from("testimonios")
      .update(cambios)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase.from("testimonios").delete().eq("id", id);
    if (error) throw error;
    return true;
  }
};
