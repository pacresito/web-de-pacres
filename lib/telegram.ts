// El único emisor de avisos al móvil. Usa un bot propio, distinto del que atiende el canal
// de Claude Code: su token vive en el despliegue, y una filtración ahí no debe dar acceso a
// esa conversación.
//
// El texto llega listo para enviar —con su marcado HTML ya puesto—: quien lo redacta es
// quien sabe qué partes son suyas y cuáles vienen de fuera, así que es quien las escapa.

const API = "https://api.telegram.org";

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
  });

  if (!res.ok) {
    throw new Error(`Telegram respondió ${res.status}: ${await res.text()}`);
  }
}
