// ==============================================================================
// public/js/components/toast.js
// Sistema de Notificaciones Toast con Estética Minimal Tech Light
// ==============================================================================

export const Toast = {
  container: null,

  init() {
    if (this.container) return;
    this.container = document.createElement("div");
    this.container.id = "toast-container";
    this.container.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
    `;
    document.body.appendChild(this.container);
  },

  show(message, type = "info", duration = 4000) {
    this.init();

    const toast = document.createElement("div");
    toast.className = `toast-item toast-${type}`;
    
    // Paleta de acento según tipo
    let borderColor = "rgba(234, 88, 12, 0.3)";
    let icon = "✦";
    let accentColor = "#EA580C";

    if (type === "success") {
      borderColor = "rgba(234, 88, 12, 0.55)";
      icon = "✓";
      accentColor = "#EA580C";
    } else if (type === "error") {
      borderColor = "rgba(220, 38, 38, 0.4)";
      icon = "✕";
      accentColor = "#DC2626";
    } else if (type === "warning") {
      borderColor = "rgba(217, 119, 6, 0.4)";
      icon = "⚠";
      accentColor = "#B45309";
    }

    toast.style.cssText = `
      background: rgba(255, 255, 255, 0.98);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid ${borderColor};
      color: #27272A;
      padding: 14px 20px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 10px 30px rgba(39, 39, 42, 0.14);
      transform: translateY(20px);
      opacity: 0;
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
      pointer-events: auto;
      max-width: 380px;
    `;

    toast.innerHTML = `
      <span style="display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: rgba(234, 88, 12, 0.1); color: ${accentColor}; font-weight: bold; font-size: 12px;">${icon}</span>
      <span style="flex: 1; line-height: 1.4;">${message}</span>
    `;

    this.container.appendChild(toast);

    // Animación de entrada
    requestAnimationFrame(() => {
      toast.style.transform = "translateY(0)";
      toast.style.opacity = "1";
    });

    // Cierre programado
    setTimeout(() => {
      toast.style.transform = "translateY(10px)";
      toast.style.opacity = "0";
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, duration);
  },

  success(msg, duration) { this.show(msg, "success", duration); },
  error(msg, duration) { this.show(msg, "error", duration); },
  warning(msg, duration) { this.show(msg, "warning", duration); },
  info(msg, duration) { this.show(msg, "info", duration); }
};
