// Lo común de los avisos al móvil: a dónde los entrega QStash y cómo se comprueba que quien
// llama es QStash. Lo usa cada programador al publicar; entregar es `/api/avisar` y contar lo
// que no se entregó, `/api/avisar/fallo`.
//
// En producción se publica al dominio y no al origen que invoca: el cron de Vercel entra por la
// URL del despliegue, que está tras la Deployment Protection y responde 401 antes de llegar al
// código. Ese 401 no lo ve nadie —quien programa ya devolvió su OK por la mañana— y el fallo se
// manifiesta de noche, como un aviso que no suena. Fuera de producción manda el origen, que es
// lo que permite probar un preview entero sin tocar el dominio.

import { Receiver } from "@upstash/qstash";
import redis from "./redis";
import { enviarTelegram, TelegramRechaza } from "./telegram";

const SITIO = "https://pacr.es";

const origen = (request: Request): string =>
  process.env.VERCEL_ENV === "production" ? SITIO : new URL(request.url).origin;

export const urlDeEntrega = (request: Request): string => `${origen(request)}/api/avisar`;

export const urlDeFallo = (request: Request): string => `${origen(request)}/api/avisar/fallo`;

/**
 * El cuerpo crudo de la petición si viene firmada por QStash, y `null` si no. Crudo porque la
 * firma cubre los bytes tal cual llegaron, no el objeto parseado.
 *
 * Se comprueba en un solo sitio, como los secretos: sin firma, estas rutas son un megáfono a mi
 * móvil para cualquiera que las descubra, y una segunda copia de la comprobación es una que un
 * día deja de verificar sin que nada falle.
 */
export async function cuerpoFirmado(request: Request): Promise<string | null> {
  const { QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY } = process.env;
  if (!QSTASH_CURRENT_SIGNING_KEY || !QSTASH_NEXT_SIGNING_KEY) {
    throw new Error("Las claves de firma de QStash no están definidas — revisa las variables de entorno.");
  }

  const firma = request.headers.get("upstash-signature");
  if (!firma) return null;

  const cuerpo = await request.text();
  const receptor = new Receiver({
    currentSigningKey: QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: QSTASH_NEXT_SIGNING_KEY,
  });
  try {
    await receptor.verify({ signature: firma, body: cuerpo });
  } catch {
    return null;
  }
  return cuerpo;
}

/** Lo que se recuerda de un aviso ya dado. Los reintentos duran minutos; un día sobra. */
const RECUERDO_S = 60 * 60 * 24;

/**
 * Manda un aviso al móvil, y solo una vez. Devuelve si ha sonado o si era un repetido.
 *
 * QStash reintenta mientras no reciba un OK, y una entrega que se corta con el mensaje ya en el
 * móvil es indistinguible de una que no salió: por eso el reparto **se apunta antes de mandar**
 * y el reintento que se encuentra la marca puesta calla. La marca solo se levanta cuando consta
 * que Telegram dijo que no, que es el único caso en que se sabe que no sonó. A cambio, un aviso
 * cortado a mitad puede perderse: tres vibraciones seguidas molestan más que una que falta.
 *
 * Vive aquí y no en cada ruta porque son dos las que hablan por este canal —la entrega y el
 * fallo— y las dos las reintenta QStash. Una segunda copia de esto es una que un día deja de
 * proteger sin que nada falle.
 */
export async function avisarUnaVez(id: string, texto: string): Promise<boolean> {
  const marca = `avisar:dado:${id}`;
  if ((await redis.set(marca, "1", "EX", RECUERDO_S, "NX")) === null) return false;
  try {
    await enviarTelegram(texto);
  } catch (error) {
    if (error instanceof TelegramRechaza) await redis.del(marca);
    throw error;
  }
  return true;
}
