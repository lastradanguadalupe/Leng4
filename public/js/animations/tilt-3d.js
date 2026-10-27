// ==============================================================================
// public/js/animations/tilt-3d.js
// Efecto de Tilt 3D Perspectiva con Reflejo de Luz Especular (Spotlight)
// ==============================================================================

export function init3DTilt() {
  if (window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const cards = document.querySelectorAll(".card-tilt-3d");

  cards.forEach((card) => {
    // Añadir overlay de brillo spotlight
    let glare = card.querySelector(".tilt-glare");
    if (!glare) {
      glare = document.createElement("div");
      glare.className = "tilt-glare";
      glare.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: inherit;
        background: radial-gradient(circle 180px at 50% 50%, rgba(255, 255, 255, 0.12), transparent);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
        z-index: 2;
      `;
      card.style.position = "relative";
      card.appendChild(glare);
    }

    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -10;
      const rotateY = ((x - centerX) / centerX) * 10;

      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;
      card.style.transition = "transform 0.1s ease-out";

      // Mover spotlight specular
      glare.style.opacity = "1";
      glare.style.background = `radial-gradient(circle 220px at ${x}px ${y}px, rgba(96, 73, 234, 0.22), transparent 70%)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
      card.style.transition = "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)";
      glare.style.opacity = "0";
    });
  });
}
