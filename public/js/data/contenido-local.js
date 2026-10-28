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
    entregables: ["Diseño responsive propio", "Base de datos modelada", "Despliegue y dominio configurados"],
    orden: 1,
    activo: true
  },
  {
    id: "local-2",
    titulo: "Aplicaciones web y SaaS",
    descripcion:
      "Productos con cuentas, roles y paneles de gestión, listos para crecer de un prototipo a un servicio en uso.",
    icono: "capas",
    entregables: ["Autenticación y roles", "Panel de administración", "Métricas de uso"],
    orden: 2,
    activo: true
  },
  {
    id: "local-3",
    titulo: "APIs y backend",
    descripcion:
      "Servicios REST o GraphQL en Node.js, documentados y probados, para que tu frontend o terceros se conecten.",
    icono: "servidor",
    entregables: ["API REST documentada", "Políticas de seguridad por fila (RLS)", "Migraciones versionadas"],
    orden: 3,
    activo: true
  },
  {
    id: "local-4",
    titulo: "Bases de datos y Supabase",
    descripcion:
      "Modelado relacional en PostgreSQL con políticas de seguridad a nivel de fila y migraciones versionadas.",
    icono: "base-datos",
    entregables: ["Modelo entidad-relación", "Políticas RLS", "Migraciones SQL"],
    orden: 4,
    activo: true
  },
  {
    id: "local-5",
    titulo: "E-commerce y pasarelas de pago",
    descripcion:
      "Tiendas con catálogo, carrito y cobro online, con el flujo de compra cuidado de punta a punta.",
    icono: "carrito",
    entregables: ["Catálogo y carrito", "Integración de pagos", "Gestión de pedidos"],
    orden: 5,
    activo: true
  },
  {
    id: "local-6",
    titulo: "UX/UI, prototipado y animaciones",
    descripcion:
      "Interfaces pensadas desde el uso real: prototipos navegables y animaciones que guían sin distraer.",
    icono: "lapiz",
    entregables: ["Prototipo navegable", "Sistema de diseño", "Animaciones web"],
    orden: 6,
    activo: true
  },
  {
    id: "local-7",
    titulo: "Integraciones y automatización",
    descripcion:
      "Conectamos tus herramientas y automatizamos las tareas repetitivas para que el equipo pierda menos tiempo.",
    icono: "enlace",
    entregables: ["Conexión entre sistemas", "Flujos automatizados", "Avisos y reportes"],
    orden: 7,
    activo: true
  },
  {
    id: "local-8",
    titulo: "Asesoría técnica y optimización",
    descripcion:
      "Revisión de código, auditoría de rendimiento y acompañamiento para equipos que ya tienen un proyecto en marcha.",
    icono: "brujula",
    entregables: ["Revisión de código con informe", "Auditoría de rendimiento y SEO", "Reunión de cierre con plan de acción"],
    orden: 8,
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
