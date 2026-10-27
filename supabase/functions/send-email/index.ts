// ==============================================================================
// supabase/functions/send-email/index.ts
// Supabase Edge Function: Envío de notificación por email de nuevo contacto (Resend)
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const PORTFOLIO_OWNER_EMAIL = Deno.env.get("PORTFOLIO_OWNER_EMAIL") || "contacto@portfolio.dev";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactPayload {
  nombre: string;
  email: string;
  tipo: "general" | "cotizacion" | "asesoria";
  asunto: string;
  mensaje: string;
  honeypot?: string; // Anti-spam
}

serve(async (req: Request) => {
  // Manejo de preflight CORS
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

    const payload: ContactPayload = await req.json();

    // 1. Anti-spam: Verificar campo honeypot
    if (payload.honeypot && payload.honeypot.trim() !== "") {
      // Es un bot completando campos ocultos; responder 200 sin procesar
      return new Response(JSON.stringify({ status: "success", message: "Procesado" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Validación estricta de campos
    if (!payload.nombre || payload.nombre.trim().length < 2) {
      return new Response(JSON.stringify({ error: "El nombre debe tener al menos 2 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!payload.email || !emailRegex.test(payload.email.trim())) {
      return new Response(JSON.stringify({ error: "El correo electrónico no es válido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!payload.mensaje || payload.mensaje.trim().length < 10) {
      return new Response(JSON.stringify({ error: "El mensaje debe contener al menos 10 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Sanitización de caracteres peligrosos contra inyecciones
    const cleanNombre = payload.nombre.replace(/[<>]/g, "");
    const cleanAsunto = payload.asunto.replace(/[<>]/g, "");
    const cleanMensaje = payload.mensaje.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // 4. Enviar notificación al dueño del portfolio mediante Resend API
    if (RESEND_API_KEY) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Portfolio Contact <onboarding@resend.dev>",
          to: [PORTFOLIO_OWNER_EMAIL],
          reply_to: payload.email,
          subject: `[Portfolio - ${payload.tipo.toUpperCase()}] ${cleanAsunto}`,
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #000000; color: #ffffff; padding: 28px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
              <h2 style="color: #6049ea; margin-top: 0; font-size: 22px;">Nueva Consulta de Contacto</h2>
              <p style="margin: 8px 0;"><strong>Remitente:</strong> ${cleanNombre} (&lt;${payload.email}&gt;)</p>
              <p style="margin: 8px 0;"><strong>Tipo:</strong> <span style="background: rgba(96, 73, 234, 0.2); color: #6049ea; padding: 3px 8px; border-radius: 4px; font-weight: bold; text-transform: uppercase;">${payload.tipo}</span></p>
              <p style="margin: 8px 0;"><strong>Asunto:</strong> ${cleanAsunto}</p>
              <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 20px 0;" />
              <div style="background: rgba(255,255,255,0.04); padding: 16px; border-radius: 8px; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">
                ${cleanMensaje}
              </div>
              <p style="margin-top: 24px; font-size: 12px; color: rgba(255,255,255,0.5);">Enviado automáticamente desde el Portfolio Fullstack - TPI Lenguajes 4.</p>
            </div>
          `,
        }),
      });

      if (!emailRes.ok) {
        const errorDetail = await emailRes.text();
        console.error("Error al enviar email con Resend:", errorDetail);
      }
    } else {
      console.log("Aviso: RESEND_API_KEY no configurada en las variables de entorno. Notificación simulada.");
    }

    return new Response(
      JSON.stringify({
        status: "success",
        message: "Consulta recibida y procesada correctamente",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error en send-email Edge Function:", error);
    return new Response(
      JSON.stringify({ error: "Ocurrió un error inesperado al procesar el mensaje" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
