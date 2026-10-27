// ==============================================================================
// public/js/services/usuarios.service.js
// Servicio de Gestión de Usuarios Registrados (Solo Administrador)
// ==============================================================================

import { supabase } from "../core/supabase.js";

export const UsuariosService = {
  /**
   * Obtiene la lista de usuarios con filtro de búsqueda y rol
   */
  async getAll({ busqueda = "", rol = "todos" } = {}) {
    let query = supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (rol && rol !== "todos") {
      query = query.eq("role", rol);
    }

    if (busqueda && busqueda.trim()) {
      const term = `%${busqueda.trim()}%`;
      query = query.or(`full_name.ilike.${term},email.ilike.${term}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Cambia el rol de un usuario ('registrado', 'operador', 'admin')
   */
  async updateRole(userId, newRole) {
    const { data, error } = await supabase
      .from("profiles")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Bloquea o desbloquea el acceso de un usuario
   */
  async toggleBlock(userId, isBlocked) {
    const { data, error } = await supabase
      .from("profiles")
      .update({ is_blocked: isBlocked, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Elimina un usuario de profiles (cascada sobre datos relacionados)
   */
  async deleteUser(userId) {
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (error) throw error;
    return true;
  }
};
