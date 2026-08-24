// El único emisor de avisos al móvil. Usa un bot propio, distinto del que atiende el canal
// de Claude Code: su token vive en el despliegue, y una filtración ahí no debe dar acceso a
// esa conversación.
//
// El texto llega listo para enviar —con su marcado HTML ya puesto—: quien lo redacta es
// quien sabe qué partes son suyas y cuáles vienen de fuera, así que es quien las escapa.

const API = "https://api.telegram.org";

/**
 * Que Telegram diga que no. **Se distingue del corte a mitad** porque son lo contrario: aquí
 * consta que el mensaje no salió, y ahí no consta nada. Quien reintente necesita saber cuál
 * de las dos le pasó.
 */
export class TelegramRechaza extends Error {}

/** Lo que se espera a que conteste. Un envío normal tarda menos de un segundo. */
const ESPERA_MS = 10_000;

export async function enviarTelegram(texto: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error("TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no están definidas — revisa las variables de entorno.");
  }

  const res = await fetch(`${API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: texto,
      parse_mode: "HTML",
      // El enlace va al final de cada aviso como referencia, no como protagonista: su tarjeta
      // de previsualización ocuparía más que el propio mensaje.
      link_preview_options: { is_disabled: true },
    }),
    // Sin tope, una respuesta que no llega tiene esperando a la función hasta que la mata la
    // plataforma, y el reintento sale minutos después de que el mensaje ya sonara.
    signal: AbortSignal.timeout(ESPERA_MS),
  });

  if (!res.ok) {
    throw new TelegramRechaza(`Telegram respondió ${res.status}: ${await res.text()}`);
  }
}
