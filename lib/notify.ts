import { Resend } from "resend";
import { enviarTelegram } from "./telegram";

// Destinatario y remitente de las notificaciones por email. Antes estaban
// repetidos en cada route; ahora viven aquí (con override por env opcional).
const NOTIFY_TO = process.env.NOTIFY_TO ?? "pacres.g@gmail.com";
const NOTIFY_FROM = process.env.NOTIFY_FROM ?? "Web de Pacres <hola@pacr.es>";

export interface SendEmailOptions {
  subject: string;
  text: string;
  html?: string;
}

const ENTIDADES: Record<string, string> = {
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
};

/** Escapa un dato que llega de fuera antes de meterlo en el HTML de un email. Aquí no
 *  hay React que escape por nosotros: lo que teclea quien registra una partida entra
 *  crudo en el marcado. */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ENTIDADES[c]);
}

/** Telegram corta por encima de 4096 caracteres, y con el aviso partido en dos mensajes el
 *  segundo llega sin contexto. Ninguno de estos emails se acerca; el tope es para el día que
 *  alguno crezca. */
const TOPE_TELEGRAM = 3500;

/**
 * El email que no salió, al móvil. **Es la única forma de enterarse de que había un email que
 * debía llegar**: un buzón vacío es indistinguible de un día sin nada que contar, y el fallo
 * escrito en los logs de Vercel no lo lee nadie. Va por un canal aparte —otro proveedor, otra
 * red—, así que para no enterarse tienen que caerse los dos a la vez.
 *
 * Lleva el contenido dentro y no un «ha fallado»: si el email no llegó, este mensaje **es** el
 * email. Y lleva el asunto en negrita porque lo primero que hay que saber es de qué iba, no que
 * el correo esté roto — eso ya lo dice el encabezado.
 */
async function alMovil(subject: string, text: string, motivo: unknown): Promise<void> {
  const cuerpo = text.length > TOPE_TELEGRAM ? `${text.slice(0, TOPE_TELEGRAM)}…` : text;
  try {
    await enviarTelegram(
      `⚠️ <b>Un email no ha salido</b> ⚠️\nDecía esto:\n\n<b>${escapeHtml(subject)}</b>\n\n${escapeHtml(cuerpo)}`,
    );
  } catch (err) {
    // Los dos canales caídos a la vez. Aquí ya no queda a quién avisar: lo que queda es que
    // el log cuente los dos motivos juntos, que por separado no dicen qué pasó.
    console.error(`Ni email ni Telegram (${subject}):`, { email: motivo, telegram: err });
  }
}

/**
 * Envía un email de notificación. En desarrollo no envía nada (mantiene la
 * lógica original de los routes). Nunca lanza: registra el error y sigue, para
 * que un fallo de Resend no tumbe el guardado del resultado — y lo que no sale
 * por email sale por el móvil.
 */
export async function sendEmail({ subject, text, html }: SendEmailOptions): Promise<void> {
  if (process.env.NODE_ENV === "development") return;
  let motivo: unknown;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    // Resend no lanza cuando rechaza el envío: devuelve el fallo en `error` y un `data` nulo.
    // Sin mirarlo, un email que no sale se ve exactamente igual que uno que sí.
    const { error } = await resend.emails.send({
      from: NOTIFY_FROM,
      to: NOTIFY_TO,
      subject,
      text,
      ...(html ? { html } : {}),
    });
    if (!error) return;
    motivo = error;
    console.error(`Resend rechazó (${subject}):`, error);
  } catch (err) {
    motivo = err;
    console.error(`Resend error (${subject}):`, err);
  }
  await alMovil(subject, text, motivo);
}
