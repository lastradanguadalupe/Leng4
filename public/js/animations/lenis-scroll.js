// ==============================================================================
// public/js/animations/lenis-scroll.js
// Scroll Suave Inmersivo con Lenis e Integración con GSAP ScrollTrigger
// ==============================================================================

import { CONFIG } from "../config.js";

export let lenisInstance = null;

export function initSmoothScroll() {
  // Respetar preferencia de reducción de movimiento
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.style.scrollBehavior = "smooth";
    return null;
  }

  // Interruptor: con SMOOTH_SCROLL en false se usa el scroll nativo, sin tocar código
  if (CONFIG.SMOOTH_SCROLL === false) {
    return null;
  }

  // Comprobar si Lenis está disponible globalmente en window o importarlo
  if (window.Lenis) {
    // Lenis y el scroll-behavior: smooth nativo (Bootstrap lo trae) pelean entre sí:
    // con Lenis activo el navegador debe scrollear en modo "auto".
    document.documentElement.style.scrollBehavior = "auto";

    // lerp en lugar de duration: la rueda responde casi al instante y solo
    // suaviza el final, sin la sensación de arrastre de más de un segundo.
    lenisInstance = new window.Lenis({
      lerp: 0.12,
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2
    });

    // Sincronizar Lenis con GSAP ScrollTrigger si está presente
    if (window.ScrollTrigger && window.gsap) {
      lenisInstance.on("scroll", window.ScrollTrigger.update);
      window.gsap.ticker.add((time) => {
        lenisInstance.raf(time * 1000);
      });
      window.gsap.ticker.lagSmoothing(0);
    } else {
      function raf(time) {
        lenisInstance.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }

    // Permitir anclas con scroll suave
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        const href = this.getAttribute("href");
        if (href !== "#" && href.length > 1) {
          const target = document.querySelector(href);
          if (target) {
            e.preventDefault();
            lenisInstance.scrollTo(target, { offset: -70 });
          }
        }
      });
    });

    return lenisInstance;
  } else {
    // Fallback nativo
    document.documentElement.style.scrollBehavior = "smooth";
    return null;
  }
}
