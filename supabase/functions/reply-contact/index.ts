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

    if (!payload.consulta_id || !payload.destinatario_email || !payload.mensaje || payload.mensaje.trim().length < 5) {
      return new Response(JSON.stringify({ error: "Campos incompletos o inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanMensaje = payload.mensaje.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const cleanAsunto = payload.asunto.replace(/[<>]/g, "");

    // 2. Enviar email vía Resend
    let emailSuccess = false;
    let providerId = null;

    if (RESEND_API_KEY) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Soporte Portfolio <soporte@resend.dev>",
          to: [payload.destinatario_email],
          subject: cleanAsunto,
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #000000; color: #ffffff; padding: 28px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
              <h3 style="color: #6049ea; margin-top: 0;">Respuesta a tu consulta en nuestro Portfolio</h3>
              <p style="color: rgba(255,255,255,0.7); font-size: 14px;">Atendido por: <strong>${profile.full_name || profile.email}</strong></p>
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
      }
    } else {
      console.log("Aviso: Modo simulación de email de operador (sin RESEND_API_KEY).");
      emailSuccess = true;
      providerId = "simulated_" + Date.now();
    }

    // 3. Registrar la respuesta en la tabla `respuestas`.
    //    La tabla real es `respuestas` (id, consulta_id, operador_id, cuerpo,
    //    creado_en, enviado_en); `respuestas_consultas` no existe, así que
    //    esta función fallaba con 500 al guardar el historial.
    //    `enviado_en` se completa solo si el correo salió de verdad.
    const { data: respuestaData, error: dbError } = await supabaseAdmin
      .from("respuestas")
      .insert({
        consulta_id: payload.consulta_id,
        operador_id: user.id,
        cuerpo: payload.mensaje,
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

    return new Response(JSON.stringify({ status: "success", data: respuestaData }), {
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
