import Header from "./Header";

// Superficie común de las pantallas de admin de María: sistema de diseño farma-admin
// (.fa-admin, IBM Plex + acento azul) con la cabecera sticky compartida. La landing
// /farma (Prioridades, skin UnycopWin) trae su propio fondo aparte.
export default function MariaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fa-admin">
      <Header />
      <div className="mx-auto w-full max-w-[1360px]">{children}</div>
    </div>
  );
}
