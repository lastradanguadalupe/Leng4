// ==============================================================================
// public/js/animations/gsap-animations.js
// Orquestación de Animaciones Avanzadas con GSAP, ScrollTrigger y SplitText
// ==============================================================================

export const Animations = {
  init() {
    // Verificar si GSAP está disponible
    if (!window.gsap) {
      console.warn("GSAP no cargado en window. Se aplicarán transiciones CSS nativas.");
      this.fallbackPreloader();
      return;
    }

    if (window.ScrollTrigger) {
      window.gsap.registerPlugin(window.ScrollTrigger);
    }

    // Comprobar prefers-reduced-motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.fallbackPreloader();
      return;
    }

    this.initPreloader();
    this.initHeroEntrance();
    this.initScrollReveals();
    this.initStatCounters();
    this.initTimelineDraw();
  },

  /**
   * Preloader interactivo con contador porcentual fluido
   */
  initPreloader() {
    const preloader = document.getElementById("site-preloader");
    const counterEl = document.getElementById("preloader-percent");
    if (!preloader) return;

    // Red de seguridad: el preloader tapa todo el sitio y solo se oculta desde
    // el onComplete de una tween. Si el ticker de GSAP no late —pestaña en
    // segundo plano al cargar, rAF suspendido, un error en otro callback del
    // ticker— el visitante se queda mirando "0%" para siempre. Pase lo que
    // pase, a los 2,5s destapamos el sitio.
    const destapar = () => {
      if (preloader.dataset.oculto === "1") return;
      preloader.dataset.oculto = "1";
      preloader.style.display = "none";
      this.playHeroSequence();
    };
    const failsafe = setTimeout(destapar, 2500);
    this._destaparPreloader = () => {
      clearTimeout(failsafe);
      destapar();
    };

    const countObj = { val: 0 };
    window.gsap.to(countObj, {
      val: 100,
      duration: 1.2,
      ease: "power2.out",
      onUpdate: () => {
        if (counterEl) counterEl.textContent = Math.round(countObj.val) + "%";
      },
      onComplete: () => {
        window.gsap.to(preloader, {
          yPercent: -100,
          duration: 0.8,
          ease: "power4.inOut",
          onComplete: () => this._destaparPreloader()
        });
      }
    });
  },

  fallbackPreloader() {
    const preloader = document.getElementById("site-preloader");
    if (preloader) {
      preloader.style.opacity = "0";
      setTimeout(() => (preloader.style.display = "none"), 300);
    }
  },

  /**
   * Secuencia de entrada del Hero inspirado en Awwwards
   */
  initHeroEntrance() {
    // Si no hay preloader, reproducir inmediatamente
    if (!document.getElementById("site-preloader")) {
      this.playHeroSequence();
    }
  },

  playHeroSequence() {
    if (!window.gsap) return;

    // Los selectores tienen que existir en el DOM o GSAP avisa por consola y
    // el elemento se queda sin animar. `.hero-welcome-badge` y
    // `.hero-title-line` no existían: el eyebrow y el H1 nunca entraban.
    const tl = window.gsap.timeline({ defaults: { ease: "power3.out" } });

    const paso = (selector, desde, hasta, posicion) => {
      if (!document.querySelector(selector)) return;
      tl.fromTo(selector, desde, hasta, posicion);
    };

    paso(".hero-eyebrow", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.6 });
    paso(".hero-name", { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.9 }, "-=0.3");
    paso(".hero-subtitle", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, "-=0.5");
    paso(
      ".hero-cta-group .btn",
      { opacity: 0, scale: 0.9, y: 20 },
      { opacity: 1, scale: 1, y: 0, duration: 0.5, stagger: 0.1 },
      "-=0.3"
    );
    paso(
      ".hero-visual",
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.8 },
      "-=0.2"
    );
    paso(".hero-tech-marquee", { opacity: 0 }, { opacity: 1, duration: 0.8 }, "-=0.4");
  },

  /**
   * Revelado al hacer scroll con ScrollTrigger
   */
  initScrollReveals() {
    if (!window.ScrollTrigger) return;

    // Secciones con encabezados y subtítulos
    const sectionHeaders = document.querySelectorAll(".section-header-reveal");
    sectionHeaders.forEach((header) => {
      window.gsap.fromTo(
        header,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: header,
            start: "top 85%",
            toggleActions: "play none none none"
          }
        }
      );
    });

    // Grilla de tarjetas (Servicios, Proyectos, Habilidades)
    const revealGrids = document.querySelectorAll(".reveal-stagger-grid");
    revealGrids.forEach((grid) => {
      const items = grid.querySelectorAll(".reveal-item");
      if (items.length) {
        window.gsap.fromTo(
          items,
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.12,
            ease: "power2.out",
            scrollTrigger: {
              trigger: grid,
              start: "top 80%",
              toggleActions: "play none none none"
            }
          }
        );
      }
    });
  },

  /**
   * Contadores numéricos que se activan al llegar al viewport
   */
  initStatCounters() {
    // Los contadores con data-dinamico esperan datos de Supabase y se animan
    // desde home.js con animarContador() cuando llegan.
    document
      .querySelectorAll(".stat-counter-value:not([data-dinamico])")
      .forEach((el) => this.animarContador(el));
  },

  /**
   * Anima un contador de 0 a su data-target al entrar al viewport.
   */
  animarContador(el) {
    const targetVal = parseFloat(el.getAttribute("data-target")) || 0;
    const decimals = el.getAttribute("data-decimals") ? parseInt(el.getAttribute("data-decimals")) : 0;
    const suffix = el.getAttribute("data-suffix") || "";
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (window.ScrollTrigger && window.gsap && !reducido) {
      const obj = { count: 0 };
      el.textContent = (0).toFixed(decimals) + suffix;
      window.gsap.to(obj, {
        count: targetVal,
        duration: 1.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 90%",
          toggleActions: "play none none none"
        },
        onUpdate: () => {
          el.textContent = obj.count.toFixed(decimals) + suffix;
        }
      });
    } else {
      el.textContent = targetVal.toFixed(decimals) + suffix;
    }
  },

  /**
   * Franja "Cómo trabajamos": la línea de progreso se dibuja al scrollear y
   * cada paso se enciende cuando la línea lo alcanza.
   */
  initProcesoLinea() {
    const proceso = document.querySelector(".proceso-pasos");
    if (!proceso) return;

    const pasos = proceso.querySelectorAll(".proceso-paso");
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!window.gsap || !window.ScrollTrigger || reducido) {
      proceso.style.setProperty("--progreso", "1");
      pasos.forEach((p) => p.classList.add("activo"));
      return;
    }

    window.ScrollTrigger.create({
      trigger: proceso,
      start: "top 70%",
      end: "bottom 65%",
      scrub: 0.4,
      onUpdate: (self) => {
        proceso.style.setProperty("--progreso", self.progress.toFixed(3));
        pasos.forEach((p, i) => {
          const umbral = pasos.length > 1 ? i / (pasos.length - 1) : 0;
          p.classList.toggle("activo", self.progress >= umbral - 0.02);
        });
      }
    });
  },

  /**
   * Dibuja la línea de tiempo de experiencia a medida que el usuario hace scroll
   */
  initTimelineDraw() {
    const timelineSvg = document.querySelector(".timeline-svg-path");
    if (!timelineSvg || !window.ScrollTrigger || !window.gsap) return;

    const length = timelineSvg.getTotalLength();
    timelineSvg.style.strokeDasharray = length;
    timelineSvg.style.strokeDashoffset = length;

    window.gsap.to(timelineSvg, {
      strokeDashoffset: 0,
      ease: "none",
      scrollTrigger: {
        trigger: ".experience-timeline-container",
        start: "top 75%",
        end: "bottom 85%",
        scrub: 0.5
      }
    });
  }
};
