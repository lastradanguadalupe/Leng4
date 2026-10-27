// ==============================================================================
// public/js/pages/auth-page.js
// Controlador de Autenticación: Login, Registro, Google OAuth y Recuperación
// ==============================================================================

import { signIn, signUp, signInWithGoogle, resetPassword, initAuth, getCurrentUser, getUserRole } from "../core/auth.js";
import { Toast } from "../components/toast.js";
import { isValidEmail, validateLength } from "../core/security.js";
import { CustomCursor } from "../components/cursor.js";
import { CONFIG } from "../config.js";

document.addEventListener("DOMContentLoaded", async () => {
  CustomCursor.init();
  await initAuth();

  // Si ya está autenticado, redirigir según su rol
  const user = getCurrentUser();
  if (user) {
    redirectUserByRole();
    return;
  }

  initTabSwitching();
  initLoginForm();
  initRegisterForm();
  initResetPasswordForm();
  initGoogleAuth();
});

function redirectUserByRole() {
  const role = getUserRole();
  const urlParams = new URLSearchParams(window.location.search);
  const next = urlParams.get("next");

  if (next) {
    window.location.href = next;
    return;
  }

  if (role === CONFIG.ROLES.ADMIN) {
    window.location.href = "/panel/admin.html";
  } else if (role === CONFIG.ROLES.OPERADOR) {
    window.location.href = "/panel/operador.html";
  } else {
    window.location.href = "/index.html";
  }
}

/**
 * Alternancia entre formularios de Login, Registro y Recuperación
 */
function initTabSwitching() {
  const btnShowLogin = document.getElementById("tab-login");
  const btnShowRegister = document.getElementById("tab-register");
  const linkForgot = document.getElementById("link-forgot-password");
  const linkBackToLogin = document.getElementById("link-back-to-login");

  const formLogin = document.getElementById("form-login-box");
  const formRegister = document.getElementById("form-register-box");
  const formReset = document.getElementById("form-reset-box");

  function showSection(section) {
    if (formLogin) formLogin.style.display = section === "login" ? "block" : "none";
    if (formRegister) formRegister.style.display = section === "register" ? "block" : "none";
    if (formReset) formReset.style.display = section === "reset" ? "block" : "none";

    if (btnShowLogin) btnShowLogin.classList.toggle("active", section === "login");
    if (btnShowRegister) btnShowRegister.classList.toggle("active", section === "register");
  }

  if (btnShowLogin) btnShowLogin.addEventListener("click", () => showSection("login"));
  if (btnShowRegister) btnShowRegister.addEventListener("click", () => showSection("register"));
  if (linkForgot) linkForgot.addEventListener("click", (e) => { e.preventDefault(); showSection("reset"); });
  if (linkBackToLogin) linkBackToLogin.addEventListener("click", (e) => { e.preventDefault(); showSection("login"); });

  // Si viene con hash #registro en la URL
  if (window.location.hash === "#registro") {
    showSection("register");
  } else if (window.location.hash === "#reset-password") {
    showSection("reset");
  }
}

/**
 * Formulario de Inicio de Sesión
 */
function initLoginForm() {
  const form = document.getElementById("form-login");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = form.email.value;
    const password = form.password.value;
    const submitBtn = form.querySelector("button[type='submit']");

    if (!isValidEmail(email)) {
      Toast.error("Por favor ingresa un correo electrónico válido.");
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = "Iniciando sesión...";

      await signIn(email, password);
      Toast.success("¡Bienvenido! Sesión iniciada correctamente.");
      setTimeout(() => redirectUserByRole(), 600);
    } catch (err) {
      console.error("Error en login:", err);
      Toast.error(err.message || "Credenciales incorrectas.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = "Ingresar";
    }
  });
}

/**
 * Formulario de Registro
 */
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
      Toast.error("Por favor ingresa tu nombre completo.");
      return;
    }

    if (!isValidEmail(email)) {
      Toast.error("Por favor ingresa un correo válido.");
      return;
    }

    if (password.length < 6) {
      Toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPass) {
      Toast.error("Las contraseñas no coinciden.");
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = "Creando cuenta...";

      await signUp(email, password, fullName);
      Toast.success("¡Cuenta creada exitosamente! Accediendo...");
      setTimeout(() => redirectUserByRole(), 800);
    } catch (err) {
      console.error("Error en registro:", err);
      Toast.error(err.message || "No se pudo completar el registro.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = "Crear Cuenta";
    }
  });
}

/**
 * Formulario de Recuperación de Contraseña
 */
function initResetPasswordForm() {
  const form = document.getElementById("form-reset");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = form.email.value;
    const submitBtn = form.querySelector("button[type='submit']");

    if (!isValidEmail(email)) {
      Toast.error("Por favor ingresa un correo válido.");
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = "Enviando enlace...";

      await resetPassword(email);
      Toast.success("Enlace de restablecimiento enviado a tu correo.");
      form.reset();
    } catch (err) {
      console.error("Error en reset password:", err);
      Toast.error(err.message || "Error al enviar correo de recuperación.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = "Enviar enlace de recuperación";
    }
  });
}

/**
 * Autenticación mediante Google OAuth
 */
function initGoogleAuth() {
  const googleBtns = document.querySelectorAll(".btn-google-auth");
  googleBtns.forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        btn.disabled = true;
        await signInWithGoogle();
      } catch (err) {
        console.error("Error con Google Auth:", err);
        Toast.error("Error al conectar con Google: " + err.message);
        btn.disabled = false;
      }
    });
  });
}
