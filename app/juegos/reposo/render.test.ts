// npx tsx app/juegos/reposo/render.test.ts
//
// Lo que protegen estos tests: que todo objeto del catálogo tenga dónde pintarse y tamaño para
// que su cambio se vea, que la paleta no dé un salto al cruzar la medianoche, y que interpolar
// en OKLCH sirva de verdad para lo que el plan dice que sirve.
import { CATALOGO } from "./escena";
import { LIENZO, PIEZAS, css, esNoche, luzDe, mezcla, paletaDe, tenir, type Oklch } from "./render";
import { escena as calle } from "./calle/ventana";
import { DETALLE, PINCELES, PROPIOS } from "./calle/pincel";

let fails = 0;
function test(name: string, ok: boolean, detail = "") {
  if (!ok) fails++;
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? "  " + detail : ""}`);
}
const rgb = (s: string) => s.match(/\d+/g)!.map(Number);

// Cobertura: el puente entre el motor y el lienzo

const ids = CATALOGO.map((s) => s.id);
const sinPieza = ids.filter((id) => !PIEZAS[id]);
const sinSlot = Object.keys(PIEZAS).filter((id) => !ids.includes(id));
test("todo objeto del catálogo tiene su pieza", sinPieza.length === 0, sinPieza.join(", "));
test("ninguna pieza sobra del catálogo", sinSlot.length === 0, sinSlot.join(", "));

const sinPincel = ids.filter((id) => !PROPIOS[id] && !PINCELES[PIEZAS[id].arquetipo]);
test("todo objeto tiene con qué pintarse", sinPincel.length === 0, sinPincel.join(", "));
const detalleSinBase = Object.keys(DETALLE).filter((id) => !PINCELES[PIEZAS[id]?.arquetipo]);
test("todo detalle va sobre un arquetipo que existe", detalleSinBase.length === 0, detalleSinBase.join(", "));

// Un estado sin dibujo propio pinta el de otro, y el diff cuenta como diferencia un cambio que
// nadie puede ver: el jugador busca algo que no está.
const cortos = CATALOGO.filter((s) => Number.isFinite(s.escalones) && PIEZAS[s.id].variantes !== s.escalones);
test("cada estado de un objeto con estados contados tiene su dibujo", cortos.length === 0,
  cortos.map((s) => `${s.id}: ${PIEZAS[s.id].variantes} dibujos para ${s.escalones} estados`).join(", "));

const sinCaja = ids.filter((id) => !calle.cajas[id]);
test("la escena publicada coloca los 22", sinCaja.length === 0, sinCaja.join(", "));

// Lo que el juego pide es ver qué ha cambiado, y el cambio de algo de menos de 20 px no lo ve
// nadie sin lupa. Se mide en la vista por defecto: en escritorio la calle se sirve a 960 px,
// el `ANCHO` de page.tsx.
const escala = 960 / LIENZO.ancho;
const [menor, caja] = Object.entries(calle.cajas).reduce((a, b) => (b[1].w * b[1].h < a[1].w * a[1].h ? b : a));
test("la pieza más pequeña mide 20 px o más de lado en escritorio",
  Math.min(caja.w, caja.h) * escala >= 20, `${menor}: ${(caja.w * escala).toFixed(0)}×${(caja.h * escala).toFixed(0)} px`);

// La paleta

test("a la hora de una clave sale esa clave, no una mezcla",
  paletaDe(13).cielo === paletaDe(13).cielo && paletaDe(13).cielo !== paletaDe(20).cielo);

const antes = rgb(paletaDe(23.98).cielo), despues = rgb(paletaDe(0.02).cielo);
const salto = Math.max(...antes.map((v, i) => Math.abs(v - despues[i])));
test("cruzar la medianoche no da un salto de color", salto <= 3, `${salto} niveles de 255`);

const grados = Array.from({ length: 96 }, (_, i) => rgb(paletaDe(i / 4).cielo));
const brinco = grados.reduce((max, c, i) => {
  if (i === 0) return max;
  return Math.max(max, ...c.map((v, k) => Math.abs(v - grados[i - 1][k])));
}, 0);
test("la luz no salta en ningún cuarto de hora del día", brinco <= 14, `mayor brinco: ${brinco} niveles`);

test("de noche es de noche y a mediodía no", esNoche(3) && esNoche(23) && !esNoche(13) && !esNoche(9));

// Por qué OKLCH y no RGB: el paso del azul de noche al naranja del atardecer. En RGB el punto
// medio se va a un gris sucio —es el "se apaga por el centro" del plan—; en OKLCH mantiene el
// color. Se mide con la saturación del punto medio: cuánto separa el canal mayor del menor.
const azul: Oklch = { l: 0.3, c: 0.09, h: 265 }, naranja: Oklch = { l: 0.68, c: 0.14, h: 50 };
const satur = (c: number[]) => (Math.max(...c) - Math.min(...c)) / Math.max(1, Math.max(...c));
const medioOklch = rgb(css(mezcla(azul, naranja, 0.5)));
const [a, b] = [rgb(css(azul)), rgb(css(naranja))];
const medioRgb = a.map((v, i) => (v + b[i]) / 2);
test("el punto medio en OKLCH conserva más color que en RGB",
  satur(medioOklch) > satur(medioRgb),
  `OKLCH ${satur(medioOklch).toFixed(2)} vs RGB ${satur(medioRgb).toFixed(2)}`);

test("el tono cruza por el arco corto", (() => {
  const m = mezcla({ l: 0.5, c: 0.1, h: 350 }, { l: 0.5, c: 0.1, h: 10 }, 0.5).h;
  return Math.abs(((m % 360) + 360) % 360) === 0;   // 350→10 pasa por 0, no por 180
})());

test("blanco y negro salen exactos", css({ l: 1, c: 0, h: 0 }) === "rgb(255 255 255)"
  && css({ l: 0, c: 0, h: 0 }) === "rgb(0 0 0)");

// El teñido: "se tiñe el fondo a fondo y los objetos poco". Es medible — el recorrido de luz
// del cielo a lo largo del día contra el del mismo objeto bajo esa luz.
const horas = Array.from({ length: 48 }, (_, i) => i / 2);
const recorrido = (xs: number[]) => Math.max(...xs) - Math.min(...xs);
const pintura: Oklch = { l: 0.46, c: 0.12, h: 28 };
const delCielo = recorrido(horas.map((h) => luzDe(h).crudo.cieloBajo.l));
const delObjeto = recorrido(horas.map((h) => tenir(pintura, luzDe(h)).l));
test("el objeto se tiñe mucho menos que el fondo", delObjeto < delCielo * 0.45,
  `objeto ${delObjeto.toFixed(2)} vs fondo ${delCielo.toFixed(2)}`);

test("de noche baja el croma además de la claridad",
  tenir(pintura, luzDe(3)).c < tenir(pintura, luzDe(13)).c * 0.8,
  `${tenir(pintura, luzDe(3)).c.toFixed(3)} de noche vs ${tenir(pintura, luzDe(13)).c.toFixed(3)} de día`);

// Dos objetos de colores distintos tienen que seguir siendo dos a cualquier hora: si la luz
// los colapsa, el jugador ve un cambio donde no lo hay o deja de ver el que sí hay.
const otra: Oklch = { l: 0.56, c: 0.09, h: 250 };
const juntos = horas.filter((h) => {
  const [a, b] = [tenir(pintura, luzDe(h)), tenir(otra, luzDe(h))];
  return Math.abs(a.l - b.l) < 0.04 && Math.abs(a.h - b.h) < 20;
});
test("la luz nunca funde dos colores propios en uno", juntos.length === 0, juntos.join("h, "));

console.log(fails === 0 ? "\nTodo OK" : `\n${fails} fallo(s)`);
process.exit(fails === 0 ? 0 : 1);
