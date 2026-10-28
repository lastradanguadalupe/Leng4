// ==============================================================================
// public/js/services/consultas.service.js
// Servicio de Contactos, Cotizaciones y Gestión de Respuestas de Operadores
//
// ESQUEMA REAL (verificado probando la API columna por columna):
//
//   consultas  -> id, nombre, email, telefono, tipo, asunto, mensaje,
//                 estado, pais, ciudad, creado_en
//   respuestas -> id, consulta_id, operador_id, cuerpo, creado_en, enviado_en
//
// El código anterior insertaba `profile_id` y `metadata`, dos columnas que NO
// existen: el formulario de contacto devolvía 400 y no guardaba nada. Además
// ordenaba por `created_at` (es `creado_en`) y leía la tabla
// `respuestas_consultas`, que no existe: la real se llama `respuestas` y la
// columna del texto es `cuerpo`. Por eso el panel del operador no listaba
// ninguna consulta ni podía registrar respuestas.
// ==============================================================================

import { supabase } from "../core/supabase.js";
import { getCurrentUser } from "../core/auth.js";
import { checkClientRateLimit } from "../core/security.js";

export const ConsultasService = {
  /**
   * Envía una consulta o cotización desde el formulario público
   */
  async enviarConsulta({
    nombre,
    email,
    tipo,
    asunto,
    mensaje,
    telefono = "",
    honeypot = "",
    geoData = {}
  }) {
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

    // 3. Insertar en base de datos Supabase
    //    No se usa .select() a propósito: un visitante anónimo no tiene
    //    permiso SELECT sobre "consultas", y pedir RETURNING provoca
    //    "new row violates row-level security policy".
    const fila = {
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      tipo: tipo || "general",
      asunto: asunto.trim(),
      mensaje: mensaje.trim(),
      estado: "nueva",
      pais: geoData.country || null,
      ciudad: geoData.city || null
    };

    // El formulario de la home todavía no pide teléfono, pero la columna
    // existe: si algún día se agrega el campo, llega solo.
    if (telefono && telefono.trim()) {
      fila.telefono = telefono.trim();
    }

    const { error } = await supabase.from("consultas").insert(fila);

    if (error) {
      console.error("Error al guardar consulta en DB:", error);
      throw error;
    }

    // 4. Invocar Edge Function de notificación por email (si está desplegada).
    //    Hoy `send-email` NO está desplegada en el proyecto: la consulta queda
    //    guardada igual y el operador la ve en su panel, pero no sale el aviso
    //    por correo. El fallo se registra sin romperle el envío al visitante.
    try {
      const { error: edgeError } = await supabase.functions.invoke("send-email", {
        body: { nombre, email, tipo, asunto, mensaje }
      });
      if (edgeError) {
        console.warn("Aviso por email no enviado (Edge Function):", edgeError.message);
      }
    } catch (edgeErr) {
      console.warn("Aviso por email no enviado (Edge Function):", edgeErr.message);
    }

    return { status: "success" };
  },

  /**
   * Obtiene la lista de consultas con filtros (Para Operadores y Administradores)
   */
  async getConsultas({ tipo = "todos", estado = "todos", busqueda = "" } = {}) {
    let query = supabase
      .from("consultas")
      .select("*, respuestas(*)")
      .order("creado_en", { ascending: false });

    if (tipo && tipo !== "todos") {
      query = query.eq("tipo", tipo);
    }

    if (estado && estado !== "todos") {
      query = query.eq("estado", estado);
    }

    if (busqueda && busqueda.trim()) {
      const term = `%${busqueda.trim()}%`;
      query = query.or(
        `nombre.ilike.${term},email.ilike.${term},asunto.ilike.${term},mensaje.ilike.${term}`
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Actualiza el estado de una consulta ('nueva', 'en_seguimiento', 'respondida')
   */
  async updateEstado(consultaId, nuevoEstado) {
    // Sin `updated_at`: esa columna no existe en la tabla real.
    const { data, error } = await supabase
      .from("consultas")
      .update({ estado: nuevoEstado })
      .eq("id", consultaId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Registra la respuesta del operador y, si la Edge Function está disponible,
   * la envía por correo.
   *
   * `enviado_en` se completa SOLO si el correo salió de verdad. Antes el camino
   * de respaldo guardaba `enviado_exitosamente: true` aunque no se hubiera
   * mandado nada, así que el historial decía que el cliente fue contactado
   * cuando no lo era.
   */
  async responderConsulta({ consultaId, destinatarioEmail, asunto, mensaje }) {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.access_token) {
      throw new Error("No hay una sesión activa de operador.");
    }

    const user = getCurrentUser();
    if (!user?.id) {
      throw new Error("No pudimos identificar al operador. Volvé a iniciar sesión.");
    }

    // 1. Intentar el envío por correo. Si la Edge Function responde bien, ella
    //    misma guarda la fila en `respuestas` (tiene permisos de admin y es la
    //    única que sabe si el correo salió), así que acá NO insertamos de
    //    nuevo: si lo hiciéramos, el historial mostraría la respuesta dos veces.
    let correoEnviado = false;
    let guardadoPorLaFuncion = false;
    let respuesta = null;

    try {
      const { data, error: edgeError } = await supabase.functions.invoke("reply-contact", {
        body: {
          consulta_id: consultaId,
          destinatario_email: destinatarioEmail,
          asunto,
          mensaje
        }
      });

      if (edgeError) {
        console.warn("La Edge Function reply-contact falló:", edgeError.message);
      } else if (data?.status === "success") {
        correoEnviado = true;
        guardadoPorLaFuncion = true;
        respuesta = data.data || null;
      }
    } catch (e) {
      console.warn("No se pudo invocar reply-contact:", e.message);
    }

    // 2. Camino de respaldo: la función no está desplegada o falló, así que la
    //    respuesta se guarda desde el cliente, con `enviado_en` en null porque
    //    el correo no salió.
    if (!guardadoPorLaFuncion) {
      const { data, error } = await supabase
        .from("respuestas")
        .insert({
          consulta_id: consultaId,
          operador_id: user.id,
          cuerpo: mensaje,
          enviado_en: null
        })
        .select()
        .single();

      if (error) throw error;
      respuesta = data;
    }

    // 3. Marcar la consulta como respondida.
    await this.updateEstado(consultaId, "respondida");

    return { respuesta, correoEnviado };
  },

  /**
   * Obtiene el historial de respuestas para una consulta específica
   */
  async getHistorialRespuestas(consultaId) {
    const { data, error } = await supabase
      .from("respuestas")
      .select("*, profiles:operador_id(nombre, email)")
      .eq("consulta_id", consultaId)
      .order("creado_en", { ascending: true });

    if (error) throw error;
    return data || [];
  }
};
