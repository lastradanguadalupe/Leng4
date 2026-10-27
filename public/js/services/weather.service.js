// ==============================================================================
// public/js/services/weather.service.js
// Integración con Geolocalización por IP, Clima Local y APIs Web Modernas
// ==============================================================================

import { CONFIG } from "../config.js";

export const WeatherService = {
  /**
   * Obtiene la geolocalización aproximada del visitante por IP
   */
  async getVisitorGeoLocation() {
    const cached = sessionStorage.getItem("visitor_geo");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // Ignorar
      }
    }

    try {
      const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3500) });
      if (!res.ok) throw new Error("HTTP error " + res.status);
      const data = await res.json();
      
      const geo = {
        ip: data.ip,
        city: data.city || "Buenos Aires",
        country: data.country_name || "Argentina",
        countryCode: data.country_code || "AR",
        latitude: data.latitude || -34.6037,
        longitude: data.longitude || -58.3816,
        timezone: data.timezone || "America/Argentina/Buenos_Aires"
      };

      sessionStorage.setItem("visitor_geo", JSON.stringify(geo));
      return geo;
    } catch (err) {
      console.warn("Geolocalización por IP no disponible, usando predeterminado:", err.message);
      return {
        ip: "127.0.0.1",
        city: "Buenos Aires",
        country: "Argentina",
        countryCode: "AR",
        latitude: -34.6037,
        longitude: -58.3816,
        timezone: "America/Argentina/Buenos_Aires"
      };
    }
  },

  /**
   * Obtiene el clima y hora local del visitante usando la API libre de Open-Meteo
   */
  async getLocalWeather(lat, lon) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error("Weather API error");
      const data = await res.json();

      const temp = Math.round(data.current?.temperature_2m ?? 22);
      const code = data.current?.weather_code ?? 0;
      
      // Mapear código meteorológico WMO a descripción y emoji
      let description = "Despejado";
      let icon = "☀️";
      if (code >= 1 && code <= 3) { description = "Parcialmente nublado"; icon = "⛅"; }
      else if (code >= 45 && code <= 48) { description = "Neblina"; icon = "🌫️"; }
      else if (code >= 51 && code <= 67) { description = "Lluvia ligera"; icon = "🌧️"; }
      else if (code >= 71 && code <= 77) { description = "Nieve"; icon = "❄️"; }
      else if (code >= 80 && code <= 82) { description = "Chubascos"; icon = "🌦️"; }
      else if (code >= 95) { description = "Tormenta eléctrica"; icon = "⚡"; }

      return {
        temperature: temp,
        description,
        icon,
        humidity: data.current?.relative_humidity_2m ?? 60
      };
    } catch (err) {
      console.warn("Clima no disponible:", err.message);
      return {
        temperature: 23,
        description: "Agradable",
        icon: "✨",
        humidity: 50
      };
    }
  },

  /**
   * Utilidad de Web API: Copiar al portapapeles con Clipboard API nativa
   */
  async copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return successful;
    }
  },

  /**
   * Utilidad de Web API: Compartir contenido mediante Web Share API nativa
   */
  async shareContent({ title, text, url }) {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: url || window.location.href });
        return true;
      } catch (err) {
        if (err.name !== "AbortError") console.error("Error compartiendo:", err);
        return false;
      }
    } else {
      // Fallback a copiar enlace
      return await this.copyToClipboard(url || window.location.href);
    }
  }
};
