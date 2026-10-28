// ==============================================================================
// public/js/data/iconos.js
// Catálogo de iconos SVG inline.
//
// La tabla `servicios` guarda en la columna `icono` un slug ("codigo",
// "cohete", "base-datos", "brujula"), NO el SVG completo. El código viejo
// esperaba una columna `icon_svg` con el markup y la inyectaba sin sanitizar;
// acá resolvemos el slug contra un catálogo cerrado, que además evita inyectar
// HTML que venga de la base.
// ==============================================================================

const ICONOS = {
  codigo: `<path d="M8 6 2 12l6 6M16 6l6 6-6 6"/>`,
  cohete: `<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>`,
  "base-datos": `<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>`,
  brujula: `<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>`,
  carrito: `<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>`,
  lapiz: `<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>`,
  engranaje: `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6 1.65 1.65 0 0 0 10 3.09V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>`,
  capas: `<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>`,
  servidor: `<rect x="2" y="3" width="20" height="7" rx="2"/><rect x="2" y="14" width="20" height="7" rx="2"/><path d="M6 6.5h.01M6 17.5h.01"/>`,
  enlace: `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`,
  // Icono por defecto cuando el slug no está en el catálogo
  _default: `<circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/>`
};

/**
 * Devuelve un SVG completo para el slug pedido.
 * Si el slug no existe, usa el icono por defecto en lugar de romper la tarjeta.
 */
export function iconoSVG(slug, tamano = 24) {
  const cuerpo = ICONOS[slug] || ICONOS._default;
  return `<svg width="${tamano}" height="${tamano}" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true">${cuerpo}</svg>`;
}

/** ¿Tenemos un icono propio para este slug? */
export function tieneIcono(slug) {
  return Object.prototype.hasOwnProperty.call(ICONOS, slug) && slug !== "_default";
}

/**
 * Slugs disponibles, para armar el desplegable del panel de administración.
 * Deja afuera el icono por defecto, que no es una opción elegible.
 */
export function slugsDeIconos() {
  return Object.keys(ICONOS).filter((slug) => slug !== "_default");
}
