import { Resend } from "resend";

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

/**
 * Envía un email de notificación. En desarrollo no envía nada (mantiene la
 * lógica original de los routes). Nunca lanza: registra el error y sigue, para
 * que un fallo de Resend no tumbe el guardado del resultado.
 */
export async function sendEmail({ subject, text, html }: SendEmailOptions): Promise<void> {
  if (process.env.NODE_ENV === "development") return;
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
    if (error) console.error(`Resend rechazó (${subject}):`, error);
  } catch (err) {
    console.error(`Resend error (${subject}):`, err);
  }
}
