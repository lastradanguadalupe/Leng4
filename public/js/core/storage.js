// ==============================================================================
// public/js/core/storage.js
// Subida y gestión segura de archivos e imágenes a Supabase Storage
// ==============================================================================

import { supabase } from "./supabase.js";
import { CONFIG } from "../config.js";
import { verifyImageMagicBytes } from "./security.js";

/**
 * Sube una imagen a Supabase Storage con validación previa de Magic Bytes y tamaño
 * @param {File} file - El archivo obtenido del input
 * @param {string} folder - Subcarpeta dentro del bucket ('proyectos', 'servicios', 'avatars')
 * @returns {Promise<{ url: string, path: string }>}
 */
export async function uploadImage(file, folder = "proyectos") {
  // 1. Verificación estricta de firma de archivo (Magic Bytes) y tamaño
  const check = await verifyImageMagicBytes(file);
  if (!check.valid) {
    throw new Error(check.error || "Archivo no válido para subida");
  }

  // 2. Normalizar y generar nombre de archivo seguro
  const fileExt = file.name.split(".").pop().toLowerCase();
  const cleanBaseName = file.name
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .substring(0, 30);
  const uniqueId = Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 6);
  const filePath = `${folder}/${cleanBaseName}-${uniqueId}.${fileExt}`;

  // 3. Subir archivo a Supabase Storage
  const { data, error } = await supabase.storage
    .from(CONFIG.STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type
    });

  if (error) {
    console.error("Error al subir a Supabase Storage:", error);
    throw new Error(`Error en el almacenamiento: ${error.message}`);
  }

  // 4. Obtener URL pública
  const { data: publicUrlData } = supabase.storage
    .from(CONFIG.STORAGE_BUCKET)
    .getPublicUrl(data.path);

  return {
    url: publicUrlData.publicUrl,
    path: data.path
  };
}

/**
 * Elimina un archivo de Supabase Storage
 * @param {string} filePath - Ruta relativa del archivo dentro del bucket
 */
export async function deleteImage(filePath) {
  if (!filePath) return;
  const { error } = await supabase.storage
    .from(CONFIG.STORAGE_BUCKET)
    .remove([filePath]);

  if (error) {
    console.error("Error al eliminar de Storage:", error);
    throw error;
  }
}
