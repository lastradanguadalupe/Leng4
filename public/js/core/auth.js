// ==============================================================================
// public/js/core/auth.js
// Gestión Completa de Autenticación, Roles y Sesión con Supabase
// ==============================================================================

import { supabase } from "./supabase.js";
import { CONFIG } from "../config.js";
import { Toast } from "../components/toast.js";

// Estado en memoria para cachear el usuario y perfil actual
let currentUser = null;
let currentProfile = null;
const listeners = [];

/**
 * Notifica a los observadores registrados sobre cambios en la sesión
 */
function notifyListeners() {
  listeners.forEach(fn => fn({ user: currentUser, profile: currentProfile }));
}

/**
 * Suscribirse a cambios de estado de autenticación
 */
export function onAuthStateChange(callback) {
  listeners.push(callback);
  // Llamar inmediatamente con el estado actual
  callback({ user: currentUser, profile: currentProfile });
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

/**
 * Lee el rol de una fila de `profiles`.
 *
 * El esquema real usa la columna **`rol`** (español). El código anterior leía
 * `profile.role`, que siempre venía `undefined`: por eso TODO usuario caía al
 * rol "registrado" y ni el admin ni el operador podían entrar a sus paneles.
 * Se acepta `role` como alternativa por si alguna migración vieja la dejó.
 */
export function leerRol(profile) {
  return profile?.rol || profile?.role || CONFIG.ROLES.REGISTRADO;
}

/** Lee el nombre visible. La columna real es `nombre`, no `full_name`. */
export function leerNombre(profile, user) {
  return (
    profile?.nombre ||
    profile?.full_name ||
    user?.user_metadata?.nombre ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Usuario"
  );
}

/** ¿La cuenta está bloqueada? Tolera ambos nombres de columna. */
function estaBloqueado(profile) {
  return profile?.bloqueado === true || profile?.is_blocked === true;
}

/**
 * Carga o refresca el perfil del usuario actual desde la tabla 'profiles'.
 *
 * Se usa `select("*")` a propósito: el esquema de `profiles` todavía está en
 * movimiento (por ejemplo la columna de bloqueo puede no existir aún) y pedir
 * columnas que no están devuelve 400 y tiraría la sesión entera.
 */
export async function loadCurrentProfile(userId) {
  if (!userId) {
    currentUser = null;
    currentProfile = null;
    notifyListeners();
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) {
      if (error) {
        console.warn("No se pudo cargar el perfil detallado:", error.message);
      } else {
        console.warn(
          "No existe fila en `profiles` para este usuario. " +
            "Falta el trigger que crea el perfil al registrarse."
        );
      }
      currentProfile = {
        id: userId,
        email: currentUser?.email || "",
        rol: CONFIG.ROLES.REGISTRADO,
        bloqueado: false
      };
    } else {
      currentProfile = data;
    }

    // Verificar si el usuario está bloqueado por el administrador
    if (estaBloqueado(currentProfile)) {
      await signOut();
      throw new Error("Tu cuenta está bloqueada por un administrador. Escribinos para recuperarla.");
    }

    notifyListeners();
    return currentProfile;
  } catch (err) {
    console.error("Error al obtener perfil:", err);
    throw err;
  }
}

/**
 * Traduce los errores de Supabase Auth a mensajes en español.
 * Evita mostrarle al visitante textos crudos en inglés como
 * "Invalid login credentials" o "User already registered".
 */
export function traducirErrorAuth(err) {
  const original = (err?.message || "").toLowerCase();
  const codigo = err?.code || "";

  if (original.includes("invalid login credentials") || codigo === "invalid_credentials") {
    return "El correo o la contraseña no son correctos.";
  }
  if (original.includes("email not confirmed") || codigo === "email_not_confirmed") {
    return "Todavía no confirmaste tu correo. Revisá tu casilla, incluida la carpeta de spam.";
  }
  if (original.includes("user already registered") || codigo === "user_already_exists") {
    return "Ya existe una cuenta con ese correo. Probá iniciar sesión.";
  }
  if (original.includes("password should be at least")) {
    return "La contraseña es demasiado corta: usá al menos 8 caracteres.";
  }
  if (original.includes("weak password") || codigo === "weak_password") {
    return "Esa contraseña es muy fácil de adivinar. Combiná mayúsculas, minúsculas y números.";
  }
  if (original.includes("unable to validate email") || original.includes("invalid email")) {
    return "Ese correo no parece válido.";
  }
  if (original.includes("for security purposes") || original.includes("rate limit") || codigo === "over_request_rate_limit") {
    return "Hiciste muchos intentos seguidos. Esperá unos segundos y volvé a probar.";
  }
  if (original.includes("same password") || original.includes("different from the old password") || codigo === "same_password") {
    return "La contraseña nueva tiene que ser distinta de la anterior.";
  }
  if (original.includes("auth session missing") || codigo === "session_not_found") {
    return "La sesión venció o el enlace ya no es válido. Pedí un enlace nuevo para restablecer la contraseña.";
  }
  if (original.includes("token has expired") || original.includes("invalid token") || codigo === "otp_expired") {
    return "El enlace venció o ya se usó. Pedí uno nuevo.";
  }
  if (original.includes("bloqueada")) {
    return err.message; // ya está en español, es nuestro
  }
  if (original.includes("failed to fetch") || original.includes("networkerror")) {
    return "No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.";
  }

  // Último recurso: no mostramos el texto crudo de Supabase.
  console.error("Error de auth sin traducción:", err);
  return "No pudimos completar la operación. Intentá de nuevo en unos instantes.";
}

/**
 * Inicialización al cargar la aplicación
 */
export async function initAuth() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error("Error obteniendo sesión inicial:", error);
  }

  if (session?.user) {
    currentUser = session.user;
    // Una cuenta bloqueada no puede romper la carga de la página: loadCurrentProfile
    // ya cerró la sesión, así que se avisa y la página sigue como visitante.
    // Antes el error subía hasta el DOMContentLoaded y la home no terminaba de cargar.
    try {
      await loadCurrentProfile(currentUser.id);
    } catch (err) {
      currentUser = null;
      currentProfile = null;
      Toast.error(traducirErrorAuth(err));
    }
  }

  // Listener nativo de Supabase
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      currentUser = session?.user || null;
      if (currentUser) {
        // Sin aviso acá: lo muestra initAuth o el formulario de login, y así no se duplica.
        try {
          await loadCurrentProfile(currentUser.id);
        } catch {
          currentUser = null;
          currentProfile = null;
        }
      }
    } else if (event === "SIGNED_OUT") {
      currentUser = null;
      currentProfile = null;
      notifyListeners();
    }
  });

  return { user: currentUser, profile: currentProfile };
}

/**
 * Registro con Email y Contraseña
 */
export async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password: password,
    options: {
      // Se mandan las dos claves porque el trigger de la base puede leer
      // cualquiera de las dos según cómo esté escrito.
      data: {
        nombre: fullName.trim(),
        full_name: fullName.trim()
      }
    }
  });

  if (error) throw error;
  if (data?.user) {
    currentUser = data.user;
    await loadCurrentProfile(data.user.id);
  }
  return data;
}

/**
 * Inicio de sesión con Email y Contraseña
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: password
  });

  if (error) throw error;

  if (data?.user) {
    currentUser = data.user;
    await loadCurrentProfile(data.user.id);

    // Nota: antes acá se escribía `profiles.last_sign_in_at`, columna que no
    // existe en el esquema real. El UPDATE fallaba con 400 en cada login (sin
    // romper nada, pero ensuciando la consola y agregando un viaje de red).
    // Supabase ya guarda el último acceso en `auth.users.last_sign_in_at`.
  }

  return data;
}

/**
 * Inicio de sesión con Google OAuth
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + "/index.html"
    }
  });

  if (error) throw error;
  return data;
}

/**
 * Recuperación de contraseña vía Email
 */
export async function resetPassword(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    // Apunta a la pantalla donde se DEFINE la contraseña nueva.
    // Antes apuntaba a "#reset-password", que mostraba otra vez el formulario
    // para pedir el enlace: el circuito nunca se podía terminar.
    // Va como parámetro de consulta (no como #fragmento): Supabase le agrega los
    // tokens en el hash, y con un fragmento previo la URL quedaba mal formada y
    // no se creaba la sesión de recuperación.
    redirectTo: window.location.origin + "/login.html?type=recovery"
  });
  if (error) throw error;
  return data;
}

/**
 * Actualizar contraseña de usuario autenticado
 */
export async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });
  if (error) throw error;
  return data;
}

/**
 * Cerrar sesión
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  currentUser = null;
  currentProfile = null;
  notifyListeners();
  if (error) console.error("Error al cerrar sesión:", error);
}

/**
 * Obtener usuario actual
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Obtener perfil actual
 */
export function getCurrentProfile() {
  return currentProfile;
}

/**
 * Obtener rol actual ('visitante', 'registrado', 'operador', 'admin')
 */
export function getUserRole() {
  if (!currentUser || !currentProfile) return CONFIG.ROLES.VISITANTE;
  return leerRol(currentProfile);
}

/**
 * Helper para verificar si tiene permisos de operador o admin
 */
export function isStaff() {
  const role = getUserRole();
  return role === CONFIG.ROLES.OPERADOR || role === CONFIG.ROLES.ADMIN;
}

/**
 * Helper para verificar si es administrador
 */
export function isAdmin() {
  return getUserRole() === CONFIG.ROLES.ADMIN;
}

/**
 * Guard de rutas: Redirige si el usuario no cumple el rol mínimo
 */
export async function requireRole(allowedRoles = [], redirectUrl = "/login.html") {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    window.location.href = `${redirectUrl}?next=${encodeURIComponent(window.location.pathname)}`;
    return false;
  }

  currentUser = session.user;
  const profile = await loadCurrentProfile(currentUser.id);
  const userRole = leerRol(profile);

  if (!allowedRoles.includes(userRole)) {
    // Sin `alert()`: se avisa en la home con un toast.
    // Esto es solo la capa visual; el acceso real a los datos lo corta RLS.
    window.location.href = "/index.html?acceso=denegado";
    return false;
  }

  return true;
}

/**
 * Valida el parámetro `next` antes de redirigir.
 *
 * Sin esta validación, `?next=https://sitio-malicioso/` haría que el login
 * mandara al usuario fuera del sitio después de autenticarse (open redirect).
 * Solo se aceptan rutas internas que arranquen con una sola barra.
 */
export function rutaInternaSegura(next) {
  if (!next || typeof next !== "string") return null;
  // Rechaza "//host", "https://host", "javascript:" y cualquier esquema.
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  if (/[\r\n\t]/.test(next)) return null;

  try {
    const url = new URL(next, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}
