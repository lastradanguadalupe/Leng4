// ==============================================================================
// public/js/core/brand.js
// Identidad de marca centralizada.
//
// El proyecto todavía no tiene nombre definido por el equipo.
// Mientras BRAND_NAME sea null, el sitio muestra únicamente el isotipo ✦.
// Cuando el grupo decida el nombre, se completa ACÁ y nada más: se propaga
// solo a la navbar, al footer, al <title> de cada página y a los textos legales.
// ==============================================================================

import { CONFIG } from "../config.js";

/** Nombre de la marca. null = mostrar solo el isotipo. */
export const BRAND_NAME = null;

/** Descriptor fijo del proyecto, independiente del nombre. */
export const BRAND_TAGLINE = "Desarrollo web fullstack a medida";

/** Pie académico exigido por la cátedra. */
export const BRAND_LEGAL_LINE =
  "Portfolio Desarrollador Fullstack · Trabajo Práctico Integrador Lenguajes 4";

/** Año para los avisos de copyright. */
export const BRAND_YEAR = 2026;

/**
 * Devuelve el nombre de la marca o una alternativa neutra cuando todavía
 * no está definido. Se usa en textos corridos (legales, meta tags).
 */
export function brandName(fallback = "este portfolio") {
  return BRAND_NAME || fallback;
}

/**
 * Aplica la marca al documento actual. Busca:
 *  - [data-brand-name]  -> inserta el nombre; si es null, oculta el nodo.
 *  - [data-brand-tagline] -> inserta la bajada.
 *  - [data-brand-legal] -> inserta la línea legal con el año.
 *  - <html data-page-title="..."> -> arma el <title> con o sin nombre.
 */
export function applyBrand(doc = document) {
  doc.querySelectorAll("[data-brand-name]").forEach((el) => {
    if (BRAND_NAME) {
      el.textContent = BRAND_NAME;
      el.hidden = false;
    } else {
      // Sin nombre definido no mostramos texto: queda solo el isotipo.
      el.textContent = "";
      el.hidden = true;
    }
  });

  doc.querySelectorAll("[data-brand-tagline]").forEach((el) => {
    el.textContent = BRAND_TAGLINE;
  });

  doc.querySelectorAll("[data-brand-legal]").forEach((el) => {
    const nombre = BRAND_NAME ? `${BRAND_NAME} · ` : "";
    el.textContent = `© ${BRAND_YEAR} · ${nombre}${BRAND_LEGAL_LINE}`;
  });

  const pageTitle = doc.documentElement.getAttribute("data-page-title");
  if (pageTitle) {
    doc.title = BRAND_NAME ? `${BRAND_NAME} | ${pageTitle}` : pageTitle;
  }

  aplicarRedes(doc);
}

/**
 * Completa los enlaces marcados con `data-social` desde CONFIG.DEVELOPER_INFO.
 *
 * Si un perfil no está definido (null), el enlace se oculta en lugar de
 * quedar apuntando a "https://instagram.com" a secas, que es un enlace que no
 * lleva a ninguna parte y queda mal en la entrega.
 */
function aplicarRedes(doc = document) {
  const info = CONFIG.DEVELOPER_INFO || {};
  const destinos = {
    github: info.github,
    linkedin: info.linkedin,
    instagram: info.instagram,
    email: info.email ? `mailto:${info.email}` : null
  };

  doc.querySelectorAll("[data-social]").forEach((el) => {
    const red = el.getAttribute("data-social");
    const destino = destinos[red];

    if (destino) {
      el.setAttribute("href", destino);
      el.hidden = false;
    } else {
      // Sin dato todavía: no mostramos el enlace.
      el.hidden = true;
    }
  });
}
