import { ImageResponse } from "next/og";

// El icono del acceso directo en la pantalla de inicio, para todo el sitio. **No es el favicon
// grande:** son dos usos distintos y por eso son dos archivos. El de la pestaña (`icon.tsx`) mide
// 32 y se ve a tamaño de letra; este lo pinta el lanzador del móvil a 192, y con solo 32 en la
// página Chrome no tiene de dónde sacarlo — descarta lo pequeño y dibuja en su lugar un cuadro
// gris con la inicial, que es lo que sale cuando parece que la web "no tiene icono".
//
// 192 y no los 180 canónicos de Apple: iOS escala sin quejarse y es el tamaño por debajo del cual
// Chrome empieza a preferir su propio dibujo. Sin esquinas redondeadas — el sistema aplica su
// máscara encima, y redondear aquí deja el borde doble. El `viewBox` va ceñido al corazón y no al
// lienzo de 24 en que está dibujado: sin ceñirlo, el aire que le sobra al trazado se cuela como
// margen y el dibujo sale pequeño por mucho que se suba el `width`.
//
// **Y va anclado abajo, no centrado.** Centrado deja el mismo hueco arriba que abajo y aun así se
// ve apretado por arriba: el corazón acaba en punta abajo y en dos lóbulos anchos y planos
// arriba, así que la misma distancia no pesa lo mismo en los dos sitios. El hueco de abajo es el
// que manda —15, que es el que se ve bien— y lo que sobra cae arriba.
//
// La portada lo sobrescribe con el naranja, igual que hace con el favicon.
export const size = { width: 192, height: 192 };
export const contentType = "image/png";

const ABAJO = 15;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          background: "#ffffff",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", marginBottom: ABAJO }}>
          {/* 164×150 es el corazón entero: la caja mide lo que el dibujo, así que no le queda
              holgura dentro que descuadre el anclaje. */}
          <svg width="164" height="150" viewBox="2 3 20 18.35" fill="#00b87a">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
      </div>
    ),
    { ...size }
  );
}
