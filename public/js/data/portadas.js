// ==============================================================================
// public/js/data/portadas.js
// Portadas de proyecto dibujadas en SVG (mockups propios, sin fotos ni licencias).
//
// Cada una es una "captura" esquemática de una ventana de navegador con la
// interfaz típica del tipo de proyecto. Son abstractas a propósito: barras y
// bloques en lugar de texto, para no mostrar datos que parezcan reales.
// Paleta: solo #000000, #ffffff y #6049ea, con opacidad para los derivados.
//
// Se eligen por `slug` y, si no hay uno exacto, por `categoria`. Un proyecto
// sin mockup cae al respaldo de iniciales.
// ==============================================================================

const B = "rgba(255,255,255,"; // blanco con opacidad
const P = "rgba(96,73,234,"; // morado con opacidad

/** Marco común: ventana de navegador con barra superior. El contenido va en 64..576 x 88..316. */
function ventana(contenido) {
  return `<svg class="portada-mock" viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="presentation" focusable="false">
  <rect x="48" y="36" width="544" height="292" rx="12" fill="${B}0.05)" stroke="${B}0.14)"/>
  <path d="M48 70h544" stroke="${B}0.1)"/>
  <circle cx="68" cy="53" r="4" fill="${B}0.28)"/><circle cx="82" cy="53" r="4" fill="${B}0.18)"/><circle cx="96" cy="53" r="4" fill="${B}0.18)"/>
  <rect x="190" y="45" width="260" height="16" rx="8" fill="${B}0.07)"/>
  ${contenido}
</svg>`;
}

const barra = (x, y, w, o = 0.14, h = 8, c = B) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${c}${o})"/>`;

// 1. Agenda de turnos: calendario + lista del día
function agenda() {
  let celdas = "";
  const marcadas = { 3: 0.35, 9: 0.9, 11: 0.35, 15: 0.55, 18: 0.9, 22: 0.35, 24: 0.55 };
  for (let i = 0; i < 28; i++) {
    const x = 72 + (i % 7) * 50;
    const y = 112 + Math.floor(i / 7) * 46;
    const o = marcadas[i];
    celdas += `<rect x="${x}" y="${y}" width="42" height="38" rx="7" fill="${o ? P + o + ")" : B + "0.05)"}" stroke="${B}0.08)"/>`;
  }
  const lista = [0, 1, 2]
    .map((i) => {
      const y = 112 + i * 62;
      return `<rect x="436" y="${y}" width="140" height="52" rx="9" fill="${B}0.05)" stroke="${B}0.1)"/>
      <circle cx="456" cy="${y + 26}" r="9" fill="${P}${i === 0 ? 0.9 : 0.4})"/>
      ${barra(474, y + 16, 78, 0.28)}${barra(474, y + 30, 52, 0.12, 6)}`;
    })
    .join("");
  return ventana(`${barra(72, 90, 110, 0.3, 10)}${celdas}${lista}
  <rect x="436" y="92" width="62" height="12" rx="6" fill="${P}0.7)"/>`);
}

// 2. Catálogo con precios por tipo de cliente + botón de pedido
function catalogo() {
  const filas = [0, 1, 2, 3, 4]
    .map((i) => {
      const y = 134 + i * 34;
      return `<rect x="72" y="${y}" width="504" height="28" rx="7" fill="${B}${i % 2 ? 0.03 : 0.06})"/>
      <rect x="82" y="${y + 5}" width="18" height="18" rx="4" fill="${P}0.35)"/>
      ${barra(110, y + 10, 120 + ((i * 37) % 60), 0.26)}
      ${barra(380, y + 10, 52, 0.18)}${barra(480, y + 10, 52, 0.4)}`;
    })
    .join("");
  return ventana(`
  <rect x="72" y="88" width="504" height="36" rx="9" fill="${B}0.07)"/>
  ${barra(84, 102, 70, 0.4)}${barra(380, 102, 52, 0.3)}${barra(480, 102, 52, 0.3)}
  ${filas}
  <rect x="448" y="300" width="128" height="22" rx="11" fill="${P}0.9)"/>
  ${barra(470, 308, 84, 0.85, 6)}`);
}

// 3. API: respuesta JSON + stock por sucursal
function api() {
  const lineas = [
    [0, 90, P, 0.9],
    [18, 150, B, 0.3],
    [18, 120, B, 0.2],
    [36, 90, P, 0.5],
    [36, 160, B, 0.2],
    [36, 110, B, 0.3],
    [18, 70, P, 0.5],
    [0, 30, P, 0.9]
  ]
    .map(([sangria, ancho, c, o], i) => barra(86 + sangria, 118 + i * 22, ancho, o, 8, c))
    .join("");
  const barras = [150, 104, 128, 78]
    .map(
      (h, i) =>
        `<rect x="${384 + i * 46}" y="${290 - h}" width="30" height="${h}" rx="5" fill="${P}${i === 0 ? 0.9 : 0.4})"/>`
    )
    .join("");
  return ventana(`
  <rect x="72" y="88" width="280" height="228" rx="9" fill="${B}0.05)" stroke="${B}0.1)"/>
  <rect x="86" y="98" width="48" height="12" rx="6" fill="${P}0.85)"/>
  ${lineas}
  <rect x="368" y="88" width="208" height="228" rx="9" fill="${B}0.04)" stroke="${B}0.1)"/>
  ${barra(384, 102, 70, 0.3, 8)}
  <path d="M384 290h176" stroke="${B}0.2)"/>
  ${barras}`);
}

// 4. Landing de estudio: título, botón y fachada esquemática
function landing() {
  let ventanas = "";
  for (let f = 0; f < 5; f++) {
    for (let c = 0; c < 4; c++) {
      ventanas += `<rect x="${430 + c * 30}" y="${112 + f * 36}" width="18" height="24" rx="2" fill="${B}${(f + c) % 3 === 0 ? 0.3 : 0.1})"/>`;
    }
  }
  return ventana(`
  ${barra(72, 92, 70, 0.3, 8)}${barra(500, 92, 30, 0.14, 8)}${barra(540, 92, 36, 0.14, 8)}
  <rect x="72" y="140" width="250" height="16" rx="8" fill="${B}0.85)"/>
  <rect x="72" y="166" width="200" height="16" rx="8" fill="${B}0.85)"/>
  <rect x="72" y="192" width="120" height="16" rx="8" fill="${P}0.9)"/>
  ${barra(72, 226, 240, 0.16)}${barra(72, 242, 190, 0.12)}
  <rect x="72" y="266" width="110" height="30" rx="15" fill="${P}0.95)"/>
  ${barra(94, 278, 66, 0.85, 6)}
  <rect x="412" y="98" width="164" height="200" rx="9" fill="${B}0.04)" stroke="${B}0.12)"/>
  <rect x="424" y="104" width="140" height="190" fill="${P}0.12)"/>
  ${ventanas}`);
}

// 5. Intranet de reportes: KPIs, gráfico y tabla
function intranet() {
  const kpis = [0, 1, 2]
    .map(
      (i) => `<rect x="${72 + i * 172}" y="88" width="160" height="48" rx="9" fill="${B}0.05)" stroke="${B}0.1)"/>
      ${barra(84 + i * 172, 100, 50, 0.22, 6)}${barra(84 + i * 172, 114, 80, i === 0 ? 0.85 : 0.35, 10)}`
    )
    .join("");
  const barrasGrafico = [60, 96, 76, 120, 88, 104]
    .map(
      (h, i) =>
        `<rect x="${86 + i * 34}" y="${290 - h}" width="22" height="${h}" rx="4" fill="${P}${i === 3 ? 0.95 : 0.4})"/>`
    )
    .join("");
  const filas = [0, 1, 2, 3, 4]
    .map((i) => `<rect x="316" y="${160 + i * 26}" width="260" height="20" rx="5" fill="${B}${i % 2 ? 0.03 : 0.06})"/>
    ${barra(326, 166 + i * 26, 60 + ((i * 23) % 40), 0.24, 7)}${barra(500, 166 + i * 26, 56, 0.16, 7)}`)
    .join("");
  return ventana(`${kpis}
  <rect x="72" y="150" width="228" height="166" rx="9" fill="${B}0.04)" stroke="${B}0.1)"/>
  <path d="M86 290h200" stroke="${B}0.2)"/>
  ${barrasGrafico}
  <rect x="510" y="142" width="66" height="12" rx="6" fill="${P}0.85)"/>
  ${filas}`);
}

const POR_SLUG = {
  "gestor-de-turnos": agenda,
  "catalogo-mayorista": catalogo,
  "api-inventario": api,
  "landing-estudio-arquitectura": landing,
  "intranet-cooperativa": intranet
};

const POR_CATEGORIA = {
  "web app": agenda,
  "e-commerce": catalogo,
  api: api,
  landing: landing,
  corporativo: intranet
};

/** SVG de la portada para un proyecto, o null si no hay mockup para su slug/categoría. */
export function portadaMock(slug, categoria) {
  const fabrica = POR_SLUG[slug] || POR_CATEGORIA[String(categoria || "").toLowerCase()];
  return fabrica ? fabrica() : null;
}
