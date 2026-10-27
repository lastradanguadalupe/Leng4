// ==============================================================================
// public/js/core/security.js
// Validaciones estrictas, Sanitización XSS y Verificación de Firma (Magic Bytes)
// ==============================================================================

import { CONFIG } from "../config.js";

/**
 * Escapa caracteres HTML peligrosos para prevenir ataques XSS
 */
export function escapeHTML(str) {
  if (typeof str !== "string") return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;"
  };
  return str.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Sanitiza contenido eliminando scripts y tags peligrosos
 */
export function sanitizeHTML(dirty) {
  if (typeof dirty !== "string") return "";
  const template = document.createElement("template");
  template.innerHTML = dirty;
  
  // Remover tags ejecutables
  const dangerousTags = ["script", "iframe", "object", "embed", "link", "style", "meta"];
  dangerousTags.forEach((tag) => {
    const elements = template.content.querySelectorAll(tag);
    elements.forEach((el) => el.remove());
  });

  // Remover atributos on* (onclick, onerror, onload, etc.)
  const allElements = template.content.querySelectorAll("*");
  allElements.forEach((el) => {
    const attrs = Array.from(el.attributes);
    attrs.forEach((attr) => {
      if (attr.name.startsWith("on") || attr.value.toLowerCase().includes("javascript:")) {
        el.removeAttribute(attr.name);
      }
    });
  });

  return template.innerHTML;
}

/**
 * Validador estricto de Email
 */
export function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  const regex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return regex.test(email.trim()) && email.length <= 254;
}

/**
 * Validador de longitud segura
 */
export function validateLength(str, min, max) {
  if (typeof str !== "string") return false;
  const len = str.trim().length;
  return len >= min && len <= max;
}

/**
 * Verificación de Firma de Archivo (Magic Bytes)
 * Comprueba los primeros bytes reales del binario para evitar extensiones falsas (.php renombrado a .png)
 */
export async function verifyImageMagicBytes(file) {
  if (!file) return { valid: false, error: "No se proporcionó ningún archivo" };

  // 1. Validar tamaño máximo
  if (file.size > CONFIG.MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `El archivo supera el tamaño máximo permitido de ${CONFIG.MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`
    };
  }

  // 2. Validar tipo MIME declarado
  if (!CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de archivo no permitido (${file.type}). Solo se admiten JPG, PNG, WEBP y SVG.`
    };
  }

  // 3. Inspeccionar Magic Bytes en ArrayBuffer
  try {
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let hex = "";
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, "0").toUpperCase();
    }

    // JPEG: FF D8 FF
    if (file.type === "image/jpeg" || file.type === "image/jpg") {
      if (hex.startsWith("FFD8FF")) {
        return { valid: true, mime: "image/jpeg" };
      }
      return { valid: false, error: "Firma binaria de JPEG corrupta o inválida" };
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (file.type === "image/png") {
      if (hex.startsWith("89504E470D0A1A0A")) {
        return { valid: true, mime: "image/png" };
      }
      return { valid: false, error: "Firma binaria de PNG corrupta o inválida" };
    }

    // WEBP: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
    if (file.type === "image/webp") {
      const isRiff = hex.startsWith("52494646");
      // Posiciones 8 a 11 deben ser WEBP (57 45 42 50)
      const isWebp = hex.substring(16, 24) === "57454250";
      if (isRiff && isWebp) {
        return { valid: true, mime: "image/webp" };
      }
      return { valid: false, error: "Firma binaria de WEBP corrupta o inválida" };
    }

    // SVG: Archivo de texto XML/SVG seguro (revisar que no contenga <script>)
    if (file.type === "image/svg+xml") {
      const text = await file.text();
      const lower = text.toLowerCase();
      if (!lower.includes("<svg") || !lower.includes("</svg>")) {
        return { valid: false, error: "El archivo no contiene un documento SVG válido" };
      }
      if (lower.includes("<script") || lower.includes("javascript:") || lower.includes("onload=")) {
        return { valid: false, error: "El archivo SVG contiene scripts maliciosos bloqueados por seguridad" };
      }
      return { valid: true, mime: "image/svg+xml" };
    }

    return { valid: false, error: "Formato no verificado por firma digital" };
  } catch (err) {
    return { valid: false, error: `Error leyendo firma del archivo: ${err.message}` };
  }
}

/**
 * Limitador de tasa en cliente (Rate Limiter)
 */
export function checkClientRateLimit(actionKey, maxAttempts = 5, windowMs = 60000) {
  const key = `ratelimit_${actionKey}`;
  const now = Date.now();
  const raw = localStorage.getItem(key);
  let record = raw ? JSON.parse(raw) : { attempts: 0, firstAttempt: now };

  if (now - record.firstAttempt > windowMs) {
    record = { attempts: 1, firstAttempt: now };
  } else {
    record.attempts += 1;
  }

  localStorage.setItem(key, JSON.stringify(record));

  if (record.attempts > maxAttempts) {
    const waitSeconds = Math.ceil((windowMs - (now - record.firstAttempt)) / 1000);
    return {
      allowed: false,
      message: `Has superado el límite de intentos. Por favor espera ${waitSeconds} segundos.`
    };
  }

  return { allowed: true };
}
