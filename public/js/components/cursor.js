// ==============================================================================
// public/js/components/cursor.js
// Cursor Personalizado con Halo Morado Pastel y Efecto Magnético en Botones
// ==============================================================================

export const CustomCursor = {
  cursorDot: null,
  cursorHalo: null,

  init() {
    // Desactivar en dispositivos táctiles o si el usuario prefiere menos movimiento
    if (window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    this.createElements();
    this.bindEvents();
  },

  createElements() {
    this.cursorDot = document.createElement("div");
    this.cursorDot.className = "custom-cursor-dot";
    this.cursorDot.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 6px;
      height: 6px;
      background-color: #ffffff;
      border-radius: 50%;
      pointer-events: none;
      z-index: 100000;
      transform: translate(-50%, -50%);
      transition: width 0.15s, height 0.15s, background-color 0.15s;
    `;

    this.cursorHalo = document.createElement("div");
    this.cursorHalo.className = "custom-cursor-halo";
    this.cursorHalo.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 36px;
      height: 36px;
      border: 1px solid rgba(96, 73, 234, 0.45);
      background: radial-gradient(circle, rgba(96, 73, 234, 0.15) 0%, rgba(96, 73, 234, 0) 70%);
      border-radius: 50%;
      pointer-events: none;
      z-index: 99999;
      transform: translate(-50%, -50%);
      transition: width 0.25s cubic-bezier(0.16, 1, 0.3, 1), height 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s, transform 0.12s ease-out;
    `;

    document.body.appendChild(this.cursorDot);
    document.body.appendChild(this.cursorHalo);
  },

  bindEvents() {
    let mouseX = -100;
    let mouseY = -100;
    let haloX = -100;
    let haloY = -100;

    window.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      this.cursorDot.style.left = `${mouseX}px`;
      this.cursorDot.style.top = `${mouseY}px`;
    });

    // Loop suave con requestAnimationFrame para el halo
    const render = () => {
      haloX += (mouseX - haloX) * 0.18;
      haloY += (mouseY - haloY) * 0.18;
      if (this.cursorHalo) {
        this.cursorHalo.style.left = `${haloX}px`;
        this.cursorHalo.style.top = `${haloY}px`;
      }
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);

    // Efecto hover sobre elementos interactivos
    const interactiveSelector = "a, button, input, select, textarea, .card-hover-interactive, [role='button']";

    document.addEventListener("mouseover", (e) => {
      const target = e.target.closest(interactiveSelector);
      if (target) {
        this.cursorHalo.style.width = "54px";
        this.cursorHalo.style.height = "54px";
        this.cursorHalo.style.borderColor = "rgba(96, 73, 234, 0.85)";
        this.cursorHalo.style.backgroundColor = "rgba(96, 73, 234, 0.2)";
        this.cursorDot.style.backgroundColor = "#6049ea";
      }
    });

    document.addEventListener("mouseout", (e) => {
      const target = e.target.closest(interactiveSelector);
      if (target) {
        this.cursorHalo.style.width = "36px";
        this.cursorHalo.style.height = "36px";
        this.cursorHalo.style.borderColor = "rgba(96, 73, 234, 0.45)";
        this.cursorHalo.style.backgroundColor = "rgba(96, 73, 234, 0.15)";
        this.cursorDot.style.backgroundColor = "#ffffff";
      }
    });

    // Botones Magnéticos
    this.initMagneticButtons();
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
