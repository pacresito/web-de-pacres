// Lógica compartida entre los rankings de Espiral y Laberinto
export function parseEntry(member: string, score: number) {
  try {
    const parsed = JSON.parse(member);
    return { name: parsed.name ?? member, date: parsed.date ?? null, score };
  } catch {
    return { name: member, date: null, score };
  }
}
