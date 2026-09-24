// Sube una foto del árbol al blob privado y escribe la línea que hay que pegar en
// `lib/arbol/fotos.ts`. Son dos pasos a propósito: el archivo se sube una vez y la lista se
// commitea, así que hasta que la línea no está puesta la ruta no sirve la foto a nadie.
//
//   npx tsx --env-file=.env.local scripts/subir-foto-arbol.ts <archivo.jpg> <tomada> <de quién>
//
// `tomada` va con la precisión que se sepa: `1975`, `1975-08` o la fecha entera. «De quién»
// es **el id del dueño si sale uno solo** (`p125`) y **el título de la foto si salen varios**
// (`"La Venta de La Paloma"`), que es de donde sale la clave en cada caso.
//
// El archivo se sube tal cual: encuadrar es cosa de los recuadros de `fotos.ts`, y reducir
// es un paso anterior y a ojo (`sips`), porque `sips -Z` se come la orientación EXIF y hay
// que mirar la foto antes de darla por buena.
import { put } from "@vercel/blob";
import { readFileSync } from "fs";
import { claveDeFoto, rutaEnBlob } from "../lib/arbol/fotos";

async function main() {
  const [archivo, tomada, dequien] = process.argv.slice(2);
  if (!archivo || !tomada || !dequien) {
    throw new Error("Uso: subir-foto-arbol.ts <archivo.jpg> <tomada> <id del dueño | título>");
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN no definida — usa --env-file=.env.local.");
  }

  // Un id del árbol es `p` y un número; cualquier otra cosa es el título de una foto de
  // varios. No hace falta una opción para distinguirlos porque no hay título que se escriba así.
  const esId = /^p\d+$/.test(dequien);
  const foto = esId
    ? { tomada, gente: [{ id: dequien }] }
    : { titulo: dequien, tomada, gente: [] };

  const clave = claveDeFoto(foto);
  const { pathname } = await put(rutaEnBlob(clave), readFileSync(archivo), {
    access: "private",
    contentType: "image/jpeg",
    // La clave sale de la foto, así que volver a subir la misma la reemplaza en vez de dejar
    // dos: es lo que se quiere cuando se sube un escaneo mejor.
    allowOverwrite: true,
  });

  console.log(`Subida a ${pathname}. Falta la línea en lib/arbol/fotos.ts:`);
  console.log(
    esId
      ? `  { tomada: "${tomada}", gente: [{ id: "${dequien}", nombre: "<su nombre en el árbol>", recuadro: r(x, y, lado, ancho) }] },`
      : `  { titulo: "${dequien}", tomada: "${tomada}", gente: [/* uno por cara, con su recuadro */] },`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
