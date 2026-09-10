// npx tsx lib/bloqueo.test.ts
import assert from "node:assert";
import { writeFileSync } from "node:fs";
import { redactarAviso, type Bloqueo } from "./bloqueo";

const bloqueo: Bloqueo = {
  nombre: "login:arbol",
  ip: "203.0.113.45",
  key: "ratelimit:login:arbol:203.0.113.45",
  intentos: 6,
  max: 5,
  ttl: 1800,
  cuando: new Date("2026-09-10T16:32:07Z"),
};

const enVercel = new Request("https://pacr.es/arbol/api/login?x=1", {
  method: "POST",
  headers: {
    "x-real-ip": "203.0.113.45",
    "x-vercel-ip-city": "Palma%20de%20Mallorca",
    "x-vercel-ip-country-region": "PM",
    "x-vercel-ip-country": "ES",
    "x-vercel-ip-timezone": "Europe/Madrid",
    "user-agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8a)",
    "accept-language": "es-ES,es;q=0.9",
    referer: "https://pacr.es/arbol",
  },
});

const { subject, text, html = "" } = redactarAviso(enVercel, bloqueo);

// El asunto tiene que bastar para saber qué pasó sin abrir el email.
assert.equal(subject, "Bloqueo en login:arbol — 203.0.113.45 (Palma de Mallorca, PM, ES)");

assert.ok(text.includes("Palma de Mallorca"), "la ciudad llega percent-encodeada y se decodifica");
assert.ok(text.includes("POST /arbol/api/login"), "la ruta, sin la query");
assert.ok(text.includes("6 (el límite son 5 cada 30 min)"));
assert.ok(text.includes("Pixel 8a"));
assert.ok(text.includes("es-ES"));
assert.ok(text.includes("https://pacr.es/arbol"));
assert.ok(text.includes("DEL ratelimit:login:arbol:203.0.113.45"), "cómo desbloquear ya");
// La hora, en Madrid: el bloqueo es a las 18:32 de aquí, no a las 16:32 UTC.
assert.ok(text.includes("18:32:07"), text);

// En local no llega ninguna cabecera: las filas de las que no hay dato desaparecen, no
// se quedan con el hueco detrás (que se leería como un dato que se ha perdido).
const pelado = redactarAviso(new Request("http://localhost:3001/api/guestbook", { method: "POST" }), {
  ...bloqueo,
  nombre: "guestbook",
  ip: "unknown",
});
assert.equal(pelado.subject, "Bloqueo en guestbook — unknown");
for (const ausente of ["Dónde", "Zona", "Navegador", "Idioma", "Viene de"]) {
  assert.ok(!pelado.text.includes(ausente), ausente);
  assert.ok(!(pelado.html ?? "").includes(ausente), ausente);
}

// Las dos versiones salen de la misma lista: la de texto no puede llevar un dato que la
// ventana no enseñe (es la que se lee; la de texto solo la ve quien apaga el HTML).
for (const linea of text.split("\n\n")[1].split("\n")) {
  const [etiqueta, valor] = [linea.slice(0, 11).trim(), linea.slice(11)];
  assert.ok(html.includes(`>${etiqueta}</td>`), `falta la fila ${etiqueta}`);
  assert.ok(html.includes(valor.replace(/&/g, "&amp;")), `falta el valor de ${etiqueta}`);
}

// El navegador y el referer los teclea quien se bloquea, y aquí no hay React que escape.
const conScript = redactarAviso(
  new Request("https://pacr.es/arbol/api/login", {
    method: "POST",
    headers: { "user-agent": "<script>alert(1)</script>" },
  }),
  bloqueo,
);
assert.ok(!(conScript.html ?? "").includes("<script>"), "el user-agent entra escapado");
assert.ok((conScript.html ?? "").includes("&lt;script&gt;"));

console.log("bloqueo.test.ts ok");
console.log("\n--- ejemplo ---\n" + subject + "\n\n" + text);

// La ventana, a un archivo: el HTML de un email no se lee, se mira.
if (process.argv[2]) {
  writeFileSync(process.argv[2], html);
  console.log("ventana escrita en " + process.argv[2]);
}
