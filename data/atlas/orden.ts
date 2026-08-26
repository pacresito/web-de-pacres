// El recorrido geográfico de Atlas: por continente, y dentro de cada uno de vecino en vecino. Es
// a la vez el orden de la pestaña explorar y el de entrada de países nuevos, para que lo nuevo
// caiga al lado de lo ya visto.
//
// Los continentes van de lo lejano a lo cercano: lo cercano se aprende solo.
//
// **Elegido a mano, país por país.** Salió de un barrido en S de scripts/build-atlas-orden.mts
// —África sigue siendo el suyo tal cual— pero la geografía de verdad no cabe en una regla de
// bandas: Asia barre en columnas de norte a sur, América del Norte baja primero por el continente
// y luego por las islas, y Europa arranca por el norte para bajar por el este. **Volver a correr
// el script lo pisa todo**, así que ya no se corre: se mueven ids.
import type { Continente } from "@/lib/atlas/paises";
import type { Marco } from "@/lib/atlas/plano";

export const ORDEN: { continente: Continente; marco: Marco; paises: string[] }[] = [
  { continente: "Asia", marco: [26, -11, 147, 78], paises: [
    "ge", "am", "az", "tr", "cy", "sy", "iq", "lb", "il", "ps", "jo", "sa", "ye", "om", "ae", "qa", "bh", "kw",
    "ir", "tm", "uz", "kz", "kg", "tj", "af", "pk", "mv", "lk", "in", "np", "bt", "bd", "mm", "la", "vn", "th",
    "kh", "my", "id", "tl", "sg", "bn", "ph", "cn", "mn", "kp", "kr", "jp",
  ] },
  { continente: "Oceanía", marco: [110, -48, 205, 12], paises: ["pw", "fm", "nr", "mh", "tv", "ki", "ws", "to", "fj", "vu", "sb", "pg", "au", "nz"] },
  { continente: "África", marco: [-26, -36, 60, 38], paises: [
    "ma", "dz", "tn", "ly", "eg", "er", "sd", "td", "ne", "ml", "mr", "sn", "gm", "cv", "gw", "sl", "gn", "lr",
    "ci", "bf", "gh", "tg", "bj", "ng", "cm", "cf", "ss", "et", "dj", "so", "sc", "ke", "ug", "bi", "rw", "cd",
    "cg", "ga", "gq", "st", "ao", "zm", "mw", "tz", "km", "mu", "mg", "mz", "sz", "zw", "bw", "na", "za", "ls",
  ] },
  { continente: "América del Norte", marco: [-172, 7, -52, 72], paises: [
    "ca", "us", "mx", "bz", "gt", "hn", "sv", "ni", "cr", "pa", "bs", "cu", "ht", "do", "jm", "kn", "ag", "dm",
    "lc", "bb", "vc", "gd", "tt",
  ] },
  { continente: "América del Sur", marco: [-82, -56, -34, 13], paises: ["co", "ve", "gy", "sr", "ec", "pe", "br", "bo", "cl", "ar", "py", "uy"] },
  { continente: "Europa", marco: [-25, 34, 60, 72], paises: [
    "is", "no", "se", "fi", "ru", "ee", "lv", "lt", "by", "pl", "cz", "dk", "de", "lu", "nl", "be", "gb", "ie",
    "pt", "es", "ad", "fr", "mc", "ch", "li", "va", "sm", "it", "mt", "at", "sk", "hu", "si", "hr", "ba", "me",
    "rs", "al", "mk", "gr", "bg", "ro", "md", "ua",
  ] },
];

/** El recorrido entero, sin continentes: el orden en que entran los países nuevos. */
export const RECORRIDO = ORDEN.flatMap((g) => g.paises);
