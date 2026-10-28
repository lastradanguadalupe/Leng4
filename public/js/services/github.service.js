// ==============================================================================
// public/js/services/github.service.js
// Integración con GitHub REST API para Repositorios, Lenguajes y Actividad Real
// ==============================================================================

import { CONFIG } from "../config.js";

export const GithubService = {
  /**
   * Obtiene información del perfil y repositorios públicos
   */
  async getUserRepositories(username = CONFIG.GITHUB_USERNAME) {
    // Revisar caché en sessionStorage para optimizar rate limits de GitHub.
    //
    // Importante: NO se usa la caché si está vacía. Antes, si una consulta
    // devolvía [] (por ejemplo porque el usuario configurado no tenía repos
    // públicos), ese array vacío quedaba guardado y la sección se veía vacía
    // el resto de la sesión, incluso después de corregir el usuario.
    const cacheKey = `github_repos_${username}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
        sessionStorage.removeItem(cacheKey);
      } catch (e) {
        sessionStorage.removeItem(cacheKey);
      }
    }

    try {
      const response = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=6`, {
        headers: {
          Accept: "application/vnd.github.v3+json"
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API HTTP ${response.status}`);
      }

      const repos = await response.json();

      // Mapear campos limpios
      const cleanRepos = repos.map(repo => ({
        id: repo.id,
        name: repo.name,
        description: repo.description || "Sin descripción proporcionada",
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language || "JavaScript",
        url: repo.html_url,
        updatedAt: repo.updated_at
      }));

      if (cleanRepos.length) {
        sessionStorage.setItem(cacheKey, JSON.stringify(cleanRepos));
      }
      return cleanRepos;
    } catch (err) {
      // Sin fallback inventado.
      //
      // Antes esto devolvía tres repositorios FICTICIOS ("fullstack-reactive-core",
      // "gsap-scroll-experience", "supabase-auth-guards") con cantidades de
      // estrellas y forks inventadas, y la sección los mostraba como
      // "Actividad Reciente en GitHub · Sincronizado en tiempo real". Es
      // actividad que no existe, presentada como real: en una entrega que se
      // evalúa eso es peor que una sección vacía.
      console.warn(
        `No se pudieron traer los repositorios de "${username}" desde la API de GitHub:`,
        err.message
      );
      return [];
    }
  }
};
