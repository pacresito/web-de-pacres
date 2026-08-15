import { tieneSesion } from "../auth";
import LoginForm from "../LoginForm";
import Vertical from "./Vertical";
import redis from "@/lib/redis";
import { KEYS } from "@/lib/arbol/keys";
import type { ArbolData } from "@/lib/arbol/tree";

export default async function ArbolVerticalPage() {
  const auth = await tieneSesion();
  if (!auth) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <LoginForm />
      </div>
    );
  }

  const raw = await redis.get(KEYS.datos());
  const data: ArbolData = raw ? JSON.parse(raw) : { people: [], unions: [], roots: {} };
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });

  return <Vertical data={data} hoy={hoy} />;
}
