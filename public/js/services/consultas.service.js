// ==============================================================================
// public/js/services/consultas.service.js
// Servicio de Contactos, Cotizaciones y Gestión de Respuestas de Operadores
// ==============================================================================

import { supabase, supabaseUrl } from "../core/supabase.js";
import { getCurrentUser } from "../core/auth.js";
import { checkClientRateLimit } from "../core/security.js";

export const ConsultasService = {
  /**
   * Envía una consulta o cotización desde el formulario público
   */
  async enviarConsulta({ nombre, email, tipo, asunto, mensaje, honeypot = "", geoData = {} }) {
    // 1. Anti-spam Rate Limiting
    const rateCheck = checkClientRateLimit("contact_form", 4, 120000);
    if (!rateCheck.allowed) {
      throw new Error(rateCheck.message);
    }

    // 2. Anti-spam Honeypot
    if (honeypot && honeypot.trim() !== "") {
      // Simular éxito silencioso ante bots
      return { status: "success", id: "bot-filtered" };
    }

    const user = getCurrentUser();

    // 3. Insertar en base de datos Supabase
    //    Nota: no se usa .select() a propósito. Un visitante anónimo NO tiene
    //    permiso SELECT sobre "consultas" (solo staff o el propio remitente),
    //    y pedir RETURNING provoca: "new row violates row-level security policy".
    const { error } = await supabase
      .from("consultas")
      .insert({
        profile_id: user?.id || null,
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        tipo: tipo || "general",
        asunto: asunto.trim(),
        mensaje: mensaje.trim(),
        estado: "nueva",
        pais: geoData.country || null,
        ciudad: geoData.city || null,
        metadata: {
          userAgent: navigator.userAgent,
          submittedAt: new Date().toISOString()
        }
      });

    if (error) {
      console.error("Error al guardar consulta en DB:", error);
      throw error;
    }

    // 4. Invocar Edge Function de notificación por email (si está configurada)
    try {
      await supabase.functions.invoke("send-email", {
        body: {
          nombre,
          email,
          tipo,
          asunto,
          mensaje,
          honeypot
        }
      });
    } catch (edgeErr) {
      console.warn("Aviso: Notificación por Edge Function no enviada:", edgeErr.message);
    }

    return { status: "success" };
  },

  /**
   * Obtiene la lista de consultas con filtros (Para Operadores y Administradores)
   */
  async getConsultas({ tipo = "todos", estado = "todos", busqueda = "" } = {}) {
    let query = supabase
      .from("consultas")
      .select("*, respuestas_consultas(*)")
      .order("created_at", { ascending: false });

    if (tipo && tipo !== "todos") {
      query = query.eq("tipo", tipo);
    }

    if (estado && estado !== "todos") {
      query = query.eq("estado", estado);
    }

    if (busqueda && busqueda.trim()) {
      const term = `%${busqueda.trim()}%`;
      query = query.or(`nombre.ilike.${term},email.ilike.${term},asunto.ilike.${term},mensaje.ilike.${term}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Actualiza el estado de una consulta ('nueva', 'en_seguimiento', 'respondida')
   */
  async updateEstado(consultaId, nuevoEstado) {
    const { data, error } = await supabase
      .from("consultas")
      .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
      .eq("id", consultaId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Envía una respuesta por email desde el panel de operador y guarda en el historial
   */
  async responderConsulta({ consultaId, destinatarioEmail, asunto, mensaje }) {
    // 1. Invocar la Edge Function reply-contact (autenticada con el JWT del operador)
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      throw new Error("No hay una sesión activa de operador");
    }

    let edgeResponse;
    try {
      const res = await supabase.functions.invoke("reply-contact", {
        body: {
          consulta_id: consultaId,
          destinatario_email: destinatarioEmail,
          asunto: asunto,
          mensaje: mensaje
        }
      });
      edgeResponse = res;
    } catch (e) {
      console.warn("Fallo invoke Edge Function, aplicando guardado directo en DB:", e);
    }

    // 2. Si no hay Edge Function disponible o falló la invocación remota, guardar directamente en la tabla
    if (!edgeResponse || edgeResponse.error) {
      const user = getCurrentUser();
      const { data: directResp, error: directError } = await supabase
        .from("respuestas_consultas")
        .insert({
          consulta_id: consultaId,
          operador_id: user.id,
          destinatario_email: destinatarioEmail,
          asunto: asunto,
          mensaje: mensaje,
          enviado_exitosamente: true,
          provider_id: "local_record"
        })
        .select()
        .single();

      if (directError) throw directError;

      // Actualizar estado a 'respondida'
      await this.updateEstado(consultaId, "respondida");
      return directResp;
    }

    return edgeResponse.data;
  },

  /**
   * Obtiene el historial de respuestas para una consulta específica
   */
  async getHistorialRespuestas(consultaId) {
    const { data, error } = await supabase
      .from("respuestas_consultas")
      .select("*, profiles:operador_id(full_name, email)")
      .eq("consulta_id", consultaId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  }
};
