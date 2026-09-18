// Las fotos de la familia: quién sale en cada una, dónde está su cara, cómo se llaman al
// descargarlas y cómo se piden. Puro: `npx tsx lib/arbol/fotos.test.ts`.
//
// **Aquí no hay ninguna URL.** Los archivos viven en una store privada de Vercel Blob —el
// repo es público y esto son caras— y solo los sirve `/arbol/api/foto`, detrás de la misma
// cookie que el resto del árbol. Filtrar este archivo no enseña una foto a nadie.
//
// Y no viven en `arbol.json` porque una foto no es un dato del documento: no venía en los
// Word, como no venía el santo. Además así subir una foto es un push, y no un resembrado de
// Redis en dev y en prod.
//
// **Una foto no es de uno: es de los que salen en ella.** El archivo se guarda una vez y cada
// uno la enseña por su recuadro, así que una foto de diez primos no son diez copias ni diez
// recortes — es la misma cara vista desde diez fichas.
//
// **Cada id lleva el nombre al lado y el test comprueba que sigue siendo quien dice ser**:
// los ids del árbol cuentan apariciones y no gente, y una foto colgada de quien no es no la
// ve venir nadie.

import { añoDe, edadEntre, type Fecha } from "./fechas";

/**
 * Qué cuadrado de la foto se enseña en el marco, **en fracciones del ancho de la foto** —los
 * dos ejes en la misma unidad, porque el recuadro es cuadrado y así no hace falta saber el
 * alto para colocarlo, ni volver a medir nada el día que se resuba la foto mejor escaneada—.
 * Sin él, el marco enseña el centro, que es lo que sale bien cuando la foto ya venía
 * recortada y mal cuando la cara no está en medio.
 */
export interface Recuadro {
  /** Su borde izquierdo, desde el de la foto. */
  x: number;
  /** Su borde superior, desde el de la foto. */
  y: number;
  /** Su lado. 1 es el ancho entero. */
  lado: number;
}

/** Uno de los que salen en una foto, y dónde está su cara. */
export interface Aparicion {
  id: string;
  /** Su nombre, para poder leer esta lista. Manda el id; el test vigila que concuerden. */
  nombre: string;
  /** Qué trozo se enseña en su ficha, si no vale el centro. */
  recuadro?: Recuadro;
}

export interface Foto {
  /**
   * Cómo se llama la foto **cuando no es de uno solo**: «La Venta de La Paloma». Una foto de
   * diez no puede llamarse por su dueño porque no lo tiene, así que se la llama por donde se
   * hizo, que es como la nombra la familia. De aquí salen su clave y el nombre con el que se
   * descarga: **cambiarlo es cambiar la clave, y obliga a resubir el archivo**.
   */
  titulo?: string;
  /**
   * Cuándo se tomó, con la precisión que se sepa: `"1975"`, `"1975-08"` o la fecha entera.
   * **Es el único dato que se apunta**: la edad de la foto se calcula, porque dos datos que
   * dicen lo mismo acaban contradiciéndose. Con solo el año la cuenta puede fallar por uno,
   * y por eso se escribe el mes cuando se sabe.
   */
  tomada: Fecha;
  /** Quiénes salen. El primero es el dueño de la clave cuando la foto no tiene título. */
  gente: Aparicion[];
}

export const FOTOS: Foto[] = [
  {
    titulo: "La Venta de La Paloma",
    tomada: "1962",
    // Los recuadros salen de medir sobre el escaneo de 1184 px de ancho; en fracciones, así
    // que un escaneo mejor de la misma copia los hereda sin volver a medir.
    gente: [
      { id: "p271", nombre: "Pepe", recuadro: r(352, 393, 195) },
      { id: "p528", nombre: "Paca", recuadro: r(580, 433, 175) },
      { id: "p125", nombre: "Lola", recuadro: r(621, 275, 175) },
      { id: "p413", nombre: "Flora", recuadro: r(812, 281, 175) },
      { id: "p418", nombre: "Pepe", recuadro: r(368, 618, 175) },
      { id: "p286", nombre: "Marijose", recuadro: r(462, 400, 160) },
      { id: "p388", nombre: "Paco", recuadro: r(163, 380, 160) },
      { id: "p435", nombre: "Félix", recuadro: r(737, 440, 160) },
      { id: "p429", nombre: "Juan José", recuadro: r(543, 706, 130) },
    ],
  },
  {
    titulo: "La familia Carrión",
    tomada: "1922",
    // Medidos sobre el recorte de 1354 px que preparó Pablo, sin el margen ni la flecha.
    gente: [
      { id: "p272", nombre: "Dolores", recuadro: r(612, 144, 161, 1354) },
      { id: "p271", nombre: "Pepe", recuadro: r(835, 164, 210, 1354) },
      { id: "p273", nombre: "Joaquín", recuadro: r(615, 574, 190, 1354) },
      { id: "p288", nombre: "Magdalena", recuadro: r(804, 583, 175, 1354) },
    ],
  },
  { tomada: "1949", gente: [{ id: "p467", nombre: "Florentina", recuadro: r(30, 320, 1120, 1223) }] },
  {
    titulo: "El primer encuentro, en el faro de Cabo de Palos",
    tomada: "1971-04-09",
    gente: [
      { id: "p124", nombre: "Ricardo", recuadro: r(322, 90, 460, 1792) },
      { id: "p125", nombre: "Lola", recuadro: r(615, 475, 351, 1792) },
      { id: "p275", nombre: "Mariló", recuadro: r(937, 533, 351, 1792) },
      { id: "p140", nombre: "Tili", recuadro: r(1224, 410, 445, 1792) },
    ],
  },
  {
    titulo: "Bodas de plata de Catina y José",
    tomada: "1970-10",
    gente: [
      { id: "p388", nombre: "Paco", recuadro: r(19, 536, 184, 1280) },
      { id: "p275", nombre: "Mariló", recuadro: r(144, 535, 166, 1280) },
      { id: "p470", nombre: "Flora", recuadro: r(216, 475, 136, 1280) },
      { id: "p390", nombre: "María Dolores", recuadro: r(221, 596, 136, 1280) },
      { id: "p418", nombre: "Pepe", recuadro: r(284, 358, 138, 1280) },
      { id: "p435", nombre: "Félix", recuadro: r(308, 272, 126, 1280) },
      { id: "p471", nombre: "Marcos", recuadro: r(347, 412, 132, 1280) },
      { id: "p475", nombre: "Mariluz", recuadro: r(374, 124, 102, 1280) },
      { id: "p338", nombre: "Pepe", recuadro: r(436, 217, 122, 1280) },
      { id: "p312", nombre: "Pacuchi", recuadro: r(509, 384, 124, 1280) },
      { id: "p371", nombre: "Flora", recuadro: r(522, 584, 138, 1280) },
      { id: "p350", nombre: "María", recuadro: r(558, 135, 102, 1280) },
      { id: "p439", nombre: "Miguel Ángel", recuadro: r(578, 27, 90, 1280) },
      { id: "p313", nombre: "Miguel", recuadro: r(567, 262, 136, 1280) },
      { id: "p413", nombre: "Flora", recuadro: r(632, 532, 134, 1280) },
      { id: "p125", nombre: "Lola", recuadro: r(730, 517, 138, 1280) },
      { id: "p381", nombre: "José Juan", recuadro: r(796, 402, 118, 1280) },
      { id: "p310", nombre: "Lola", recuadro: r(888, 516, 130, 1280) },
      { id: "p329", nombre: "Magda", recuadro: r(1028, 522, 118, 1280) },
      { id: "p330", nombre: "Antonio", recuadro: r(1066, 397, 154, 1280) },
    ],
  },
  {
    titulo: "Catina y sus nietos en Lisboa",
    tomada: "2007-12-07",
    gente: [
      { id: "p420", nombre: "José", recuadro: r(206, 485, 206, 2048) },
      { id: "p126", nombre: "Ricardo", recuadro: r(444, 462, 206, 2048) },
      { id: "p423", nombre: "Javi", recuadro: r(726, 482, 184, 2048) },
      { id: "p396", nombre: "Catina", recuadro: r(862, 697, 174, 2048) },
      { id: "p131", nombre: "Ana", recuadro: r(1006, 564, 190, 2048) },
      { id: "p422", nombre: "Merceditas", recuadro: r(1176, 544, 180, 2048) },
      { id: "p417", nombre: "Ángel", recuadro: r(1346, 540, 216, 2048) },
      { id: "p415", nombre: "Marta", recuadro: r(1554, 526, 230, 2048) },
    ],
  },
  {
    titulo: "Cena de primos en casa de Tili",
    tomada: "2008-01-13",
    gente: [
      { id: "p101", nombre: "Cecilia", recuadro: r(68, 664, 250, 1600) },
      { id: "p105", nombre: "Ana", recuadro: r(110, 495, 218, 1600) },
      { id: "p95", nombre: "Marta", recuadro: r(338, 647, 312, 1600) },
      { id: "p100", nombre: "Miguel", recuadro: r(472, 370, 138, 1600) },
      { id: "p111", nombre: "Gonzalo", recuadro: r(680, 369, 148, 1600) },
      { id: "p110", nombre: "Diego", recuadro: r(969, 489, 172, 1600) },
      { id: "p94", nombre: "Pablo", recuadro: r(1155, 490, 216, 1600) },
      { id: "p104", nombre: "David", recuadro: r(1230, 683, 370, 1600) },
    ],
  },
  {
    titulo: "Boda de Salomé",
    tomada: "2010-09-05",
    gente: [
      { id: "p315", nombre: "María", recuadro: r(0, 292, 360, 3648) },
      { id: "p477", nombre: "Virginia", recuadro: r(184, 270, 286, 3648) },
      { id: "p127", nombre: "Mar", recuadro: r(367, 308, 228, 3648) },
      { id: "p131", nombre: "Ana", recuadro: r(402, 333, 370, 3648) },
      { id: "p419", nombre: "Mercedes", recuadro: r(683, 343, 300, 3648) },
      { id: "p310", nombre: "Lola", recuadro: r(818, 462, 340, 3648) },
      { id: "p125", nombre: "Lola", recuadro: r(1159, 446, 324, 3648) },
      { id: "p396", nombre: "Catina", recuadro: r(1370, 966, 334, 3648) },
      { id: "p413", nombre: "Flora", recuadro: r(1400, 484, 308, 3648) },
      { id: "p430", nombre: "Juani", recuadro: r(1465, 288, 296, 3648) },
      { id: "p329", nombre: "Magda", recuadro: r(1705, 396, 288, 3648) },
      { id: "p288", nombre: "Magdalena", recuadro: r(1860, 816, 348, 3648) },
      { id: "p350", nombre: "María", recuadro: r(1958, 377, 280, 3648) },
      { id: "p281", nombre: "Salomé", recuadro: r(2008, 624, 358, 3648) },
      { id: "p275", nombre: "Mariló", recuadro: r(2180, 403, 284, 3648) },
      { id: "p312", nombre: "Pacuchi", recuadro: r(2470, 363, 320, 3648) },
      { id: "p427", nombre: "Flora", recuadro: r(2590, 845, 352, 3648) },
      { id: "p371", nombre: "Flora", recuadro: r(2845, 281, 340, 3648) },
      { id: "p286", nombre: "Marijose", recuadro: r(3022, 369, 374, 3648) },
      { id: "p277", nombre: "Carmiña", recuadro: r(3236, 367, 412, 3648) },
    ],
  },
  {
    titulo: "Catina es bisabuela",
    tomada: "2010-12-25",
    gente: [
      { id: "p396", nombre: "Catina", recuadro: r(1032, 160, 996, 3872) },
      { id: "p133", nombre: "Yago", recuadro: r(2012, 1419, 378, 3872) },
    ],
  },
  {
    titulo: "La Manga",
    tomada: "2011-07-30",
    gente: [
      { id: "p419", nombre: "Mercedes", recuadro: r(419, 246, 344, 4000) },
      { id: "p418", nombre: "Pepe", recuadro: r(636, 325, 286, 4000) },
      { id: "p422", nombre: "Merceditas", recuadro: r(798, 362, 290, 4000) },
      { id: "p396", nombre: "Catina", recuadro: r(1042, 564, 310, 4000) },
      { id: "p442", nombre: "Pepe", recuadro: r(1334, 471, 252, 4000) },
      { id: "p445", nombre: "Fran", recuadro: r(1609, 406, 280, 4000) },
      { id: "p443", nombre: "Ángela", recuadro: r(1918, 426, 296, 4000) },
      { id: "p125", nombre: "Lola", recuadro: r(2118, 418, 296, 4000) },
      { id: "p124", nombre: "Ricardo", recuadro: r(628, 1038, 422, 4000) },
      { id: "p414", nombre: "Ángel", recuadro: r(1289, 976, 332, 4000) },
      { id: "p131", nombre: "Ana", recuadro: r(1328, 1190, 402, 4000) },
      { id: "p444", nombre: "Elena", recuadro: r(1798, 1093, 288, 4000) },
      { id: "p413", nombre: "Flora", recuadro: r(1844, 1264, 356, 4000) },
      { id: "p126", nombre: "Ricardo", recuadro: r(2151, 1001, 332, 4000) },
      { id: "p127", nombre: "Mar", recuadro: r(2314, 1250, 344, 4000) },
      { id: "p423", nombre: "Javi", recuadro: r(439, 1483, 520, 4000) },
      { id: "p132", nombre: "Santi", recuadro: r(1070, 1541, 464, 4000) },
      { id: "p25", nombre: "Pablo", recuadro: r(1604, 1481, 470, 4000) },
      { id: "p415", nombre: "Marta", recuadro: r(2122, 1632, 430, 4000) },
      { id: "p417", nombre: "Ángel", recuadro: r(2554, 1591, 434, 4000) },
    ],
  },
  {
    titulo: "Sabina y Ricardo",
    tomada: "2011-09-24",
    gente: [
      { id: "p183", nombre: "Sabina", recuadro: r(682, 620, 810, 3264) },
      { id: "p124", nombre: "Ricardo", recuadro: r(1623, 219, 932, 3264) },
    ],
  },
  {
    titulo: "Boda Mar y Ricardo, los tíos",
    tomada: "2012-10-13",
    gente: [
      { id: "p114", nombre: "Aquilino", recuadro: r(208, 118, 402, 2500) },
      { id: "p124", nombre: "Ricardo", recuadro: r(659, 45, 400, 2500) },
      { id: "p133", nombre: "Yago", recuadro: r(854, 1045, 356, 2500) },
      { id: "p118", nombre: "Pablo", recuadro: r(856, 323, 382, 2500) },
      { id: "p110", nombre: "Diego", recuadro: r(1170, 182, 336, 2500) },
      { id: "p119", nombre: "Lucas", recuadro: r(1207, 468, 388, 2500) },
      { id: "p106", nombre: "Froilán", recuadro: r(1415, 37, 380, 2500) },
      { id: "p111", nombre: "Gonzalo", recuadro: r(1520, 404, 360, 2500) },
      { id: "p96", nombre: "Miguel", recuadro: r(1832, 55, 436, 2500) },
    ],
  },
  {
    titulo: "En la boda de Mar y Ricardo",
    tomada: "2012-10-13",
    gente: [
      { id: "p25", nombre: "Pablo", recuadro: r(382, 188, 594, 2500) },
      { id: "p207", nombre: "Lorena", recuadro: r(706, 345, 554, 2500) },
      { id: "p159", nombre: "Natalia", recuadro: r(1288, 320, 500, 2500) },
      { id: "p122", nombre: "Alberto", recuadro: r(1589, 142, 584, 2500) },
    ],
  },
  {
    titulo: "En Madrid",
    tomada: "2015-03-02",
    gente: [
      { id: "p124", nombre: "Ricardo", recuadro: r(108, 511, 838, 3011) },
      { id: "p200", nombre: "Marili", recuadro: r(844, 719, 642, 3011) },
      { id: "p199", nombre: "Ladi", recuadro: r(1366, 714, 916, 3011) },
      { id: "p122", nombre: "Alberto", recuadro: r(1850, 562, 666, 3011) },
      { id: "p126", nombre: "Ricardo", recuadro: r(2354, 586, 639, 3011) },
    ],
  },
  {
    titulo: "En Valencia",
    tomada: "2015-05-31",
    gente: [
      { id: "p124", nombre: "Ricardo", recuadro: r(172, 238, 166, 1280) },
      { id: "p126", nombre: "Ricardo", recuadro: r(178, 34, 230, 1280) },
      { id: "p415", nombre: "Marta", recuadro: r(255, 344, 192, 1280) },
      { id: "p132", nombre: "Santi", recuadro: r(265, 433, 284, 1280) },
      { id: "p133", nombre: "Yago", recuadro: r(426, 306, 406, 1280) },
      { id: "p25", nombre: "Pablo", recuadro: r(641, 171, 224, 1280) },
      { id: "p125", nombre: "Lola", recuadro: r(758, 280, 262, 1280) },
      { id: "p134", nombre: "Jara", recuadro: r(818, 465, 255, 1280) },
      { id: "p131", nombre: "Ana", recuadro: r(923, 392, 328, 1280) },
      { id: "p127", nombre: "Mar", recuadro: r(975, 109, 256, 1280) },
      { id: "p122", nombre: "Alberto", recuadro: r(1028, 319, 141, 1280) },
      { id: "p123", nombre: "María", recuadro: r(1103, 397, 177, 1280) },
    ],
  },
  {
    titulo: "Los Velasco en Navidad",
    tomada: "2015-12-29",
    gente: [
      { id: "p418", nombre: "Pepe", recuadro: r(335, 749, 304, 3200) },
      { id: "p131", nombre: "Ana", recuadro: r(619, 756, 252, 3200) },
      { id: "p413", nombre: "Flora", recuadro: r(664, 1198, 270, 3200) },
      { id: "p420", nombre: "José", recuadro: r(898, 751, 242, 3200) },
      { id: "p133", nombre: "Yago", recuadro: r(944, 1366, 234, 3200) },
      { id: "p415", nombre: "Marta", recuadro: r(1016, 778, 246, 3200) },
      { id: "p125", nombre: "Lola", recuadro: r(1036, 1161, 282, 3200) },
      { id: "p25", nombre: "Pablo", recuadro: r(1149, 792, 252, 3200) },
      { id: "p423", nombre: "Javi", recuadro: r(1311, 732, 228, 3200) },
      { id: "p419", nombre: "Mercedes", recuadro: r(1336, 1130, 286, 3200) },
      { id: "p417", nombre: "Ángel", recuadro: r(1487, 824, 248, 3200) },
      { id: "p422", nombre: "Merceditas", recuadro: r(1574, 1167, 282, 3200) },
      { id: "p414", nombre: "Ángel", recuadro: r(1658, 823, 262, 3200) },
      { id: "p124", nombre: "Ricardo", recuadro: r(1900, 779, 262, 3200) },
      { id: "p127", nombre: "Mar", recuadro: r(1922, 1165, 264, 3200) },
      { id: "p134", nombre: "Jara", recuadro: r(2006, 1384, 190, 3200) },
      { id: "p126", nombre: "Ricardo", recuadro: r(2146, 710, 288, 3200) },
      { id: "p132", nombre: "Santi", recuadro: r(2396, 762, 290, 3200) },
    ],
  },
  {
    titulo: "Pedida de Carmen y Pablo",
    tomada: "2016-12-26",
    gente: [
      { id: "p127", nombre: "Mar", recuadro: r(118, 502, 506, 4032) },
      { id: "p128", nombre: "Javi", recuadro: r(467, 721, 392, 4032) },
      { id: "p126", nombre: "Ricardo", recuadro: r(651, 282, 572, 4032) },
      { id: "p25", nombre: "Pablo", recuadro: r(1162, 546, 494, 4032) },
      { id: "p125", nombre: "Lola", recuadro: r(1213, 1176, 508, 4032) },
      { id: "p24", nombre: "Carmen", recuadro: r(1464, 714, 412, 4032) },
      { id: "p29", nombre: "Pepe", recuadro: r(1662, 449, 458, 4032) },
      { id: "p21", nombre: "Ángeles", recuadro: r(1773, 1176, 492, 4032) },
      { id: "p134", nombre: "Jara", recuadro: r(2095, 416, 352, 4032) },
      { id: "p124", nombre: "Ricardo", recuadro: r(2331, 530, 464, 4032) },
      { id: "p23", nombre: "María", recuadro: r(2496, 1205, 486, 4032) },
      { id: "p22", nombre: "José Alberto", recuadro: r(2864, 476, 398, 4032) },
      { id: "p133", nombre: "Yago", recuadro: r(2895, 988, 372, 4032) },
      { id: "p131", nombre: "Ana", recuadro: r(3040, 1197, 522, 4032) },
      { id: "p132", nombre: "Santi", recuadro: r(3406, 453, 480, 4032) },
    ],
  },
  {
    titulo: "Boda Carmen y Pablo",
    tomada: "2017-06-24",
    gente: [
      { id: "p141", nombre: "Paco", recuadro: r(518, 236, 546, 2500) },
      { id: "p113", nombre: "Aurora", recuadro: r(1126, 581, 430, 2500) },
      { id: "p140", nombre: "Tili", recuadro: r(1572, 692, 412, 2500) },
    ],
  },
  {
    titulo: "Los 72 de Lola en La Manga",
    tomada: "2018-08-16",
    gente: [
      { id: "p24", nombre: "Carmen", recuadro: r(222, 675, 682, 3264) },
      { id: "p124", nombre: "Ricardo", recuadro: r(482, 1120, 918, 3264) },
      { id: "p132", nombre: "Santi", recuadro: r(759, 637, 608, 3264) },
      { id: "p125", nombre: "Lola", recuadro: r(1218, 1311, 698, 3264) },
      { id: "p127", nombre: "Mar", recuadro: r(1268, 668, 514, 3264) },
      { id: "p126", nombre: "Ricardo", recuadro: r(1688, 618, 474, 3264) },
      { id: "p134", nombre: "Jara", recuadro: r(1684, 1428, 568, 3264) },
      { id: "p133", nombre: "Yago", recuadro: r(2029, 639, 440, 3264) },
      { id: "p131", nombre: "Ana", recuadro: r(2276, 594, 606, 3264) },
      { id: "p128", nombre: "Javi", recuadro: r(2558, 1315, 574, 3264) },
    ],
  },
  {
    titulo: "Yago y Jara en San Juan",
    tomada: "2018-08-18",
    gente: [
      { id: "p25", nombre: "Pablo", recuadro: r(0, 984, 759, 3264) },
      { id: "p132", nombre: "Santi", recuadro: r(270, 469, 480, 3264) },
      { id: "p22", nombre: "José Alberto", recuadro: r(379, 806, 544, 3264) },
      { id: "p24", nombre: "Carmen", recuadro: r(628, 487, 348, 3264) },
      { id: "p133", nombre: "Yago", recuadro: r(1102, 865, 406, 3264) },
      { id: "p18", nombre: "Pablo", recuadro: r(1170, 460, 314, 3264) },
      { id: "p134", nombre: "Jara", recuadro: r(1204, 1132, 650, 3264) },
      { id: "p21", nombre: "Ángeles", recuadro: r(1646, 177, 306, 3264) },
      { id: "p23", nombre: "María", recuadro: r(1878, 485, 270, 3264) },
      { id: "p19", nombre: "María", recuadro: r(2238, 656, 346, 3264) },
      { id: "p131", nombre: "Ana", recuadro: r(2564, 754, 466, 3264) },
    ],
  },
  {
    titulo: "Lucas y la bisa",
    tomada: "2020-07-18",
    gente: [
      { id: "p512", nombre: "Carmen", recuadro: r(337, 122, 1540, 3024) },
      { id: "p26", nombre: "Lucas", recuadro: r(1706, 1050, 1018, 3024) },
    ],
  },
  {
    titulo: "Los primos en el campo",
    tomada: "2025-01-01",
    gente: [
      { id: "p28", nombre: "Luis", recuadro: r(66, 585, 145, 1707) },
      { id: "p130", nombre: "Nora", recuadro: r(281, 583, 143, 1707) },
      { id: "p27", nombre: "Juan", recuadro: r(457, 517, 159, 1707) },
      { id: "p416", nombre: "Elena", recuadro: r(590, 556, 156, 1707) },
      { id: "p129", nombre: "Jorge", recuadro: r(712, 532, 161, 1707) },
      { id: "p26", nombre: "Lucas", recuadro: r(887, 526, 170, 1707) },
      { id: "p128", nombre: "Javi", recuadro: r(1077, 502, 182, 1707) },
      { id: "p134", nombre: "Jara", recuadro: r(1213, 395, 198, 1707) },
      { id: "p133", nombre: "Yago", recuadro: r(1434, 376, 195, 1707) },
    ],
  },
  {
    titulo: "Cumple de Marieta y Alessandro",
    tomada: "2025-06-08",
    gente: [
      { id: "p28", nombre: "Luis", recuadro: r(265, 527, 392, 3870) },
      { id: "p24", nombre: "Carmen", recuadro: r(510, 373, 478, 3870) },
      { id: "p26", nombre: "Lucas", recuadro: r(530, 984, 480, 3870) },
      { id: "p14", nombre: "Teresa", recuadro: r(906, 305, 396, 3870) },
      { id: "p27", nombre: "Juan", recuadro: r(928, 1875, 370, 3870) },
      { id: "p11", nombre: "Teresa", recuadro: r(1188, 284, 346, 3870) },
      { id: "p13", nombre: "María", recuadro: r(1478, 382, 378, 3870) },
      { id: "p15", nombre: "Alessandro", recuadro: r(1601, 1187, 356, 3870) },
      { id: "p7", nombre: "Mariano", recuadro: r(1910, 307, 360, 3870) },
      { id: "p10", nombre: "Gabi", recuadro: r(2092, 1589, 326, 3870) },
      { id: "p12", nombre: "Federico", recuadro: r(2208, 1678, 500, 3870) },
      { id: "p29", nombre: "Pepe", recuadro: r(2418, 1089, 394, 3870) },
      { id: "p22", nombre: "José Alberto", recuadro: r(2519, 342, 388, 3870) },
      { id: "p8", nombre: "Eva", recuadro: r(2824, 422, 386, 3870) },
      { id: "p9", nombre: "Irene", recuadro: r(3024, 521, 392, 3870) },
    ],
  },
  {
    titulo: "Los 80 de Lola",
    tomada: "2026-08-21",
    gente: [
      { id: "p28", nombre: "Luis", recuadro: r(317, 329, 108, 1600) },
      { id: "p133", nombre: "Yago", recuadro: r(348, 300, 130, 1600) },
      { id: "p131", nombre: "Ana", recuadro: r(462, 262, 130, 1600) },
      { id: "p129", nombre: "Jorge", recuadro: r(468, 455, 110, 1600) },
      { id: "p26", nombre: "Lucas", recuadro: r(534, 478, 114, 1600) },
      { id: "p134", nombre: "Jara", recuadro: r(548, 304, 122, 1600) },
      { id: "p24", nombre: "Carmen", recuadro: r(677, 307, 124, 1600) },
      { id: "p125", nombre: "Lola", recuadro: r(812, 308, 136, 1600) },
      { id: "p27", nombre: "Juan", recuadro: r(878, 526, 110, 1600) },
      { id: "p25", nombre: "Pablo", recuadro: r(894, 234, 144, 1600) },
      { id: "p130", nombre: "Nora", recuadro: r(1018, 528, 112, 1600) },
      { id: "p127", nombre: "Mar", recuadro: r(1060, 233, 126, 1600) },
      { id: "p128", nombre: "Javi", recuadro: r(1140, 308, 132, 1600) },
      { id: "p126", nombre: "Ricardo", recuadro: r(1176, 195, 140, 1600) },
    ],
  },
];

/**
 * Cuántas tiene cada uno. **Es lo único que las anuncia, y solo mientras dura el repaso**: el
 * árbol no marca quién tiene foto —encontrarlas es la gracia—, pero rellenarlo sí pide saber a
 * quién no se le ha puesto cara todavía. **No es un hueco**: una foto no es un dato del
 * documento, así que no enciende ni apaga a nadie ni entra en la cuenta de los incompletos.
 */
export function cuantasFotos(): Map<string, number> {
  const cuenta = new Map<string, number>();
  for (const f of FOTOS) for (const quien of f.gente) cuenta.set(quien.id, (cuenta.get(quien.id) ?? 0) + 1);
  return cuenta;
}

/** Un recuadro medido en píxeles del escaneo, que es como se mira una foto con una regla. */
function r(x: number, y: number, lado: number, ancho = 1184): Recuadro {
  return { x: x / ancho, y: y / ancho, lado: lado / ancho };
}

/**
 * Cómo se pide una foto y cómo se llama su archivo en el blob. **Sale de la foto, no de quien
 * la mira**: del título si lo tiene y, si no, de su único dueño y el año, que es lo que
 * evita un tercer dato a mano. El test vigila que no se repita, que es lo único que la
 * derivación no puede garantizar sola.
 */
export const claveDeFoto = (f: Foto): string =>
  `${f.titulo ? sinAcentos(f.titulo) : f.gente[0].id}-${añoDe(f.tomada)}`;

/** Un título hecho clave: minúsculas, sin acentos y con guiones, porque viaja en una URL. */
const sinAcentos = (t: string): string =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const rutaEnBlob = (clave: string): string => `arbol/${clave}.jpg`;

/** Si esa clave es de una foto que existe. La puerta no sirve lo que esta lista no conoce. */
export const hayFoto = (clave: string): boolean => FOTOS.some((f) => claveDeFoto(f) === clave);

/** La foto de esa clave, para quien tenga que rotular a los que salen en ella. */
export const fotoDe = (clave: string): Foto | undefined => FOTOS.find((f) => claveDeFoto(f) === clave);

/** Las tres medidas con las que el marco coloca la foto, en porcentaje del propio marco. */
export interface Encuadre {
  width: string;
  left: string;
  top: string;
}

/**
 * Del recuadro al CSS. La foto se estira hasta que su recuadro mide lo que el marco y se
 * desplaza hasta que empieza donde él: **el marco no recorta con `object-fit`**, que solo
 * sabe encajar la foto entera y no un trozo elegido de ella.
 */
export function encuadreDe(r?: Recuadro): Encuadre | undefined {
  if (!r) return undefined;
  const porciento = (v: number) => `${+((v / r.lado) * 100).toFixed(3)}%`;
  return { width: porciento(1), left: porciento(-r.x), top: porciento(-r.y) };
}

/** Una foto ya resuelta para pintarla: la ficha no calcula nada, solo la escribe. */
export interface FotoEnFicha {
  clave: string;
  /** Cómo se lee el link: «con 20 años». */
  rotulo: string;
  /** Cómo se coloca dentro del marco, ya en CSS; sin recuadro, el marco la centra él. */
  encuadre?: Encuadre;
  /** Cuántos salen. Con más de uno, abrirla entera es reconocer a los demás. */
  cuantos: number;
  /** De dónde se pide, con el nombre de la descarga en el último tramo. */
  url: string;
}

/**
 * Las suyas, de la más joven a la más vieja: la ficha las lista en el orden en que se vivieron
 * y así pasar de una a otra es verla envejecer.
 */
export function fotosDe(id: string, quien: { nombreCompleto: string; birth?: Fecha }): FotoEnFicha[] {
  return FOTOS.filter((f) => f.gente.some((g) => g.id === id))
    .sort((a, b) => a.tomada.localeCompare(b.tomada))
    .map((f) => ({
      clave: claveDeFoto(f),
      rotulo: rotuloDeFoto(f, quien.birth),
      encuadre: encuadreDe(f.gente.find((g) => g.id === id)!.recuadro),
      cuantos: f.gente.length,
      url: `/arbol/api/foto/${claveDeFoto(f)}/${encodeURIComponent(nombreDeArchivo(f, quien))}`,
    }));
}

/**
 * Cómo se lee el link. **La edad se cuenta, no se teclea**, y los dos bordes se dicen como se
 * dicen: nadie llama «con 0 años» a una foto de bebé, y a quien no le consta el nacimiento no
 * hay edad que restarle, así que su foto se sitúa por el año.
 */
export function rotuloDeFoto(f: Foto, birth?: Fecha): string {
  if (!birth) return `en ${añoDe(f.tomada)}`;
  const edad = edadEntre(birth, f.tomada);
  if (edad === 0) return "de bebé";
  return `con ${edad} ${edad === 1 ? "año" : "años"}`;
}

/**
 * El nombre con el que se guarda al descargarla, y por eso lleva el nombre entero y los dos
 * años: una foto suelta en la carpeta de descargas tiene que decir de quién es sin que haya
 * que abrirla. **Va en la propia URL** y no solo en la cabecera, que es lo único que respetan
 * por igual el «guardar imagen» del móvil y el clic derecho del escritorio.
 *
 * **La de varios se llama por la foto y no por quien la descarga**: se la baja uno desde su
 * ficha, pero lo que se lleva es la familia entera, y en el carrete eso no es «Lola».
 */
export function nombreDeArchivo(f: Foto, quien: { nombreCompleto: string; birth?: Fecha }): string {
  if (f.titulo) return `${f.titulo}, ${añoDe(f.tomada)}.jpg`;
  // La barra es el único carácter que rompería el tramo de la URL, y en un apellido con
  // barra —no lo hay, pero el nombre lo escribe una persona— partiría la ruta en dos.
  const nombre = quien.nombreCompleto.replace(/\//g, "-");
  const tomada = `tomada en ${añoDe(f.tomada)}`;
  if (!quien.birth) return `${nombre} - Foto ${tomada}.jpg`;
  return `${nombre} (${añoDe(quien.birth)}) - Foto ${rotuloDeFoto(f, quien.birth)} (${tomada}).jpg`;
}
