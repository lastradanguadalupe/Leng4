// ==============================================================================
// public/js/components/password-toggle.js
// Mostrar / ocultar contraseña, medidor de fortaleza y coincidencia en vivo.
//
// Se aplica a TODOS los campos de contraseña del sitio (login, registro,
// confirmar, restablecer y cambio de contraseña en el perfil) sin tocar cada
// formulario a mano: alcanza con que el input sea type="password".
// ==============================================================================

const SVG_OJO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>`;

const SVG_OJO_TACHADO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

export const PasswordToggle = {
  /**
   * Monta el botón de ojo en todos los campos de contraseña del documento.
   * @param {ParentNode} raiz dónde buscar (por defecto, todo el documento)
   */
  init(raiz = document) {
    raiz.querySelectorAll('input[type="password"]').forEach((input) => this.montar(input));
    this.vincularReOcultadoAlEnviar(raiz);
  },

  /**
   * Envuelve un input en un contenedor y le agrega el botón.
   */
  montar(input) {
    if (input.dataset.toggleMontado === "1") return;
    input.dataset.toggleMontado = "1";

    // Contenedor relativo para posicionar el botón dentro del input
    const envoltorio = document.createElement("div");
    envoltorio.className = "campo-password";
    input.parentNode.insertBefore(envoltorio, input);
    envoltorio.appendChild(input);

    // Espacio a la derecha para que el texto no pase por debajo del botón
    input.classList.add("campo-password__input");

    const boton = document.createElement("button");
    // type="button" para que no envíe el formulario
    boton.type = "button";
    boton.className = "campo-password__ojo";
    boton.innerHTML = SVG_OJO;
    boton.setAttribute("aria-label", "Mostrar contraseña");
    boton.setAttribute("aria-pressed", "false");
    boton.setAttribute("title", "Mostrar contraseña");
    envoltorio.appendChild(boton);

    boton.addEventListener("click", () => this.alternar(input, boton));
  },

  /**
   * Alterna password/text conservando el foco y la posición del cursor.
   * Cambiar `type` resetea la selección en varios navegadores, así que la
   * guardamos y la restauramos.
   */
  alternar(input, boton) {
    const visible = input.type === "text";
    const inicio = input.selectionStart;
    const fin = input.selectionEnd;
    const teniaFoco = document.activeElement === input;

    input.type = visible ? "password" : "text";

    const ahoraVisible = !visible;
    boton.innerHTML = ahoraVisible ? SVG_OJO_TACHADO : SVG_OJO;
    const etiqueta = ahoraVisible ? "Ocultar contraseña" : "Mostrar contraseña";
    boton.setAttribute("aria-label", etiqueta);
    boton.setAttribute("title", etiqueta);
    boton.setAttribute("aria-pressed", String(ahoraVisible));

    if (teniaFoco) {
      input.focus();
      try {
        input.setSelectionRange(inicio, fin);
      } catch {
        // Algunos navegadores no permiten setSelectionRange según el type.
      }
    }
  },

  /** Al enviar cualquier formulario, las contraseñas vuelven a ocultarse. */
  vincularReOcultadoAlEnviar(raiz) {
    raiz.querySelectorAll("form").forEach((form) => {
      if (form.dataset.reocultarVinculado === "1") return;
      form.dataset.reocultarVinculado = "1";

      form.addEventListener("submit", () => {
        form.querySelectorAll(".campo-password__input").forEach((input) => {
          if (input.type !== "text") return;
          input.type = "password";
          const boton = input.parentNode.querySelector(".campo-password__ojo");
          if (boton) {
            boton.innerHTML = SVG_OJO;
            boton.setAttribute("aria-label", "Mostrar contraseña");
            boton.setAttribute("title", "Mostrar contraseña");
            boton.setAttribute("aria-pressed", "false");
          }
        });
      });
    });
  }
};

/* ==========================================================================
 * Fortaleza de contraseña
 * ======================================================================== */

/**
 * Evalúa una contraseña contra los requisitos mínimos:
 * 8 caracteres, una mayúscula, una minúscula y un número.
 */
export function evaluarFortaleza(password) {
  const requisitos = {
    largo: password.length >= 8,
    mayuscula: /[A-ZÁÉÍÓÚÑ]/.test(password),
    minuscula: /[a-záéíóúñ]/.test(password),
    numero: /[0-9]/.test(password)
  };

  const cumplidos = Object.values(requisitos).filter(Boolean).length;
  const bonus = password.length >= 12 && /[^A-Za-z0-9]/.test(password);

  let nivel = "debil";
  let etiqueta = "Débil";
  if (cumplidos === 4) {
    nivel = bonus ? "fuerte" : "buena";
    etiqueta = bonus ? "Fuerte" : "Buena";
  } else if (cumplidos === 3) {
    nivel = "media";
    etiqueta = "Media";
  }

  return {
    requisitos,
    cumplidos,
    valida: cumplidos === 4,
    nivel,
    etiqueta,
    porcentaje: Math.round((cumplidos / 4) * 100)
  };
}

/**
 * Conecta el medidor de fortaleza a un input y su contenedor de UI.
 */
export function montarMedidorFortaleza(input, contenedor) {
  if (!input || !contenedor) return;

  const etiquetasRequisitos = {
    largo: "8 caracteres",
    mayuscula: "Una mayúscula",
    minuscula: "Una minúscula",
    numero: "Un número"
  };

  contenedor.innerHTML = `
    <div class="fortaleza">
      <div class="fortaleza__barra" role="progressbar" aria-label="Fortaleza de la contraseña"
           aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <span class="fortaleza__relleno"></span>
      </div>
      <span class="fortaleza__etiqueta"></span>
    </div>
    <ul class="fortaleza__requisitos list-unstyled">
      ${Object.entries(etiquetasRequisitos)
        .map(
          ([clave, texto]) =>
            `<li data-req="${clave}"><span class="fortaleza__check" aria-hidden="true">○</span> ${texto}</li>`
        )
        .join("")}
    </ul>`;

  const barra = contenedor.querySelector(".fortaleza__barra");
  const relleno = contenedor.querySelector(".fortaleza__relleno");
  const etiqueta = contenedor.querySelector(".fortaleza__etiqueta");

  const pintar = () => {
    const valor = input.value;
    const r = evaluarFortaleza(valor);

    relleno.style.width = valor ? `${r.porcentaje}%` : "0%";
    relleno.dataset.nivel = valor ? r.nivel : "";
    etiqueta.textContent = valor ? r.etiqueta : "";
    etiqueta.dataset.nivel = valor ? r.nivel : "";
    barra.setAttribute("aria-valuenow", valor ? String(r.porcentaje) : "0");

    Object.entries(r.requisitos).forEach(([clave, cumple]) => {
      const li = contenedor.querySelector(`[data-req="${clave}"]`);
      if (!li) return;
      li.classList.toggle("cumple", cumple);
      li.querySelector(".fortaleza__check").textContent = cumple ? "●" : "○";
    });
  };

  input.addEventListener("input", pintar);
  pintar();
}

/**
 * Validación de coincidencia en vivo entre contraseña y repetición.
 */
export function montarCoincidencia(inputPass, inputConfirm, mensajeEl) {
  if (!inputPass || !inputConfirm || !mensajeEl) return;

  const pintar = () => {
    const a = inputPass.value;
    const b = inputConfirm.value;

    if (!b) {
      mensajeEl.textContent = "";
      mensajeEl.dataset.estado = "";
      inputConfirm.setAttribute("aria-invalid", "false");
      return;
    }

    const coinciden = a === b;
    mensajeEl.textContent = coinciden ? "Las contraseñas coinciden" : "Las contraseñas no coinciden";
    mensajeEl.dataset.estado = coinciden ? "ok" : "error";
    inputConfirm.setAttribute("aria-invalid", String(!coinciden));
  };

  inputPass.addEventListener("input", pintar);
  inputConfirm.addEventListener("input", pintar);
}
