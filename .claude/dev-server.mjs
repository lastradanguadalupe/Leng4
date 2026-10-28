// Servidor estático de desarrollo. A diferencia de `python -m http.server`,
// manda Cache-Control: no-store para que el navegador no se quede con módulos JS viejos.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(fileURLToPath(new URL("../public", import.meta.url)));
const puerto = Number(process.env.PORT) || 3000;

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  let ruta = normalize(join(raiz, decodeURIComponent(pathname)));
  if (ruta !== raiz && !ruta.startsWith(raiz + sep)) {
    res.writeHead(403).end("Prohibido");
    return;
  }

  try {
    if ((await stat(ruta)).isDirectory()) ruta = join(ruta, "index.html");
  } catch {
    // Sin extensión: probar la misma ruta con .html (como hace vercel.json con las páginas legales)
    if (!extname(ruta)) ruta += ".html";
  }

  try {
    const cuerpo = await readFile(ruta);
    res.writeHead(200, {
      "Content-Type": TIPOS[extname(ruta)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(cuerpo);
  } catch {
    res.writeHead(404, { "Cache-Control": "no-store" }).end("No encontrado");
  }
}).listen(puerto, () => console.log(`http://localhost:${puerto} (no-store)`));
