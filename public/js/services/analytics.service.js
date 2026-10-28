// ==============================================================================
// public/js/services/analytics.service.js
// Servicio de Métricas, Contadores de Visitas y Consultas Parametrizadas RPC
// ==============================================================================

import { supabase } from "../core/supabase.js";

/**
 * Hash SHA-256 irreversible y truncado de la IP del visitante.
 *
 * Antes esto era `btoa(ip).substring(0, 16)`, que NO es un hash: base64 es
 * reversible y una IPv4 entra completa en 16 caracteres, así que la columna
 * `ip_hash` guardaba la IP recuperable en texto. Eso contradecía la Política
 * de privacidad, que promete no almacenar la IP.
 */
async function hashIp(ip) {
  if (!ip) return null;
  try {
    const datos = new TextEncoder().encode(`portfolio-leng4:${ip}`);
    const buffer = await crypto.subtle.digest("SHA-256", datos);
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .substring(0, 16);
  } catch {
    // Sin Web Crypto disponible preferimos no mandar nada antes que mandar la IP.
    return null;
  }
}

export const AnalyticsService = {
  /**
   * Registra una visita (General o Autenticada).
   *
   * Solo debe llamarse si la persona aceptó la analítica: ver
   * components/cookie-consent.js. Si rechazó, la visita no se cuenta.
   */
  async recordVisit({ path = "/", geoData = {} } = {}) {
    // Generar o recuperar session_id único por sesión de navegador
    let sessionId = sessionStorage.getItem("portfolio_session_id");
    if (!sessionId) {
      sessionId = "sess_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 8);
      sessionStorage.setItem("portfolio_session_id", sessionId);
    }

    // Detectar tipo de dispositivo y resolución
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const deviceType = isMobile ? "mobile" : "desktop";
    const screenRes = `${window.screen.width}x${window.screen.height}`;
    const ipHash = await hashIp(geoData.ip);

    try {
      const { data, error } = await supabase.rpc("record_visit", {
        p_session_id: sessionId,
        p_page_path: path,
        p_referrer: document.referrer || "directo",
        p_ip_hash: ipHash,
        p_pais: geoData.country || null,
        p_ciudad: geoData.city || null,
        p_user_agent: navigator.userAgent.substring(0, 200),
        p_device_type: deviceType,
        p_screen_res: screenRes
      });

      if (error) {
        // Fallback si la función `record_visit` todavía no existe.
        // La tabla es `visitas` (no `analytics_visitas`) y sus columnas son
        // ruta, referente, dispositivo y resolucion, no page_path/referrer/
        // device_type/screen_resolution. Varias las agrega
        // supabase/AJUSTES_PENDIENTES.sql, así que esto puede seguir fallando
        // hasta que se corra ese SQL; el aviso queda en la consola.
        const { error: errorInsercion } = await supabase.from("visitas").insert({
          session_id: sessionId,
          ruta: path,
          referente: document.referrer || "directo",
          pais: geoData.country || null,
          ciudad: geoData.city || null,
          dispositivo: deviceType,
          resolucion: screenRes,
          ip_hash: ipHash
        });

        if (errorInsercion) {
          console.warn(
            "No se pudo registrar la visita. Corré supabase/AJUSTES_PENDIENTES.sql " +
              "para crear la función record_visit y completar la tabla `visitas`:",
            errorInsercion.message
          );
        }
      }
      return data;
    } catch (err) {
      console.warn("No se pudo registrar analytics de visita:", err.message);
    }
  },

  /**
   * Obtiene el resumen de KPIs globales (Admin)
   */
  async getSummary() {
    try {
      const { data, error } = await supabase.rpc("get_admin_dashboard_summary");
      if (error) throw error;
      return data;
    } catch (rpcErr) {
      console.warn("RPC get_admin_dashboard_summary falló, calculando con queries directas:", rpcErr);
      // Fallback con queries directas.
      // La tabla es `visitas` (no `analytics_visitas`, que no existe) y las
      // columnas son `autenticado` y `publicado`.
      const [visitasRes, authVisitasRes, usersRes, consultasRes, proyRes] = await Promise.all([
        supabase.from("visitas").select("id, session_id", { count: "exact" }),
        supabase.from("visitas").select("id", { count: "exact" }).eq("autenticado", true),
        supabase.from("profiles").select("id", { count: "exact" }),
        supabase.from("consultas").select("id, estado"),
        supabase.from("proyectos").select("id", { count: "exact" }).eq("publicado", true)
      ]);

      const totalVisitas = visitasRes.count || 0;
      const visitasAuth = authVisitasRes.count || 0;
      const uniqueSessions = new Set((visitasRes.data || []).map(v => v.session_id)).size;
      const consultasData = consultasRes.data || [];

      return {
        total_visitas: totalVisitas,
        visitas_unicas: uniqueSessions || totalVisitas,
        visitas_auth: visitasAuth,
        visitas_anonimas: Math.max(0, totalVisitas - visitasAuth),
        total_usuarios: usersRes.count || 0,
        total_consultas: consultasData.length,
        consultas_pendientes: consultasData.filter(c => c.estado !== "respondida").length,
        total_proyectos: proyRes.count || 0
      };
    }
  },

  /**
   * Tráfico parametrizado por fecha y agrupación (Admin)
   */
  async getTrafficTrends({ startDate, endDate, groupBy = "day" }) {
    try {
      const { data, error } = await supabase.rpc("get_traffic_analytics", {
        p_start_date: startDate,
        p_end_date: endDate,
        p_group_by: groupBy
      });
      if (error) throw error;
      return data || [];
    } catch (rpcErr) {
      console.warn("RPC get_traffic_analytics falló, generando dataset local:", rpcErr);
      return [];
    }
  },

  /**
   * Consultas agrupadas por tipo (Admin)
   */
  async getConsultasByType({ startDate, endDate }) {
    try {
      const { data, error } = await supabase.rpc("get_consultas_analytics", {
        p_start_date: startDate,
        p_end_date: endDate
      });
      if (error) throw error;
      return data || [];
    } catch (rpcErr) {
      console.warn("RPC get_consultas_analytics falló:", rpcErr);
      // Fallback
      const { data } = await supabase.from("consultas").select("tipo, estado");
      const map = { general: 0, cotizacion: 0, asesoria: 0 };
      (data || []).forEach(c => {
        if (map[c.tipo] !== undefined) map[c.tipo]++;
      });
      return Object.entries(map).map(([tipo, total]) => ({
        tipo,
        total,
        nuevas: 0,
        en_seguimiento: 0,
        respondidas: total
      }));
    }
  },

  /**
   * Flujo de registros de usuarios por fecha (Admin)
   */
  async getRegistrationsTrend({ startDate, endDate, groupBy = "day" }) {
    try {
      const { data, error } = await supabase.rpc("get_registrations_trend", {
        p_start_date: startDate,
        p_end_date: endDate,
        p_group_by: groupBy
      });
      if (error) throw error;
      return data || [];
    } catch (rpcErr) {
      console.warn("RPC get_registrations_trend falló:", rpcErr);
      return [];
    }
  },

  /**
   * Proyectos más vistos (Admin)
   */
  async getTopProjects(limit = 5) {
    try {
      const { data, error } = await supabase.rpc("get_top_projects_analytics", {
        p_limit: limit
      });
      if (error) throw error;
      return data || [];
    } catch (rpcErr) {
      // Sin la función no hay manera de saber las vistas reales.
      //
      // Antes este fallback DEVOLVÍA NÚMEROS INVENTADOS
      // (`total_views: (limit - idx) * 12`), así que el gráfico de "proyectos
      // más vistos" mostraba estadísticas falsas con total naturalidad. En un
      // panel de métricas que se evalúa, eso es peor que no mostrar nada:
      // ahora se devuelve vacío y el gráfico queda con su estado sin datos.
      console.warn(
        "RPC get_top_projects_analytics no disponible. " +
          "Corré supabase/AJUSTES_PENDIENTES.sql para crear las funciones de analítica.",
        rpcErr
      );
      return [];
    }
  }
};
