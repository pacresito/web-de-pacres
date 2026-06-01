export default function ManifestoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Las fuentes (Instrument Serif, IBM Plex Sans/Mono) las provee el layout raíz
  // vía variables en <html>; aquí solo aportamos el alto mínimo de la sección.
  return <div style={{ minHeight: "100vh" }}>{children}</div>;
}
