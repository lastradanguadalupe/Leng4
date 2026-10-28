// ==============================================================================
// public/js/core/supabase.js
// Inicialización del cliente Supabase en módulos ES puros (sin bundler)
// ==============================================================================

// Versión fijada a propósito. Con `@2` el CDN sirve la última v2 publicada y
// el sitio puede cambiar de comportamiento de un día para el otro sin que
// nadie toque el código, justo antes de una exposición. 2.118.0 soporta las
// claves nuevas `sb_publishable_...`.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm";
import { CONFIG } from "../config.js";

// Permitir sobreescribir las credenciales desde localStorage para pruebas o evaluación docente
const storedUrl = localStorage.getItem("custom_supabase_url");
const storedKey = localStorage.getItem("custom_supabase_key");

export const supabaseUrl = storedUrl || CONFIG.SUPABASE_URL;
export const supabaseKey = storedKey || CONFIG.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  }
});

// Helper de conectividad
export async function testConnection() {
  try {
    const { data, error } = await supabase.from("servicios").select("count").limit(1);
    if (error && error.code !== "PGRST116") {
      return { connected: false, error: error.message };
    }
    return { connected: true };
  } catch (err) {
    return { connected: false, error: err.message };
  }
}
