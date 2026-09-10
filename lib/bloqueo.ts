// El aviso por email de que el rate limit ha dejado fuera a una IP. Lo dispara
// `checkRateLimit` y no cada ruta: bloquear es cosa suya, así que una funcionalidad nueva
// que lo use avisa sin saber que esto existe — y no hay forma de bloquear en silencio.
import { sendEmail, escapeHtml, type SendEmailOptions } from "./notify";

export interface Bloqueo {
  /** Nombre del contador (`login:arbol`, `guestbook`…): es lo que dice qué se ha bloqueado. */
  nombre: string;
  ip: string;
  /** La clave de Redis tal cual: borrarla es lo único que desbloquea antes de tiempo. */
  key: string;
  intentos: number;
  max: number;
  /** Segundos que dura el bloqueo desde el primer intento. */
  ttl: number;
  cuando: Date;
}

/** La paleta terminal del sitio, copiada de `globals.css` a mano y en valores literales:
 *  un email no lee la hoja de estilos de nadie, y la mitad de los clientes tampoco leen una
 *  `<style>` — aquí todo va en atributos `style` sobre tablas, como en 2005. */
const PAPEL = "#fafaf7", PAPEL2 = "#f4f1ea", CANVAS = "#ece9e0";
const TINTA = "#16140f", TINTA3 = "#7a766b", REGLA = "#d9d4c7";
const VERDE = "#00b87a", VERDE2 = "#009764", VERDE_BG = "#e8faf1";
const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

/** Un header de geolocalización de Vercel. Los manda percent-encodeados —la ciudad llega
 *  como `Palma%20de%20Mallorca`—, y en local no llega ninguno. */
function geo(request: Request, campo: string): string | null {
  const valor = request.headers.get(`x-vercel-ip-${campo}`)?.trim();
  if (!valor) return null;
  try {
    return decodeURIComponent(valor);
  } catch {
    return valor;
  }
}

/** Lugar legible, o nada: en local no llega ninguna cabecera de geolocalización. */
function lugarDe(request: Request): string | null {
  return [geo(request, "city"), geo(request, "country-region"), geo(request, "country")]
    .filter(Boolean)
    .join(", ") || null;
}

/** Los datos del aviso, en pares. Las dos versiones del email salen de aquí, así que
 *  un campo nuevo aparece en las dos o en ninguna. Un dato que no ha llegado se cae de la
 *  lista en vez de dejar su etiqueta con el hueco detrás, que se lee como un dato perdido. */
function filas(request: Request, b: Bloqueo): [string, string][] {
  const minutos = Math.round(b.ttl / 60);
  const pares: [string, string | null | undefined][] = [
    ["Qué", `${b.nombre} — ${request.method} ${new URL(request.url).pathname}`],
    ["IP", b.ip],
    ["Dónde", lugarDe(request)],
    ["Zona", geo(request, "timezone")],
    ["Cuándo", `${b.cuando.toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "full", timeStyle: "medium" })} (Madrid)`],
    ["Intentos", `${b.intentos} (el límite son ${b.max} cada ${minutos} min)`],
    ["Bloqueada", `${minutos} min desde el primer intento; luego se abre sola`],
    ["Navegador", request.headers.get("user-agent")],
    ["Idioma", request.headers.get("accept-language")],
    ["Viene de", request.headers.get("referer")],
  ];
  return pares.filter((p): p is [string, string] => Boolean(p[1]));
}

const ENTRADA = "Una IP ha superado el límite de intentos y está bloqueada.";
const COMO_ABRIR = "Para abrirla ya, borra su contador en Redis:";

/** La ventana de terminal del sitio, en HTML de email: tablas, estilos en línea y colores
 *  literales. Todo lo que viene de la petición —navegador, referer, ciudad— lo teclea quien
 *  la manda, y aquí no hay React que lo escape. */
function ventana(request: Request, b: Bloqueo): string {
  const punto = (color: string) =>
    `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${color};margin-right:5px;"></span>`;

  const cuerpo = filas(request, b)
    .map(
      ([etiqueta, valor]) =>
        `<tr>` +
        `<td style="padding:3px 14px 3px 0;color:${TINTA3};white-space:nowrap;vertical-align:top;">${escapeHtml(etiqueta)}</td>` +
        `<td style="padding:3px 0;color:${TINTA};word-break:break-word;">${escapeHtml(valor)}</td>` +
        `</tr>`,
    )
    .join("");

  return `<div style="background:${CANVAS};padding:28px 12px;font-family:${MONO};font-size:13px;line-height:1.65;">
<table cellpadding="0" cellspacing="0" border="0" style="max-width:620px;margin:0 auto;width:100%;background:${PAPEL};border:1px solid ${REGLA};border-radius:8px;">
  <tr><td style="padding:9px 14px;background:${PAPEL2};border-bottom:1px solid ${REGLA};border-radius:8px 8px 0 0;">
    ${punto("#e06c60")}${punto("#e0b54c")}${punto(VERDE)}
    <span style="color:${TINTA3};font-size:12px;margin-left:8px;">pacr.es — rate limit</span>
  </td></tr>
  <tr><td style="padding:20px;">
    <div style="color:${VERDE};margin-bottom:14px;"><span style="color:${TINTA3};">$</span> bloqueo ${escapeHtml(b.nombre)} --ip ${escapeHtml(b.ip)}</div>
    <div style="color:${TINTA};margin-bottom:16px;">${ENTRADA}</div>
    <table cellpadding="0" cellspacing="0" border="0" style="font-family:${MONO};font-size:13px;line-height:1.65;">${cuerpo}</table>
    <div style="margin-top:18px;padding-top:14px;border-top:1px solid ${REGLA};color:${TINTA3};">${COMO_ABRIR}</div>
    <div style="margin-top:8px;padding:10px 12px;background:${VERDE_BG};border-left:2px solid ${VERDE};color:${VERDE2};word-break:break-all;">DEL ${escapeHtml(b.key)}</div>
  </td></tr>
</table>
</div>`;
}

/** Redacta el aviso. Separado del envío para poder leerlo sin mandar nada. */
export function redactarAviso(request: Request, b: Bloqueo): SendEmailOptions {
  const lugar = lugarDe(request);
  const texto = filas(request, b).map(([etiqueta, valor]) => `${etiqueta.padEnd(11)}${valor}`);

  return {
    subject: `Bloqueo en ${b.nombre} — ${b.ip}${lugar ? ` (${lugar})` : ""}`,
    text: `${ENTRADA}\n\n${texto.join("\n")}\n\n${COMO_ABRIR}\n  DEL ${b.key}\n`,
    html: ventana(request, b),
  };
}

export async function avisarBloqueo(request: Request, b: Bloqueo): Promise<void> {
  await sendEmail(redactarAviso(request, b));
}
