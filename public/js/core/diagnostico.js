// ==============================================================================
// public/js/core/diagnostico.js
// Módulo de diagnóstico de conexión. Solo para desarrollo.
//
// Uso: abrir la consola del navegador y escribir  await __diag()
//
// NUNCA imprime claves ni tokens: de la clave pública solo muestra el prefijo
// y la longitud, lo justo para saber si está cargada y de qué tipo es.
// ==============================================================================

import { supabase, supabaseUrl, supabaseKey } from "./supabase.js";
import { CONFIG } from "../config.js";

// Tablas y vistas que el sitio consulta, con las columnas que espera leer.
const OBJETIVOS = [
  { nombre: "servicios", columnas: "id, titulo, activo" },
  { nombre: "proyectos", columnas: "id, titulo, publicado" },
  { nombre: "proyectos_publicos", columnas: "id, titulo" },
  { nombre: "demos", columnas: "id, titulo" },
  { nombre: "testimonios", columnas: "id, autor, publicado" },
  { nombre: "tecnologias", columnas: "id, nombre" },
  { nombre: "consultas", columnas: "id" },
  { nombre: "profiles", columnas: "id, rol" },
  { nombre: "visitas", columnas: "id" }
];

// Columnas que NO deberían ser legibles sin sesión: son el bloqueo del detalle.
const COLUMNAS_PROTEGIDAS = [
  { tabla: "proyectos", columna: "descripcion" },
  { tabla: "proyectos", columna: "url_repo" },
  { tabla: "proyectos", columna: "cliente" }
];

/** Enmascara la clave: tipo, prefijo y longitud. Nunca el valor. */
function describirClave(clave) {
  if (!clave) return { presente: false };

  const esJWT = clave.startsWith("eyJ");
  const esPublishable = clave.startsWith("sb_publishable_");
  const esSecreta = clave.startsWith("sb_secret_") || clave.startsWith("service_role");

  return {
    presente: true,
    tipo: esPublishable
      ? "publishable (nueva)"
      : esJWT
        ? "anon JWT (formato viejo)"
        : esSecreta
          ? "¡SECRETA! No debe estar en el front"
          : "desconocido",
    prefijo: clave.slice(0, 16) + "…",
    longitud: clave.length,
    peligro: esSecreta
  };
}

/**
 * Comprueba si una tabla/vista es legible y cuántas filas devuelve.
 * Distingue los tres casos que importan:
 *   200 + filas  -> legible
 *   200 + 0      -> legible pero RLS filtra todo
 *   400          -> la columna o la tabla no existe (desajuste de esquema)
 *   401 / 403    -> existe pero sin permiso para este rol
 */
async function probarObjetivo({ nombre, columnas }) {
  try {
    const { data, error, count } = await supabase
      .from(nombre)
      .select(columnas, { count: "exact" })
      .limit(1);

    if (error) {
      const codigo = error.code || "";
      let lectura = error.message;
      if (codigo === "42703") lectura = "DESAJUSTE DE ESQUEMA: la columna no existe";
      else if (codigo === "42501") lectura = "sin permiso para este rol";
      else if (codigo === "PGRST205") lectura = "la tabla o vista no existe";
      return { objeto: nombre, ok: false, codigo, detalle: lectura };
    }

    return {
      objeto: nombre,
      ok: true,
      filas_visibles: count ?? (data ? data.length : 0),
      nota: (count ?? 0) === 0 ? "legible, pero RLS no devuelve filas para este rol" : ""
    };
  } catch (err) {
    return { objeto: nombre, ok: false, detalle: err.message };
  }
}

/** Verifica que las columnas del detalle sigan protegidas sin sesión. */
async function probarProteccion({ tabla, columna }) {
  const { error } = await supabase.from(tabla).select(columna).limit(1);
  if (!error) {
    return { columna: `${tabla}.${columna}`, protegida: false, nota: "LEGIBLE: el detalle NO está protegido" };
  }
  const denegada = error.code === "42501" || /permission denied/i.test(error.message || "");
  return {
    columna: `${tabla}.${columna}`,
    protegida: denegada,
    nota: denegada ? "denegada correctamente" : error.message
  };
}

/**
 * Diagnóstico completo. Devuelve un objeto y además lo imprime agrupado.
 */
export async function diagnosticar() {
  const informe = {};

  // --- a) Configuración ---
  informe.configuracion = {
    url_presente: !!supabaseUrl,
    url: supabaseUrl || "(falta)",
    clave: describirClave(supabaseKey),
    bucket: CONFIG.STORAGE_BUCKET,
    origen: window.location.origin,
    sobrescrito_por_localStorage: !!(
      localStorage.getItem("custom_supabase_url") || localStorage.getItem("custom_supabase_key")
    )
  };

  // --- b) ¿Responde la API? ---
  // Se consulta una tabla pública real y no la raíz `/rest/v1/`: la raíz
  // responde 401 siempre, y ese número asusta sin querer en el informe.
  try {
    const t0 = performance.now();
    const res = await fetch(`${supabaseUrl}/rest/v1/servicios?select=id&limit=1`, {
      headers: { apikey: supabaseKey }
    });
    informe.api = {
      alcanzable: true,
      http: res.status,
      autenticacion_ok: res.status !== 401,
      ms: Math.round(performance.now() - t0)
    };
    if (res.status === 401) {
      informe.api.pista = "La clave pública no fue aceptada: revisá que sea la del proyecto correcto.";
    }
  } catch (err) {
    informe.api = { alcanzable: false, error: err.message, pista: "Proyecto pausado, sin red o CORS" };
  }

  // --- c) Sesión ---
  const { data: { session } } = await supabase.auth.getSession();
  informe.sesion = session?.user
    ? {
        activa: true,
        email: session.user.email,
        user_id: session.user.id,
        proveedor: session.user.app_metadata?.provider,
        expira: new Date(session.expires_at * 1000).toLocaleString()
      }
    : { activa: false, rol_efectivo: "anon" };

  // --- d) Rol leído del perfil ---
  if (session?.user) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, rol, nombre, email")
      .eq("id", session.user.id)
      .maybeSingle();
    informe.perfil = error
      ? { ok: false, detalle: error.message, pista: "¿Existe el trigger que crea el perfil?" }
      : data
        ? { ok: true, rol: data.rol, nombre: data.nombre }
        : { ok: false, detalle: "No hay fila en profiles para este usuario", pista: "Falta el trigger de creación de perfil" };
  }

  // --- e) Tablas legibles ---
  informe.tablas = await Promise.all(OBJETIVOS.map(probarObjetivo));

  // --- f) Protección del detalle ---
  informe.proteccion_detalle = await Promise.all(COLUMNAS_PROTEGIDAS.map(probarProteccion));

  // --- Resumen de problemas ---
  const problemas = [];
  if (informe.configuracion.clave.peligro) {
    problemas.push("Hay una clave SECRETA en el front. Rotala ya y sacala del código.");
  }
  if (!informe.api.alcanzable) problemas.push("La API de Supabase no responde.");
  else if (informe.api.autenticacion_ok === false) problemas.push("La API rechazó la clave pública (401).");
  informe.tablas
    .filter((t) => !t.ok)
    .forEach((t) => problemas.push(`${t.objeto}: ${t.detalle}`));
  informe.proteccion_detalle
    .filter((p) => !p.protegida)
    .forEach((p) => problemas.push(`${p.columna}: ${p.nota}`));

  informe.problemas = problemas.length ? problemas : ["Sin problemas detectados."];

  // Impresión agrupada y legible
  console.group("%c🔍 Diagnóstico de conexión", "color:#6049ea;font-weight:bold");
  console.log("Configuración:", informe.configuracion);
  console.log("API:", informe.api);
  console.log("Sesión:", informe.sesion);
  if (informe.perfil) console.log("Perfil:", informe.perfil);
  console.table(informe.tablas);
  console.table(informe.proteccion_detalle);
  console.group("Problemas");
  informe.problemas.forEach((p) => console.log("•", p));
  console.groupEnd();
  console.groupEnd();

  return informe;
}

// Exponer solo en desarrollo (localhost o hosts .local/.test).
const esDesarrollo = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname) ||
  /\.(localhost|local|test)$/.test(window.location.hostname);

if (esDesarrollo) {
  window.__diag = diagnosticar;
  console.info(
    "%c🔍 Diagnóstico disponible: escribí  await __diag()  en la consola",
    "color:#6049ea"
  );
}
