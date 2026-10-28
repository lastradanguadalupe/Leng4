// ==============================================================================
// supabase/functions/reply-contact/index.ts
// Supabase Edge Function: Envío de respuesta de operador por email y registro seguro
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReplyPayload {
  consulta_id: string;
  destinatario_email: string;
  asunto: string;
  mensaje: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Método no permitido" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Validar autenticación y rol de operador/admin a través del token JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Falta encabezado de autorización" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Sesión inválida o expirada" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar en profiles que sea 'operador' o 'admin'.
    // El esquema real usa `rol`, `nombre` y `bloqueado` (no role/full_name/
    // is_blocked): con los nombres viejos el SELECT fallaba y la función
    // denegaba el permiso a todos, incluso al admin.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("rol, bloqueado, nombre, email")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || (profile.rol !== "operador" && profile.rol !== "admin") || profile.bloqueado) {
      return new Response(JSON.stringify({ error: "Permiso denegado: solo operadores o administradores pueden responder consultas" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: ReplyPayload = await req.json();

    // Los límites del cuerpo (10 a 5000) y el formato del destinatario son los CHECK de `respuestas`.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
    const largo = payload.mensaje ? payload.mensaje.trim().length : 0;
    if (!payload.consulta_id || !payload.destinatario_email || !emailRegex.test(payload.destinatario_email.trim())) {
      return new Response(JSON.stringify({ error: "Faltan la consulta o un correo de destino válido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (largo < 10 || largo > 5000) {
      return new Response(JSON.stringify({ error: "La respuesta debe tener entre 10 y 5000 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanMensaje = payload.mensaje.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const cleanAsunto = String(payload.asunto || "Respuesta a tu consulta").replace(/[<>]/g, "");

    // 2. Enviar email vía Resend
    let emailSuccess = false;
    let providerId = null;
    let errorDetalle: string | null = null;

    if (RESEND_API_KEY) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Sin dominio verificado en Resend, el único remitente permitido es onboarding@resend.dev
          // (y solo entrega a la casilla del dueño de la cuenta de Resend).
          from: Deno.env.get("RESEND_FROM") || "Portfolio <onboarding@resend.dev>",
          to: [payload.destinatario_email],
          subject: cleanAsunto,
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #000000; color: #ffffff; padding: 28px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
              <h3 style="color: #6049ea; margin-top: 0;">Respuesta a tu consulta en nuestro Portfolio</h3>
              <p style="color: rgba(255,255,255,0.7); font-size: 14px;">Atendido por: <strong>${profile.nombre || profile.email}</strong></p>
              <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 18px 0;" />
              <div style="background: rgba(255,255,255,0.04); padding: 18px; border-radius: 8px; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">
                ${cleanMensaje}
              </div>
              <p style="margin-top: 24px; font-size: 12px; color: rgba(255,255,255,0.5);">Portfolio Fullstack - Lenguajes 4.</p>
            </div>
          `,
        }),
      });

      if (emailRes.ok) {
        const resData = await emailRes.json();
        emailSuccess = true;
        providerId = resData.id;
      } else {
        const errText = await emailRes.text();
        console.error("Fallo envío en Resend:", errText);
        errorDetalle = errText.slice(0, 500);
      }
    } else {
      // Sin clave no se envía nada: no se marca como enviado (enviado_en queda en null).
      console.log("Aviso: RESEND_API_KEY no configurada; la respuesta se guarda pero el correo no se envía.");
    }

    // 3. Registrar la respuesta en la tabla `respuestas`.
    //    La tabla real es `respuestas`, no `respuestas_consultas`. `enviado_a` es
    //    NOT NULL (sin él el INSERT fallaba con 500) y `estado_envio` es un enum:
    //    'enviado' si Resend aceptó el correo, 'error' si lo rechazó y 'simulado'
    //    si no hay RESEND_API_KEY. `enviado_en` se completa solo si salió de verdad.
    const estadoEnvio = emailSuccess ? "enviado" : RESEND_API_KEY ? "error" : "simulado";
    const { data: respuestaData, error: dbError } = await supabaseAdmin
      .from("respuestas")
      .insert({
        consulta_id: payload.consulta_id,
        operador_id: user.id,
        cuerpo: payload.mensaje.trim(),
        enviado_a: payload.destinatario_email.trim(),
        estado_envio: estadoEnvio,
        proveedor_id: providerId,
        error_detalle: errorDetalle,
        enviado_en: emailSuccess ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Error al registrar respuesta en BD:", dbError);
      return new Response(JSON.stringify({ error: "Error al guardar el historial en la base de datos" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // `enviado` dice si el correo salió de verdad; el cliente no debe inferirlo del status.
    return new Response(JSON.stringify({ status: "success", enviado: emailSuccess, estado_envio: estadoEnvio, provider_id: providerId, data: respuestaData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error general en reply-contact Edge Function:", error);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
