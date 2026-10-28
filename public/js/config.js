// ==============================================================================
// public/js/config.js
// Configuración Central de la Aplicación y Credenciales de Supabase
// ==============================================================================

export const CONFIG = {
  // URLs de conexión a Supabase reales
  SUPABASE_URL: window.__ENV__?.VITE_SUPABASE_URL || "https://rhiayaozcmbqxrqzxvcd.supabase.co",
  SUPABASE_ANON_KEY: window.__ENV__?.VITE_SUPABASE_ANON_KEY || "sb_publishable_CuNcp22GSj-rDPNIQZSboA_vW2px8xI",
  
  // Storage
  STORAGE_BUCKET: "portfolio-assets",
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp", "image/svg+xml"],

  // APIs Externas
  // Antes estaba en "portfolio-developer": es una cuenta real pero con 0 repos
  // públicos, así que la sección "Actividad Reciente en GitHub" quedaba vacía.
  GITHUB_USERNAME: "lastradanguadalupe",
  IP_GEO_API: "https://ipapi.co/json/",
  OPEN_METEO_API: "https://api.open-meteo.com/v1/forecast",

  // Datos de Demo / Portfolio
  DEVELOPER_INFO: {
    brandName: null, // null -> se muestra solo el isotipo ✦. Si se define, aparece en navbar, footer, title y legales.
    role: "Fullstack Architecture & Creative Development",
    tagline: "Desarrollo web fullstack de alto impacto y experiencias digitales inmersivas.",
    location: "Argentina",
    email: "lastradanguadalupe@gmail.com",
    github: "https://github.com/lastradanguadalupe",
    // Sin perfil propio todavía: el footer esconde el ícono de LinkedIn.
    linkedin: null,
    // Decisión del grupo: el ícono lleva a Instagram sin perfil concreto.
    // Es un trabajo académico, no una marca real.
    instagram: "https://instagram.com",
    status: "Disponible para proyectos & consultoría"
  },

  // Roles del Sistema
  ROLES: {
    VISITANTE: "visitante",
    REGISTRADO: "registrado",
    OPERADOR: "operador",
    ADMIN: "admin"
  }
};
