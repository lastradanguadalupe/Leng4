// ==============================================================================
// public/js/components/cursor.js
// Cursor Personalizado con Halo Morado Pastel y Efecto Magnético en Botones
//
// El punto sigue al puntero exactamente; el halo lo acompaña con un lerp suave
// pero SIEMPRE concéntrico al punto. Ambos se posicionan con transform
// (translate3d) para que el compositor los mueva sin recalcular layout.
//
// Importante: el halo NO lleva transición CSS sobre `transform`. Antes la tenía
// y se sumaba al lerp del requestAnimationFrame, lo que hacía que el halo
// quedara hasta ~330px atrás del punto al mover el mouse rápido.
// ==============================================================================

const DOT_SIZE = 6;
const HALO_SIZE = 36;
const HALO_SIZE_HOVER = 54;

// Factor de suavizado del halo. Más alto = más pegado al puntero.
const HALO_LERP = 0.35;

export const CustomCursor = {
  cursorDot: null,
  cursorHalo: null,
  rafId: null,

  init() {
    // Desactivar en dispositivos táctiles o si el usuario prefiere menos movimiento
    if (
      window.matchMedia("(pointer: coarse)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    this.createElements();
    this.bindEvents();
  },

  createElements() {
    this.cursorDot = document.createElement("div");
    this.cursorDot.className = "custom-cursor-dot";
    this.cursorDot.setAttribute("aria-hidden", "true");
    this.cursorDot.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: ${DOT_SIZE}px;
      height: ${DOT_SIZE}px;
      margin-left: ${-DOT_SIZE / 2}px;
      margin-top: ${-DOT_SIZE / 2}px;
      background-color: #ffffff;
      border-radius: 50%;
      pointer-events: none;
      z-index: 100000;
      opacity: 0;
      will-change: transform;
      transition: width 0.15s, height 0.15s, background-color 0.15s, opacity 0.2s;
    `;

    this.cursorHalo = document.createElement("div");
    this.cursorHalo.className = "custom-cursor-halo";
    this.cursorHalo.setAttribute("aria-hidden", "true");
    this.cursorHalo.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: ${HALO_SIZE}px;
      height: ${HALO_SIZE}px;
      margin-left: ${-HALO_SIZE / 2}px;
      margin-top: ${-HALO_SIZE / 2}px;
      border: 1px solid rgba(96, 73, 234, 0.45);
      background: radial-gradient(circle, rgba(96, 73, 234, 0.15) 0%, rgba(96, 73, 234, 0) 70%);
      border-radius: 50%;
      pointer-events: none;
      z-index: 99999;
      opacity: 0;
      will-change: transform;
      transition: width 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                  height 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                  margin 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                  border-color 0.25s, opacity 0.2s;
    `;

    document.body.appendChild(this.cursorDot);
    document.body.appendChild(this.cursorHalo);
  },

  bindEvents() {
    let mouseX = -100;
    let mouseY = -100;
    let haloX = -100;
    let haloY = -100;
    let visible = false;

    const mover = (el, x, y) => {
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    window.addEventListener(
      "mousemove",
      (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        // El punto va exacto sobre el puntero, sin suavizado.
        mover(this.cursorDot, mouseX, mouseY);

        if (!visible) {
          visible = true;
          // En el primer movimiento el halo aparece ya centrado en el punto,
          // así no entra volando desde la esquina.
          haloX = mouseX;
          haloY = mouseY;
          mover(this.cursorHalo, haloX, haloY);
          this.cursorDot.style.opacity = "1";
          this.cursorHalo.style.opacity = "1";
        }
      },
      { passive: true }
    );

    // Ocultar cuando el puntero sale de la ventana
    document.addEventListener("mouseleave", () => {
      visible = false;
      this.cursorDot.style.opacity = "0";
      this.cursorHalo.style.opacity = "0";
    });

    // Loop suave con requestAnimationFrame para el halo
    const render = () => {
      haloX += (mouseX - haloX) * HALO_LERP;
      haloY += (mouseY - haloY) * HALO_LERP;

      // Si ya está prácticamente encima, lo clavamos para no acumular error.
      if (Math.abs(mouseX - haloX) < 0.1) haloX = mouseX;
      if (Math.abs(mouseY - haloY) < 0.1) haloY = mouseY;

      if (this.cursorHalo) mover(this.cursorHalo, haloX, haloY);
      this.rafId = requestAnimationFrame(render);
    };
    this.rafId = requestAnimationFrame(render);

    // Efecto hover sobre elementos interactivos
    const interactiveSelector =
      "a, button, input, select, textarea, .card-hover-interactive, [role='button']";

    document.addEventListener("mouseover", (e) => {
      const target = e.target.closest(interactiveSelector);
      if (target) this.setHover(true);
    });

    document.addEventListener("mouseout", (e) => {
      const target = e.target.closest(interactiveSelector);
      if (target) this.setHover(false);
    });

    // Botones Magnéticos
    this.initMagneticButtons();
  },

  /**
   * Agranda el halo manteniéndolo concéntrico: al cambiar el tamaño hay que
   * recalcular el margen negativo, porque el centrado depende de él.
   */
  setHover(activo) {
    const size = activo ? HALO_SIZE_HOVER : HALO_SIZE;
    this.cursorHalo.style.width = `${size}px`;
    this.cursorHalo.style.height = `${size}px`;
    this.cursorHalo.style.marginLeft = `${-size / 2}px`;
    this.cursorHalo.style.marginTop = `${-size / 2}px`;
    this.cursorHalo.style.borderColor = activo
      ? "rgba(96, 73, 234, 0.85)"
      : "rgba(96, 73, 234, 0.45)";
    this.cursorDot.style.backgroundColor = activo ? "#6049ea" : "#ffffff";
  },

  initMagneticButtons() {
    const magneticElements = document.querySelectorAll(".btn-magnetic");
    magneticElements.forEach((btn) => {
      btn.addEventListener("mousemove", (e) => {
        const rect = btn.getBoundingClientRect();
        const btnCenterX = rect.left + rect.width / 2;
        const btnCenterY = rect.top + rect.height / 2;
        const deltaX = (e.clientX - btnCenterX) * 0.35;
        const deltaY = (e.clientY - btnCenterY) * 0.35;

        btn.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      });

      btn.addEventListener("mouseleave", () => {
        btn.style.transform = "translate(0px, 0px)";
        btn.style.transition = "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)";
        setTimeout(() => {
          btn.style.transition = "";
        }, 400);
      });
    });
  }
};
