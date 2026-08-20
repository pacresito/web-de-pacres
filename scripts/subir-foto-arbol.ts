// Sube una foto del árbol al blob privado y escribe la línea que hay que pegar en
// `lib/arbol/fotos.ts`. Son dos pasos a propósito: el archivo se sube una vez y la lista se
// commitea, así que hasta que la línea no está puesta la ruta no sirve la foto a nadie.
//
//   npx tsx --env-file=.env.local scripts/subir-foto-arbol.ts <archivo.jpg> <id> <tomada>
//
// `tomada` va con la precisión que se sepa: `1975`, `1975-08` o la fecha entera. El archivo
// se sube tal cual: recortar y redimensionar es un paso anterior y a ojo (`sips`), porque
// `sips -Z` se come la orientación EXIF y hay que mirar la foto antes de darla por buena.
import { put } from "@vercel/blob";
import { readFileSync } from "fs";
import { claveDeFoto, rutaEnBlob } from "../lib/arbol/fotos";

async function main() {
  const [archivo, id, tomada] = process.argv.slice(2);
  if (!archivo || !id || !tomada) {
    throw new Error("Uso: subir-foto-arbol.ts <archivo.jpg> <id> <tomada>");
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN no definida — usa --env-file=.env.local.");
  }

  const clave = claveDeFoto({ id, nombre: "", tomada });
  const { pathname } = await put(rutaEnBlob(clave), readFileSync(archivo), {
    access: "private",
    contentType: "image/jpeg",
    // La clave sale del dueño y del año, así que volver a subir la misma foto la reemplaza
    // en vez de dejar dos: es lo que se quiere cuando se corrige un recorte.
    allowOverwrite: true,
  });

  console.log(`Subida a ${pathname}. Falta la línea en lib/arbol/fotos.ts:`);
  console.log(`  { id: "${id}", nombre: "<su nombre en el árbol>", tomada: "${tomada}" },`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
