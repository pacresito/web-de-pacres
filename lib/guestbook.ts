// Backend del libro de firmas (guestbook). Las firmas se publican al instante;
// cada una guarda un id aleatorio que sirve a la vez de handle de moderación y de
// token del enlace «ocultar» del email. El GET público nunca expone el id.
import { randomUUID } from "crypto";
import redis from "./redis";

const KEY = process.env.NODE_ENV === "development" ? "guestbook-dev" : "guestbook";

// Duplicados a propósito en el front (la página es client y no puede importar este
// módulo, que arrastra ioredis). Si cambian, ajustar también app/guestbook/page.tsx.
export const NAME_MAX = 50;
export const MESSAGE_MAX = 500;

export interface Entry {
  id: string;
  name: string;
  message: string;
  date: string; // YYYY-MM-DD, para mostrar
  ts: number; // epoch ms, para ordenar
  hidden: boolean;
}

export type PublicEntry = Pick<Entry, "name" | "message" | "date">;

function parse(raw: string): Entry | null {
  try {
    return JSON.parse(raw) as Entry;
  } catch {
    return null;
  }
}

/** Todas las entradas del hash, más recientes primero. */
async function readAll(): Promise<Entry[]> {
  const map = await redis.hgetall(KEY);
  return Object.values(map)
    .map(parse)
    .filter((e): e is Entry => e !== null)
    .sort((a, b) => b.ts - a.ts);
}

/** Crea una firma (visible por defecto) y devuelve la entrada con su id. */
export async function addEntry(name: string, message: string): Promise<Entry> {
  const now = new Date();
  const entry: Entry = {
    id: randomUUID(),
    name,
    message,
    date: now.toISOString().slice(0, 10),
    ts: now.getTime(),
    hidden: false,
  };
  await redis.hset(KEY, entry.id, JSON.stringify(entry));
  return entry;
}

/** Firmas públicas (no ocultas), más recientes primero. Sin el id. */
export async function listVisible(): Promise<PublicEntry[]> {
  const all = await readAll();
  return all.filter((e) => !e.hidden).map(({ name, message, date }) => ({ name, message, date }));
}

/** Todas las firmas (incluidas las ocultas) para el panel de moderación. */
export async function listAll(): Promise<Entry[]> {
  return readAll();
}

/** Oculta o muestra una firma por id. Devuelve false si no existe. */
export async function setHidden(id: string, hidden: boolean): Promise<boolean> {
  const raw = await redis.hget(KEY, id);
  if (!raw) return false;
  const entry = parse(raw);
  if (!entry) return false;
  entry.hidden = hidden;
  await redis.hset(KEY, id, JSON.stringify(entry));
  return true;
}

/** Borra una firma definitivamente. */
export async function remove(id: string): Promise<void> {
  await redis.hdel(KEY, id);
}
