// ==============================================================================
// public/js/services/usuarios.service.js
// Servicio de Gestión de Usuarios Registrados (Solo Administrador)
//
// ESQUEMA REAL de `profiles` (verificado contra la base):
//   id, rol, nombre, email, avatar_url, creado_en
//   + bloqueado  <- la agrega supabase/AJUSTES_PENDIENTES.sql
//
// El código anterior usaba `role`, `full_name`, `is_blocked`, `created_at` y
// `updated_at`: ninguna de esas columnas existe. Como resultado, el panel de
// gestión de usuarios fallaba con 400 en todas sus operaciones (listar,
// filtrar por rol, buscar, cambiar rol y bloquear).
// ==============================================================================

import { supabase } from "../core/supabase.js";

/** Roles válidos. Evita que un valor arbitrario llegue a la base. */
const ROLES_VALIDOS = ["registrado", "operador", "admin"];

export const UsuariosService = {
  /**
   * Obtiene la lista de usuarios con filtro de búsqueda y rol
   */
  async getAll({ busqueda = "", rol = "todos" } = {}) {
    let query = supabase
      .from("profiles")
      .select("*")
      .order("creado_en", { ascending: false });

    if (rol && rol !== "todos") {
      query = query.eq("rol", rol);
    }

    if (busqueda && busqueda.trim()) {
      const term = `%${busqueda.trim()}%`;
      query = query.or(`nombre.ilike.${term},email.ilike.${term}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Cambia el rol de un usuario ('registrado', 'operador', 'admin').
   * Quién puede hacerlo lo decide RLS, no este archivo.
   */
  async updateRole(userId, nuevoRol) {
    if (!ROLES_VALIDOS.includes(nuevoRol)) {
      throw new Error(`Rol inválido: "${nuevoRol}".`);
    }

    // Sin `updated_at`: esa columna no existe en la tabla real.
    const { data, error } = await supabase
      .from("profiles")
      .update({ rol: nuevoRol })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Bloquea o desbloquea el acceso de un usuario.
   *
   * Requiere la columna `profiles.bloqueado`, que agrega
   * supabase/AJUSTES_PENDIENTES.sql. Mientras no se haya corrido ese SQL, la
   * base responde 42703 y acá lo traducimos a un mensaje entendible en lugar
   * de dejar el error crudo de PostgreSQL en pantalla.
   */
  async toggleBlock(userId, bloqueado) {
    const { data, error } = await supabase
      .from("profiles")
      .update({ bloqueado: !!bloqueado })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      if (error.code === "42703") {
        throw new Error(
          "Falta la columna `bloqueado` en la tabla profiles. " +
            "Corré supabase/AJUSTES_PENDIENTES.sql en el SQL Editor."
        );
      }
      throw error;
    }
    return data;
  },

  /**
   * Elimina el perfil de un usuario.
   *
   * Importante: esto borra la fila de `profiles`, no la cuenta de
   * autenticación. El usuario sigue existiendo en `auth.users` y podría volver
   * a entrar (el trigger le recrearía el perfil con rol "registrado"). Para dar
   * de baja la cuenta de verdad hace falta la clave de servicio, que no puede
   * estar en el front: se hace desde el panel de Supabase o una Edge Function.
   */
  async deleteUser(userId) {
    const { error } = await supabase.from("profiles").delete().eq("id", userId);

    if (error) throw error;
    return true;
  }
};
