// ==============================================================================
// public/js/components/modal.js
// Modal Accesible y Reactivo para Demos, Detalle de Proyectos y Formularios
// ==============================================================================

import { escapeHTML } from "../core/security.js";

export const Modal = {
  overlay: null,

  init() {
    if (this.overlay) return;
    this.overlay = document.createElement("div");
    this.overlay.id = "custom-modal-overlay";
    this.overlay.className = "custom-modal-overlay";
    this.overlay.innerHTML = `
      <div class="custom-modal-container">
        <button class="custom-modal-close" aria-label="Cerrar modal">&times;</button>
        <div class="custom-modal-body" id="custom-modal-content"></div>
      </div>
    `;
    document.body.appendChild(this.overlay);

    // Eventos de cierre
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay || e.target.classList.contains("custom-modal-close")) {
        this.close();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.overlay.classList.contains("active")) {
        this.close();
      }
    });
  },

  open(htmlContent) {
    this.init();
    const contentEl = document.getElementById("custom-modal-content");
    contentEl.innerHTML = htmlContent;
    this.overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  },

  close() {
    if (!this.overlay) return;
    this.overlay.classList.remove("active");
    document.body.style.overflow = "";
    const contentEl = document.getElementById("custom-modal-content");
    if (contentEl) contentEl.innerHTML = "";
  },

  /**
   * Muestra el modal con CTA animado para usuarios no registrados
   */
  showAuthRequired(title = "Contenido Exclusivo para Usuarios Registrados") {
    const html = `
      <div class="text-center py-4 px-2">
        <div class="lock-icon-glow mb-4">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6049ea" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h3 class="fw-bold mb-3">${escapeHTML(title)}</h3>
        <p class="text-white-50 mb-4" style="max-width: 440px; margin: 0 auto;">
          Para explorar la arquitectura en detalle, visualizar el código fuente interactivo y probar las demos ejecutables en vivo, debes contar con una cuenta activa.
        </p>
        <div class="d-flex flex-column flex-sm-row justify-content-center gap-3">
          <a href="/login.html#registro" class="btn btn-accent-custom py-2 px-4">Crear Cuenta Gratis</a>
          <a href="/login.html" class="btn btn-outline-custom py-2 px-4">Ya tengo cuenta</a>
        </div>
        <div class="mt-4 pt-3 border-top border-secondary text-white-50 small">
          Registro instantáneo mediante Google o Correo Electrónico.
        </div>
      </div>
    `;
    this.open(html);
  },

  /**
   * Muestra la Demo interactiva
   */
  showDemo(demo) {
    let interactiveBody = "";
    if (demo.interactive_type === "canvas") {
      interactiveBody = `
        <div class="demo-canvas-wrapper" style="min-height: 380px; background: #000000; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; position: relative;">
          <canvas id="interactive-demo-canvas" width="600" height="360" style="width: 100%; height: auto; max-height: 400px;"></canvas>
          <div class="canvas-hint" style="position: absolute; bottom: 12px; left: 16px; font-size: 12px; color: rgba(255,255,255,0.5);">
            Arrastra el cursor sobre el lienzo para interactuar
          </div>
        </div>
      `;
    } else {
      interactiveBody = `
        <div class="demo-simulation-box p-4" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <span class="badge badge-accent">Demo Reactiva</span>
            <span class="text-white-50 small">Ambiente Sandbox</span>
          </div>
          <p class="text-white-50">${escapeHTML(demo.description)}</p>
          <div class="p-3 bg-dark border border-secondary rounded mb-3 font-monospace small text-white-50">
            <code>// Conexión activa con PostgreSQL & Supabase Engine</code><br>
            <code>status: 200 OK | latency: 34ms | telemetry: enabled</code>
          </div>
          <a href="${demo.embed_url || '#'}" target="_blank" rel="noopener noreferrer" class="btn btn-accent-custom w-100">
            Abrir Demo en Nueva Pestaña ↗
          </a>
        </div>
      `;
    }

    const html = `
      <div class="demo-modal-wrapper py-2">
        <h3 class="fw-bold mb-2 text-white">${escapeHTML(demo.title)}</h3>
        <p class="text-white-50 mb-4">${escapeHTML(demo.description)}</p>
        ${interactiveBody}
      </div>
    `;
    this.open(html);

    // Inicializar canvas si es de tipo canvas
    if (demo.interactive_type === "canvas") {
      setTimeout(() => {
        this.initDemoCanvas();
      }, 100);
    }
  },

  initDemoCanvas() {
    const canvas = document.getElementById("interactive-demo-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let width = canvas.width;
    let height = canvas.height;

    const particles = [];
    for (let i = 0; i < 45; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        radius: Math.random() * 2 + 1.5
      });
    }

    let mouse = { x: width / 2, y: height / 2 };
    canvas.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
      mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
    });

    let animId;
    function loop() {
      if (!document.getElementById("interactive-demo-canvas")) {
        cancelAnimationFrame(animId);
        return;
      }
      ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
      ctx.fillRect(0, 0, width, height);

      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Atracción sutil al mouse
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          p.x += dx * 0.02;
          p.y += dy * 0.02;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#6049ea";
        ctx.fill();

        // Líneas entre partículas cercanas
        for (let j = idx + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist2 = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist2 < 80) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(96, 73, 234, ${1 - dist2 / 80})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      animId = requestAnimationFrame(loop);
    }
    loop();
  }
};
