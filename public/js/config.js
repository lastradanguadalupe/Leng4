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
  GITHUB_USERNAME: "portfolio-developer",
  IP_GEO_API: "https://ipapi.co/json/",
  OPEN_METEO_API: "https://api.open-meteo.com/v1/forecast",

  // Datos de Demo / Portfolio
  DEVELOPER_INFO: {
    brandName: null, // null -> se muestra solo el isotipo ✦. Si se define, aparece en navbar, footer, title y legales.
    role: "Fullstack Architecture & Creative Development",
    tagline: "Desarrollo web fullstack de alto impacto y experiencias digitales inmersivas.",
    location: "Argentina",
    email: "contacto@portfolio.dev",
    github: "https://github.com",
    linkedin: "https://linkedin.com",
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
