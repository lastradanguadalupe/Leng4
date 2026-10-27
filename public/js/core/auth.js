// ==============================================================================
// public/js/core/auth.js
// Gestión Completa de Autenticación, Roles y Sesión con Supabase
// ==============================================================================

import { supabase } from "./supabase.js";
import { CONFIG } from "../config.js";

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
 * Carga o refresca el perfil del usuario actual desde la tabla 'profiles'
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
      .single();

    if (error) {
      console.warn("No se pudo cargar el perfil detallado:", error.message);
      currentProfile = {
        id: userId,
        email: currentUser?.email || "",
        role: CONFIG.ROLES.REGISTRADO,
        is_blocked: false
      };
    } else {
      currentProfile = data;
    }

    // Verificar si el usuario está bloqueado por el administrador
    if (currentProfile?.is_blocked) {
      await signOut();
      throw new Error("Tu cuenta se encuentra bloqueada por un administrador. Contacta al soporte.");
    }

    notifyListeners();
    return currentProfile;
  } catch (err) {
    console.error("Error al obtener perfil:", err);
    throw err;
  }
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
    await loadCurrentProfile(currentUser.id);
  }

  // Listener nativo de Supabase
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      currentUser = session?.user || null;
      if (currentUser) {
        await loadCurrentProfile(currentUser.id);
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
      data: {
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
    
    // Actualizar última fecha de inicio de sesión
    await supabase
      .from("profiles")
      .update({ last_sign_in_at: new Date().toISOString() })
      .eq("id", data.user.id);
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
    redirectTo: window.location.origin + "/login.html#reset-password"
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
  return currentProfile.role || CONFIG.ROLES.REGISTRADO;
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
  const userRole = profile?.role || CONFIG.ROLES.REGISTRADO;

  if (!allowedRoles.includes(userRole)) {
    alert("Acceso denegado: Tu rol (" + userRole + ") no cuenta con los permisos necesarios para esta sección.");
    window.location.href = "/index.html";
    return false;
  }

  return true;
}
