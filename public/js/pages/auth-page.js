// ==============================================================================
// public/js/pages/auth-page.js
// Controlador de Autenticación: Login, Registro, Google OAuth y Recuperación
// ==============================================================================

import {
  signIn,
  signUp,
  signInWithGoogle,
  resetPassword,
  updatePassword,
  initAuth,
  getCurrentUser,
  getUserRole,
  traducirErrorAuth,
  rutaInternaSegura
} from "../core/auth.js";
import { supabase } from "../core/supabase.js";
import { Toast } from "../components/toast.js";
import { isValidEmail, validateLength } from "../core/security.js";
import { CustomCursor } from "../components/cursor.js";
import {
  PasswordToggle,
  evaluarFortaleza,
  montarMedidorFortaleza,
  montarCoincidencia
} from "../components/password-toggle.js";
import { applyBrand } from "../core/brand.js";
import { CONFIG } from "../config.js";
import "../core/diagnostico.js";

/** Evita el doble envío mientras una operación está en curso. */
let enviando = false;

document.addEventListener("DOMContentLoaded", async () => {
  applyBrand();
  CustomCursor.init();

  // El ojo y los medidores se montan antes que nada: son puramente visuales
  // y tienen que estar incluso si la sesión falla.
  PasswordToggle.init();
  montarMedidorFortaleza(
    document.getElementById("reg-pass"),
    document.getElementById("reg-pass-fortaleza")
  );
  montarCoincidencia(
    document.getElementById("reg-pass"),
    document.getElementById("reg-pass-confirm"),
    document.getElementById("reg-coincidencia")
  );
  montarMedidorFortaleza(
    document.getElementById("nueva-pass"),
    document.getElementById("nueva-pass-fortaleza")
  );
  montarCoincidencia(
    document.getElementById("nueva-pass"),
    document.getElementById("nueva-pass-confirm"),
    document.getElementById("nueva-coincidencia")
  );

  initTabSwitching();
  initLoginForm();
  initRegisterForm();
  initResetPasswordForm();
  initNuevaPasswordForm();
  initGoogleAuth();

  // IMPORTANTE: la recuperación se detecta ANTES de redirigir por rol.
  // Al abrir el enlace del correo, Supabase crea una sesión; si redirigimos
  // por estar "logueado", la persona nunca llega a definir su contraseña.
  if (esFlujoDeRecuperacion()) {
    mostrarSeccion("nueva-pass");
    limpiarHashDeTokens();
    await initAuth();
    return;
  }

  await initAuth();

  // Si ya está autenticado, redirigir según su rol
  if (getCurrentUser()) {
    redirectUserByRole();
  }
});

/**
 * ¿Venimos del enlace de recuperación de contraseña?
 * Supabase puede devolver el estado en el hash (`type=recovery`) o como
 * parámetro de consulta según la configuración del proyecto.
 */
function esFlujoDeRecuperacion() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);

  return (
    hash.get("type") === "recovery" ||
    query.get("type") === "recovery" ||
    window.location.hash === "#reset-password" ||
    window.location.hash === "#nueva-password"
  );
}

/** Saca los tokens del hash para que no queden en la barra ni en el historial. */
function limpiarHashDeTokens() {
  const query = new URLSearchParams(window.location.search);
  if (/access_token|refresh_token/.test(window.location.hash) || query.get("type") === "recovery") {
    history.replaceState(null, "", window.location.pathname + "#nueva-password");
  }
}

// Supabase también emite un evento propio cuando el enlace es de recuperación.
supabase.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") {
    mostrarSeccion("nueva-pass");
  }
});

function redirectUserByRole() {
  const role = getUserRole();

  // `next` se valida: sin esto, ?next=https://otro-sitio sacaría al usuario
  // del portfolio justo después de autenticarse (open redirect).
  const next = rutaInternaSegura(new URLSearchParams(window.location.search).get("next"));
  if (next) {
    window.location.href = next;
    return;
  }

  if (role === CONFIG.ROLES.ADMIN) {
    window.location.href = "/panel/admin.html";
  } else if (role === CONFIG.ROLES.OPERADOR) {
    window.location.href = "/panel/operador.html";
  } else {
    // Un registrado entra directo a la sección de proyectos y demos,
    // que es el contenido que su cuenta le habilita.
    window.location.href = "/index.html#proyectos";
  }
}

/* -------------------------------------------------------------------------
 * Alternancia de secciones
 * ---------------------------------------------------------------------- */

const SECCIONES = {
  login: "form-login-box",
  register: "form-register-box",
  reset: "form-reset-box",
  "nueva-pass": "form-nueva-pass-box"
};

function mostrarSeccion(seccion) {
  Object.entries(SECCIONES).forEach(([clave, id]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = clave === seccion ? "block" : "none";
  });

  const btnLogin = document.getElementById("tab-login");
  const btnRegister = document.getElementById("tab-register");
  if (btnLogin) btnLogin.classList.toggle("active", seccion === "login");
  if (btnRegister) btnRegister.classList.toggle("active", seccion === "register");

  // En el circuito de nueva contraseña no tiene sentido ofrecer Google
  // ni las pestañas: la persona está en el medio de un flujo puntual.
  const bloqueGoogle = document.querySelector(".btn-google-auth")?.closest(".mb-4");
  const pestanas = btnLogin?.closest(".d-flex");
  const separador = document.querySelector(".position-relative.text-center.my-3");
  const ocultar = seccion === "nueva-pass";
  [bloqueGoogle, pestanas, separador].forEach((el) => {
    if (el) el.style.display = ocultar ? "none" : "";
  });
}

function initTabSwitching() {
  document.getElementById("tab-login")?.addEventListener("click", () => mostrarSeccion("login"));
  document.getElementById("tab-register")?.addEventListener("click", () => mostrarSeccion("register"));
  document.getElementById("link-forgot-password")?.addEventListener("click", (e) => {
    e.preventDefault();
    mostrarSeccion("reset");
  });
  document.getElementById("link-back-to-login")?.addEventListener("click", (e) => {
    e.preventDefault();
    mostrarSeccion("login");
  });

  if (window.location.hash === "#registro") mostrarSeccion("register");
}

/* -------------------------------------------------------------------------
 * Helpers de envío
 * ---------------------------------------------------------------------- */

/**
 * Envuelve el envío de un formulario: bloquea el botón, evita el doble envío
 * y restaura el estado al terminar.
 */
async function conEnvio(submitBtn, textoCargando, tarea) {
  if (enviando) return;
  enviando = true;

  const textoOriginal = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = textoCargando;

  try {
    await tarea();
  } finally {
    enviando = false;
    submitBtn.disabled = false;
    submitBtn.innerHTML = textoOriginal;
  }
}

/* -------------------------------------------------------------------------
 * Formularios
 * ---------------------------------------------------------------------- */

function initLoginForm() {
  const form = document.getElementById("form-login");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = form.email.value;
    const password = form.password.value;
    const submitBtn = form.querySelector("button[type='submit']");

    if (!isValidEmail(email)) {
      Toast.error("Revisá el correo: no parece una dirección válida.");
      form.email.focus();
      return;
    }
    if (!password) {
      Toast.error("Ingresá tu contraseña.");
      form.password.focus();
      return;
    }

    await conEnvio(submitBtn, "Iniciando sesión...", async () => {
      try {
        await signIn(email, password);
        Toast.success("¡Bienvenido! Sesión iniciada correctamente.");
        setTimeout(() => redirectUserByRole(), 600);
      } catch (err) {
        Toast.error(traducirErrorAuth(err));
      }
    });
  });
}

function initRegisterForm() {
  const form = document.getElementById("form-register");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fullName = form.full_name.value;
    const email = form.email.value;
    const password = form.password.value;
    const confirmPass = form.password_confirm.value;
    const submitBtn = form.querySelector("button[type='submit']");

    if (!validateLength(fullName, 2, 80)) {
      Toast.error("Ingresá tu nombre completo.");
      form.full_name.focus();
      return;
    }
    if (!isValidEmail(email)) {
      Toast.error("Revisá el correo: no parece una dirección válida.");
      form.email.focus();
      return;
    }

    const fortaleza = evaluarFortaleza(password);
    if (!fortaleza.valida) {
      Toast.error("La contraseña necesita 8 caracteres, una mayúscula, una minúscula y un número.");
      form.password.focus();
      return;
    }
    if (password !== confirmPass) {
      Toast.error("Las dos contraseñas no coinciden.");
      form.password_confirm.focus();
      return;
    }

    await conEnvio(submitBtn, "Creando cuenta...", async () => {
      try {
        const data = await signUp(email, password, fullName);

        // Si el proyecto tiene confirmación de email activada, Supabase
        // devuelve el usuario SIN sesión: no hay que redirigir, hay que
        // avisar que revise el correo.
        const necesitaConfirmar = !!data?.user && !data?.session;

        if (necesitaConfirmar) {
          Toast.success("Cuenta creada. Te mandamos un correo para confirmar tu dirección.");
          form.reset();
          mostrarSeccion("login");
          return;
        }

        Toast.success("¡Cuenta creada! Ya estás dentro.");
        setTimeout(() => redirectUserByRole(), 800);
      } catch (err) {
        Toast.error(traducirErrorAuth(err));
      }
    });
  });
}

function initResetPasswordForm() {
  const form = document.getElementById("form-reset");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = form.email.value;
    const submitBtn = form.querySelector("button[type='submit']");

    if (!isValidEmail(email)) {
      Toast.error("Revisá el correo: no parece una dirección válida.");
      form.email.focus();
      return;
    }

    await conEnvio(submitBtn, "Enviando enlace...", async () => {
      try {
        await resetPassword(email);
        // Mismo mensaje exista o no la cuenta: no revelamos qué correos
        // están registrados.
        Toast.success("Si ese correo tiene cuenta, te enviamos el enlace para restablecerla.");
        form.reset();
      } catch (err) {
        Toast.error(traducirErrorAuth(err));
      }
    });
  });
}

function initNuevaPasswordForm() {
  const form = document.getElementById("form-nueva-pass");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = form.password.value;
    const confirmPass = form.password_confirm.value;
    const submitBtn = form.querySelector("button[type='submit']");

    const fortaleza = evaluarFortaleza(password);
    if (!fortaleza.valida) {
      Toast.error("La contraseña necesita 8 caracteres, una mayúscula, una minúscula y un número.");
      form.password.focus();
      return;
    }
    if (password !== confirmPass) {
      Toast.error("Las dos contraseñas no coinciden.");
      form.password_confirm.focus();
      return;
    }

    await conEnvio(submitBtn, "Guardando...", async () => {
      try {
        await updatePassword(password);
        Toast.success("Listo: tu contraseña quedó actualizada.");
        form.reset();
        setTimeout(() => redirectUserByRole(), 900);
      } catch (err) {
        Toast.error(traducirErrorAuth(err));
      }
    });
  });
}

function initGoogleAuth() {
  document.querySelectorAll(".btn-google-auth").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (enviando) return;
      enviando = true;
      btn.disabled = true;

      try {
        await signInWithGoogle();
        // En el camino feliz el navegador se va a Google: no volvemos acá.
      } catch (err) {
        Toast.error(traducirErrorAuth(err));
        btn.disabled = false;
        enviando = false;
      }
    });
  });
}
