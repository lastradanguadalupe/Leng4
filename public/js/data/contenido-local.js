// ==============================================================================
// public/js/data/contenido-local.js
// Contenido de respaldo (último recurso).
//
// IMPORTANTE: esto NO reemplaza arreglar la base. Es la red para que el
// visitante nunca vea una sección vacía o un cartel rojo si Supabase está
// caído o pausado. Cuando se usa, el error real igual queda registrado en la
// consola y la sección muestra un aviso discreto de "contenido de referencia".
//
// Los nombres de campo replican el esquema REAL en español:
// servicios  -> titulo, descripcion, icono, activo, orden
// proyectos  -> titulo, slug, resumen, imagen_portada, anio, destacado, orden
// ==============================================================================

export const SERVICIOS_RESPALDO = [
  {
    id: "local-1",
    titulo: "Desarrollo web a medida",
    descripcion:
      "Sitios y aplicaciones construidos desde cero, con el código y la base de datos pensados para el problema concreto.",
    icono: "codigo",
    orden: 1,
    activo: true
  },
  {
    id: "local-2",
    titulo: "Landing pages de conversión",
    descripcion:
      "Una sola pantalla, un solo objetivo: que la visita se convierta en consulta. Carga rápida y medición incluida.",
    icono: "cohete",
    orden: 2,
    activo: true
  },
  {
    id: "local-3",
    titulo: "APIs y bases de datos",
    descripcion:
      "Modelado relacional, APIs REST documentadas y políticas de seguridad a nivel de fila en PostgreSQL.",
    icono: "base-datos",
    orden: 3,
    activo: true
  },
  {
    id: "local-4",
    titulo: "Asesoría técnica",
    descripcion:
      "Revisión de código, auditoría de rendimiento y acompañamiento para equipos que ya tienen un proyecto en marcha.",
    icono: "brujula",
    orden: 4,
    activo: true
  }
];

export const PROYECTOS_RESPALDO = [
  {
    id: "local-1",
    titulo: "Gestor de turnos para consultorio",
    slug: "gestor-de-turnos",
    resumen:
      "Agenda online con recordatorios automáticos por email y panel para la secretaria.",
    imagen_portada: null,
    anio: 2026,
    destacado: true,
    orden: 1,
    tecnologias: ["Bootstrap 5", "Supabase", "PostgreSQL", "JavaScript"]
  },
  {
    id: "local-2",
    titulo: "Catálogo mayorista con lista de precios",
    slug: "catalogo-mayorista",
    resumen:
      "Catálogo con precios por tipo de cliente y pedido que se envía por WhatsApp.",
    imagen_portada: null,
    anio: 2025,
    destacado: false,
    orden: 2,
    tecnologias: ["PostgreSQL", "CSS3", "JavaScript"]
  },
  {
    id: "local-3",
    titulo: "API de inventario multi-sucursal",
    slug: "api-inventario",
    resumen:
      "API REST con stock por sucursal, movimientos auditados y acceso por roles.",
    imagen_portada: null,
    anio: 2025,
    destacado: true,
    orden: 3,
    tecnologias: ["Node.js", "REST", "PostgreSQL"]
  }
];
