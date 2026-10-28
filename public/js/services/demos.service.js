// ==============================================================================
// public/js/services/demos.service.js
// Servicio de Demos Interactivas
//
// ESQUEMA REAL de `demos`: id, titulo, proyecto_id, tipo, instrucciones,
// orden, creado_en. No tiene `descripcion` ni `publicado`.
// RLS: solo los usuarios con sesión pueden leerlas; a un visitante la consulta
// le devuelve 0 filas, que es el bloqueo que pide la consigna.
// ==============================================================================

import { supabase } from "../core/supabase.js";

export const DemosService = {
  /**
   * Obtiene todas las demos o las de un proyecto en particular
   */
  async getByProyecto(proyectoId = null) {
    // El embed pedía `proyectos(title, slug)` y la columna es `titulo`.
    let query = supabase
      .from("demos")
      .select("*, proyectos(titulo, slug)")
      .order("orden", { ascending: true });

    if (proyectoId) {
      query = query.eq("proyecto_id", proyectoId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Crea una nueva demo (Requiere Admin)
   */
  async create(demo) {
    const { data, error } = await supabase
      .from("demos")
      .insert(demo)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Actualiza una demo (Requiere Admin)
   */
  async update(id, updates) {
    const { data, error } = await supabase
      .from("demos")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Elimina una demo (Requiere Admin)
   */
  async delete(id) {
    const { error } = await supabase
      .from("demos")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  }
};
