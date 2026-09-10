// npx tsx lib/email-terminal.test.ts [archivo.html]
import assert from "node:assert";
import { writeFileSync } from "node:fs";
import { emailTerminal } from "./email-terminal";

const completo = emailTerminal("Asunto", {
  titulo: "guestbook",
  comando: 'guestbook --nueva 4f3a2b1c',
  entrada: "Alguien ha firmado el guestbook.",
  filas: [
    ["Quién", "Pablo"],
    ["Cuándo", "jueves, 10 de septiembre de 2026, 18:32"],
    ["Nunca llegó", null],
  ],
  nota: "Ha escrito:",
  bloque: "Qué buena web, <3",
  enlaces: [
    ["Ocultar esta firma", "https://pacr.es/guestbook?ocultar=4f3a"],
    ["Moderar todas", "https://pacr.es/guestbook?moderar"],
  ],
});
const { text, html = "" } = completo;

// La fila sin dato no deja su etiqueta con el hueco detrás (que se leería como un dato perdido).
assert.ok(!text.includes("Nunca llegó") && !html.includes("Nunca llegó"));

// Los valores se alinean dos espacios después de la etiqueta más larga de las que quedan.
assert.ok(text.includes("Quién   Pablo"), text);

// Lo que teclea quien firma entra escapado: aquí no hay React que lo haga por nosotros.
const conScript = emailTerminal("x", {
  titulo: "t", comando: "c", entrada: "e", bloque: "<script>alert(1)</script>",
});
assert.ok(!(conScript.html ?? "").includes("<script>"));
assert.ok((conScript.html ?? "").includes("&lt;script&gt;"));

// Los enlaces son botones en la ventana y URLs a la vista en la versión de texto: quien
// lee en plano tiene que poder llegar al mismo sitio.
for (const url of ["https://pacr.es/guestbook?ocultar=4f3a", "https://pacr.es/guestbook?moderar"]) {
  assert.ok(text.includes(url), url);
  assert.ok(html.includes(`href="${url.replace(/&/g, "&amp;")}"`), url);
}

// Sin filas, sin nota y sin bloque —el caso de un ranking— la ventana no deja separadores
// vacíos ni la de texto líneas en blanco de más.
const pelado = emailTerminal("x", {
  titulo: "juegos/espiral", comando: "ranking espiral", entrada: "Entró en el ranking.",
  enlaces: [["Ver ranking", "https://pacr.es/juegos/espiral/ranking"]],
});
assert.equal(pelado.text, "Entró en el ranking.\n\nVer ranking: https://pacr.es/juegos/espiral/ranking\n");

console.log("email-terminal.test.ts ok");

// La ventana, a un archivo: el HTML de un email no se lee, se mira.
if (process.argv[2]) {
  writeFileSync(process.argv[2], html);
  console.log("ventana escrita en " + process.argv[2]);
}
