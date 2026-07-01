// Superficie común de las pantallas de admin de María: fondo claro y ancho
// contenido acotado (el mismo estilo de siempre). La landing /farma (Prioridades,
// skin UnycopWin) trae su propio fondo a pantalla completa.
export default function MariaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 px-5 py-8">
      <div className="mx-auto w-full max-w-3xl">{children}</div>
    </div>
  );
}
