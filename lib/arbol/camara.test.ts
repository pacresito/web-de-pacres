// Test de lógica pura: `npx tsx lib/arbol/camara.test.ts`. Fuera del build.
// No lee datos: la cámara solo sabe de una caja y un hueco.
import assert from "assert";
import { acotar, brujulaDe, conZoom, ESCALA_MAX, ESCALA_MIN, type Encuadre, type Vista } from "./camara";
import { ANCHO_NODO } from "./layout";

const caja = (x: number, y: number, w: number, h: number) =>
  ({ left: x, top: y, width: w, height: h }) as DOMRect;

/** Un árbol de 1000×600 con el ancla en su esquina superior izquierda, y un hueco de 400×300. */
const encuadre: Encuadre = {
  ancla: { x: 0, y: 0 },
  limites: { minX: 0, maxX: 1000, minY: 0, maxY: 600 },
  w: 400,
  h: 300,
};
const vista = (dx: number, dy: number, escala = 1): Vista => ({ dx, dy, escala });

// --- El tope: el centro de la pantalla no sale de la caja ---
{
  assert.deepStrictEqual(acotar(vista(9999, 9999), encuadre), vista(1000, 600));
  assert.deepStrictEqual(acotar(vista(-9999, -9999), encuadre), vista(0, 0));
  // Dentro de la caja no se toca nada, y se devuelve la misma vista para ahorrar el render.
  const dentro = vista(500, 300);
  assert.strictEqual(acotar(dentro, encuadre), dentro);
}

// En el tope sigue habiendo árbol en pantalla: media pantalla de caja en cada eje.
{
  const { dx, dy, escala } = acotar(vista(9999, 9999), encuadre);
  const visible = { x: [dx - 200 / escala, dx + 200 / escala], y: [dy - 150 / escala, dy + 150 / escala] };
  assert.ok(visible.x[0] < 1000 - 199 && visible.y[0] < 600 - 149, "el cuadrante que mira al árbol se queda vacío");
}

// Alejarse ensancha lo visible, así que el tope cede: la caja llega antes al centro.
{
  assert.deepStrictEqual(acotar(vista(9999, 9999, 0.5), encuadre), vista(1000, 600, 0.5));
  assert.deepStrictEqual(acotar(vista(9999, 9999, 4), encuadre), vista(1000, 600, 4));
}

// --- Un árbol más pequeño que el hueco no se sale por ningún borde ---
{
  const menudo: Encuadre = { ...encuadre, limites: { minX: 0, maxX: 100, minY: 0, maxY: 60 } };
  // Hueco de 400×300 y caja de 100×60: el centro llega hasta pegar la caja al borde
  // contrario, ni un píxel más —200 y 150 por un lado, −100 y −90 por el otro—.
  assert.deepStrictEqual(acotar(vista(9999, 9999), menudo), vista(200, 150));
  assert.deepStrictEqual(acotar(vista(-9999, -9999), menudo), vista(-100, -90));
}

// El ancla se descuenta: la vista es relativa a ella, el tope es absoluto.
{
  const movido: Encuadre = { ...encuadre, ancla: { x: 400, y: 250 } };
  assert.deepStrictEqual(acotar(vista(9999, 9999), movido), vista(600, 350));
  assert.deepStrictEqual(acotar(vista(-9999, -9999), movido), vista(-400, -250));
}

// Sin hueco medido (la primera carga) no se acota nada.
{
  const sinMedir: Encuadre = { ...encuadre, w: 0, h: 0 };
  const suelta = vista(9999, 9999);
  assert.strictEqual(acotar(suelta, sinMedir), suelta);
}

// --- El zoom deja quieto el punto que hay bajo el cursor ---
{
  const rect = caja(0, 0, 400, 300);
  // En el centro exacto del hueco, acercarse no mueve la vista.
  const centrado = conZoom(vista(10, 20), 2, 200, 150, rect);
  assert.deepStrictEqual(centrado, vista(10, 20, 2));
  // A 100px del centro y al doble de escala, el desfase es esos 100px de la mitad que sobra.
  assert.deepStrictEqual(conZoom(vista(0, 0), 2, 300, 150, rect), vista(50, 0, 2));
  // Y los topes de escala se respetan (con la escala clavada, la vista no se toca).
  assert.strictEqual(conZoom(vista(0, 0, ESCALA_MAX), 2, 300, 150, rect).escala, ESCALA_MAX);
  assert.strictEqual(conZoom(vista(0, 0, ESCALA_MIN), 0.1, 300, 150, rect).escala, ESCALA_MIN);
  const tope = vista(7, 7, ESCALA_MAX);
  assert.strictEqual(conZoom(tope, 2, 300, 150, rect), tope);
}

// --- La brújula: solo cuando el punto de vista ya no se ve, y apuntándole ---
{
  const hueco = { w: 800, h: 600 };
  const brujula = (dx: number, dy: number, escala = 1) => brujulaDe(vista(dx, dy, escala), hueco.w, hueco.h);

  // Centrado, y arrastrado hasta dejarlo justo asomando por el borde: no hay brújula.
  assert.strictEqual(brujula(0, 0), null);
  assert.strictEqual(brujula(400 + ANCHO_NODO / 2 - 1, 0), null);
  // Un píxel más y ya no se ve: asoma por la izquierda, porque el árbol se fue a la izquierda.
  const izquierda = brujula(400 + ANCHO_NODO / 2 + 1, 0);
  assert.ok(izquierda && izquierda.x < 100 && izquierda.y === 300, "no asoma por la izquierda");

  // Y por cada lado el suyo: arrastrar hacia arriba deja al punto de vista abajo.
  // El ángulo se lee como dirección: atan2 saca −0 y ±180 para las mismas dos.
  const rumbo = (dx: number, dy: number) => Math.abs(brujula(dx, dy)!.angulo) || 0;
  assert.strictEqual(rumbo(400 + ANCHO_NODO / 2 + 1, 0), 180);
  assert.strictEqual(rumbo(-9999, 0), 0);
  assert.strictEqual(brujula(0, -9999)!.angulo, 90);
  assert.strictEqual(brujula(0, 9999)!.angulo, -90);
  assert.strictEqual(brujula(-9999, -9999)!.angulo, 45); // abajo a la derecha, en diagonal

  // Siempre dentro del hueco, y separada del borde para no pisar recuento ni botones.
  for (const [dx, dy] of [
    [9999, 9999],
    [-9999, 9999],
    [9999, -9999],
    [-9999, -9999],
    [0, 9999],
    [9999, 0],
  ]) {
    const r = brujulaDe(vista(dx, dy), hueco.w, hueco.h)!;
    assert.ok(Math.round(r.x) >= 56 && Math.round(r.x) <= hueco.w - 56, `se sale por el lado: ${r.x}`);
    assert.ok(Math.round(r.y) >= 72 && Math.round(r.y) <= hueco.h - 72, `se sale por arriba o abajo: ${r.y}`);
  }

  // Alejarse encoge el nodo, así que se pierde de vista con menos arrastre en pantalla:
  // los mismos 450 px sacan brújula a escala 0,25 y no la sacan a escala 1.
  assert.strictEqual(brujula(450, 0), null);
  assert.ok(brujula(450 / 0.25, 0, 0.25), "a escala 0,25 debería haber brújula");

  // Sin hueco medido (la primera carga) no hay dónde ponerla.
  assert.strictEqual(brujulaDe(vista(9999, 9999), 0, 0), null);
}

console.log("camara: ok");
