// ==============================================================================
// public/js/pages/legal.js
// Controlador compartido de las páginas legales (términos, privacidad, cookies).
// ==============================================================================

import { applyBrand } from "../core/brand.js";
import { Navbar } from "../components/navbar.js";
import { CustomCursor } from "../components/cursor.js";
import { CookieConsent } from "../components/cookie-consent.js";
import { Toast } from "../components/toast.js";

document.addEventListener("DOMContentLoaded", () => {
  applyBrand();
  Navbar.init();
  CustomCursor.init();

  // El banner también aparece acá si la persona todavía no decidió.
  CookieConsent.init();

  initBackToTop();
  initGestionConsentimiento();
});

function initBackToTop() {
  const btn = document.getElementById("btn-back-to-top");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: suave ? "smooth" : "auto" });
  });
}

/**
 * Permite revocar o conceder el consentimiento de analítica desde la propia
 * Política de cookies, que es lo que ese texto le promete a la persona.
 */
function initGestionConsentimiento() {
  const estadoEl = document.getElementById("consentimiento-estado");
  const btnAceptar = document.getElementById("consentimiento-aceptar");
  const btnRechazar = document.getElementById("consentimiento-rechazar");
  if (!estadoEl) return;

  const etiquetas = {
    aceptado: "Aceptada: contamos tu visita de forma anónima.",
    rechazado: "Rechazada: no registramos tu visita.",
    null: "Todavía no elegiste. Por defecto no registramos tu visita."
  };

  const pintar = () => {
    const pref = CookieConsent.getPreferencia();
    estadoEl.textContent = etiquetas[pref ?? "null"];
  };

  btnAceptar?.addEventListener("click", () => {
    CookieConsent.guardarPreferencia("aceptado");
    pintar();
    Toast.success("Preferencia guardada: analítica aceptada.");
  });

  btnRechazar?.addEventListener("click", () => {
    CookieConsent.guardarPreferencia("rechazado");
    pintar();
    Toast.success("Preferencia guardada: analítica rechazada.");
  });

  pintar();
}
