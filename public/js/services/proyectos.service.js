// ==============================================================================
// public/js/services/proyectos.service.js
// Servicio de Proyectos y Casos de Éxito
// ==============================================================================

import { supabase } from "../core/supabase.js";

export const ProyectosService = {
  /**
   * Obtiene la lista de proyectos
   * @param {boolean} onlyPublished - Si filtra solo proyectos publicados
   */
  async getAll(onlyPublished = true) {
    let query = supabase
      .from("proyectos")
      .select("*, demos(*)")
      .order("orden", { ascending: true })
      .order("created_at", { ascending: false });

    if (onlyPublished) {
      query = query.eq("published", true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Obtiene un proyecto por su slug
   */
  async getBySlug(slug) {
    const { data, error } = await supabase
      .from("proyectos")
      .select("*, demos(*)")
      .eq("slug", slug)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Crea un nuevo proyecto (Requiere Admin)
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
   * Actualiza un proyecto existente (Requiere Admin)
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
    const { error } = await supabase
      .from("proyectos")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  },

  /**
   * Registra una vista del proyecto para métricas
   */
  async recordView(proyectoId) {
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
