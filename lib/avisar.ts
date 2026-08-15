// A dónde entrega QStash un aviso. Lo usa cada programador al publicar; la entrega en sí es
// `/api/avisar`.
//
// En producción, al dominio y no al origen que invoca: el cron de Vercel entra por la URL del
// despliegue, que está tras la Deployment Protection y responde 401 antes de llegar al código.
// Ese 401 no lo ve nadie —el cron ya devolvió su OK por la mañana— y el fallo se manifiesta de
// noche, como un aviso que no suena. Fuera de producción sí manda el origen, que es lo que
// permite probar un preview entero sin tocar el dominio.

const SITIO = "https://pacr.es";

export const urlDeEntrega = (request: Request): string =>
  `${process.env.VERCEL_ENV === "production" ? SITIO : new URL(request.url).origin}/api/avisar`;
