// ==============================================================================
// public/js/services/servicios.service.js
// Servicio de Servicios Profesionales Ofertados
// ==============================================================================

import { supabase } from "../core/supabase.js";

export const ServiciosService = {
  /**
   * Obtiene todos los servicios activos
   */
  async getAll(onlyActive = true) {
    let query = supabase
      .from("servicios")
      .select("*")
      .order("orden", { ascending: true });

    if (onlyActive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Crea un servicio (Requiere Admin)
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
    const { error } = await supabase
      .from("servicios")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  }
};
