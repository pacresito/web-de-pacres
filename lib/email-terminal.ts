// La ventana de terminal del sitio, en HTML de email: la comparten todos los avisos que
// manda pacr.es. Un email no lee la hoja de estilos de nadie, y la mitad de los clientes
// tampoco leen una `<style>` — así que la paleta va copiada a mano de `globals.css` en
// valores literales y todo se pinta con atributos `style` sobre tablas, como en 2005.
import { escapeHtml, type SendEmailOptions } from "./notify";

const PAPEL = "#fafaf7", PAPEL2 = "#f4f1ea", CANVAS = "#ece9e0";
const TINTA = "#16140f", TINTA3 = "#7a766b", REGLA = "#d9d4c7";
const VERDE = "#00b87a", VERDE2 = "#009764", VERDE_BG = "#e8faf1";
const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export interface Ventana {
  /** Lo que va en la barra de la ventana, tras «pacr.es — ». */
  titulo: string;
  /** La línea del prompt: lo que se habría tecleado para provocar esto. */
  comando: string;
  /** La frase que abre el cuerpo y dice qué ha pasado. */
  entrada: string;
  /** Los datos, en pares. Un dato que no ha llegado se pasa nulo y se cae de la lista, en
   *  vez de dejar su etiqueta con el hueco detrás, que se lee como un dato perdido. */
  filas?: [string, string | null | undefined][];
  /** Lo que introduce al bloque destacado. */
  nota?: string;
  /** El bloque destacado: un comando que copiar, una cita, lo que importe de verdad. */
  bloque?: string;
  /** Botones al pie, `[texto, url]`. */
  enlaces?: [string, string][];
}

const punto = (color: string) =>
  `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${color};margin-right:5px;"></span>`;

function filasVisibles(v: Ventana): [string, string][] {
  return (v.filas ?? []).filter((p): p is [string, string] => Boolean(p[1]));
}

function html(v: Ventana): string {
  const filas = filasVisibles(v)
    .map(
      ([etiqueta, valor]) =>
        `<tr>` +
        `<td style="padding:3px 14px 3px 0;color:${TINTA3};white-space:nowrap;vertical-align:top;">${escapeHtml(etiqueta)}</td>` +
        `<td style="padding:3px 0;color:${TINTA};word-break:break-word;">${escapeHtml(valor)}</td>` +
        `</tr>`,
    )
    .join("");

  const nota = v.nota
    ? `<div style="margin-top:18px;padding-top:14px;border-top:1px solid ${REGLA};color:${TINTA3};">${escapeHtml(v.nota)}</div>`
    : "";
  const bloque = v.bloque
    ? `<div style="margin-top:8px;padding:10px 12px;background:${VERDE_BG};border-left:2px solid ${VERDE};color:${VERDE2};word-break:break-word;white-space:pre-wrap;">${escapeHtml(v.bloque)}</div>`
    : "";
  const enlaces = (v.enlaces ?? [])
    .map(
      ([texto, url]) =>
        `<a href="${escapeHtml(url)}" style="display:inline-block;margin:10px 8px 0 0;padding:8px 14px;background:${VERDE};color:${PAPEL};text-decoration:none;border-radius:4px;font-family:${MONO};font-size:13px;">${escapeHtml(texto)} ›</a>`,
    )
    .join("");

  return `<div style="background:${CANVAS};padding:28px 12px;font-family:${MONO};font-size:13px;line-height:1.65;">
<table cellpadding="0" cellspacing="0" border="0" style="max-width:620px;margin:0 auto;width:100%;background:${PAPEL};border:1px solid ${REGLA};border-radius:8px;">
  <tr><td style="padding:9px 14px;background:${PAPEL2};border-bottom:1px solid ${REGLA};border-radius:8px 8px 0 0;">
    ${punto("#e06c60")}${punto("#e0b54c")}${punto(VERDE)}
    <span style="color:${TINTA3};font-size:12px;margin-left:8px;">pacr.es — ${escapeHtml(v.titulo)}</span>
  </td></tr>
  <tr><td style="padding:20px;">
    <div style="color:${VERDE};margin-bottom:14px;"><span style="color:${TINTA3};">$</span> ${escapeHtml(v.comando)}</div>
    <div style="color:${TINTA};margin-bottom:16px;">${escapeHtml(v.entrada)}</div>
    <table cellpadding="0" cellspacing="0" border="0" style="font-family:${MONO};font-size:13px;line-height:1.65;">${filas}</table>
    ${nota}${bloque}${enlaces}
  </td></tr>
</table>
</div>`;
}

function texto(v: Ventana): string {
  const filas = filasVisibles(v);
  // La columna de valores arranca dos espacios después de la etiqueta más larga: alineada
  // a mano, porque el que lee esto es quien tiene el HTML apagado y no hay tabla que valga.
  const ancho = Math.max(0, ...filas.map(([etiqueta]) => etiqueta.length)) + 2;

  const partes = [
    v.entrada,
    filas.map(([etiqueta, valor]) => `${etiqueta.padEnd(ancho)}${valor}`).join("\n"),
    v.nota || v.bloque ? [v.nota, v.bloque && `  ${v.bloque}`].filter(Boolean).join("\n") : "",
    (v.enlaces ?? []).map(([t, url]) => `${t}: ${url}`).join("\n"),
  ];
  return `${partes.filter(Boolean).join("\n\n")}\n`;
}

/**
 * Redacta el email completo: la ventana y su versión en texto salen de la **misma**
 * descripción, así que un dato nuevo aparece en las dos o en ninguna. Redactar y enviar van
 * separados a propósito — así el email se lee (y se mira en el navegador) sin mandar nada.
 */
export function emailTerminal(subject: string, v: Ventana): SendEmailOptions {
  return { subject, text: texto(v), html: html(v) };
}
