// ==============================================================================
// public/js/components/cookie-consent.js
// Banner de cookies / analítica con preferencia persistente.
//
// Si la persona rechaza, NO se registran visitas: el contador de analytics
// queda desactivado para esa sesión y para las siguientes, hasta que cambie
// la preferencia desde la Política de cookies.
// ==============================================================================

const STORAGE_KEY = "consentimiento_analitica";

export const CookieConsent = {
  /**
   * Devuelve "aceptado", "rechazado" o null si todavía no decidió.
   * Envuelto en try/catch porque en modo privado localStorage puede tirar.
   */
  getPreferencia() {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v === "aceptado" || v === "rechazado" ? v : null;
    } catch {
      return null;
    }
  },

  guardarPreferencia(valor) {
    try {
      localStorage.setItem(STORAGE_KEY, valor);
    } catch {
      // Sin almacenamiento disponible volvemos a preguntar la próxima vez.
    }
  },

  /** ¿Podemos contar la visita? Solo con un "aceptado" explícito. */
  puedeMedir() {
    return this.getPreferencia() === "aceptado";
  },

  /**
   * Monta el banner si corresponde.
   * @param {() => void} alAceptar callback que dispara la medición diferida.
   */
  init(alAceptar) {
    const banner = document.getElementById("cookie-banner");
    if (!banner) return;

    const btnAceptar = document.getElementById("cookie-aceptar");
    const btnRechazar = document.getElementById("cookie-rechazar");

    // Ya decidió antes: el banner no se muestra.
    if (this.getPreferencia() !== null) return;

    banner.hidden = false;
    // Un frame después para que la transición de entrada se vea.
    requestAnimationFrame(() => banner.classList.add("visible"));

    const cerrar = () => {
      banner.classList.remove("visible");
      setTimeout(() => {
        banner.hidden = true;
      }, 450);
    };

    btnAceptar?.addEventListener("click", () => {
      this.guardarPreferencia("aceptado");
      cerrar();
      if (typeof alAceptar === "function") alAceptar();
    });

    btnRechazar?.addEventListener("click", () => {
      this.guardarPreferencia("rechazado");
      cerrar();
    });
  }
};
