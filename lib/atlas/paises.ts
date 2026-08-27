// Los datos curados de Atlas: una fila por país, revisada a mano. Es la única fuente de
// verdad de nombres y capitales — el resto (formas, orden del barrido) se genera a partir
// de aquí. Son los 195 Estados soberanos: los 193 de la ONU más el Vaticano y Palestina.
// Va ordenada por `nombre`, orden de codepoint (las tildes al final): renombrar recoloca.
//
// **Añadir o quitar un país obliga a correr los dos generadores**, `build-atlas-formas.mts` y
// `build-atlas-relieve.mts`: comparten el encuadre de `atlas-geo.mts`, y con uno solo el
// relieve de un país se queda encajado en un contorno que ya no es el suyo, sin que falle nada.
// Renombrar no los toca: casan por `id` y del nombre solo escriben su log.
//
// **Sin punto suscrito ni semianillos.** La romanización académica marca las consonantes
// enfáticas con un punto debajo y la hamza y el ain con medio anillo —Riyāḍ, Kharṭūm, Ṣanʿāʾ,
// ʿAmmān—, y JetBrains Mono no tiene esos glifos: caen a la proporcional del sistema y en una
// monoespaciada un carácter que mide otra cosa se ve a la legua. Se escriben sin ellos. El macrón
// sí se queda: ese lo tiene la fuente y además dice cómo se pronuncia, mientras que los otros dos
// marcan distinciones del árabe que aquí no se pronuncian ni se preguntan.
//
// `nombre` es el que se diría en voz alta, y es el único que se pregunta: como la calificación
// es autoinforme, no hay corrector al que satisfacer y una segunda forma solo añade ruido.
// **Manda la forma local** —la ortografía oficial del país o su romanización oficial: Beijing,
// Kyiv, Muqdisho, Toshkent, Nay Pyi Taw, Riyād—, no la convención inglesa, que no es la
// forma nativa de nadie. Se queda la castellana cuando **es la que se usa de verdad** (París,
// Roma, El Cairo, Damasco, Trípoli, Argelia, Costa de Marfil, Uagadugú, La Valeta) y cuando el
// cambio no acercaría al nombre local, solo lo traduciría al inglés (San Vicente y las
// Granadinas, Ciudad de Kuwait). **El artículo árabe no viaja** —Riyād y Khartūm, no Ar-Riyād ni
// Al-Khartūm—, que en español no se pronuncia y ordena media docena de capitales por la A.
// `oficial` acompaña a `nombre` en la forma elegida —Reino de Bhutan, no de Bután— y solo se
// muestra en la ficha de explorar.
//
// **El diacrítico ajeno entra si ignorarlo deja la palabra bien leída**, porque entonces no
// estorba a quien no sepa qué marca: Hà Nội, Tehrān, Chișinău, Sanā y Rīga se leen de corrido
// tapándolos. La letra que cambia de identidad, no: Bakı se lee mal y parece una errata, así que
// ahí se queda Bakú. **Y la tilde española se conserva** donde la palabra es la misma (Seúl,
// Trípoli, Dublín, Malí): dice cómo se pronuncia y no es otra forma. Lo que no se importa es la
// tilde extranjera sobre una palabra que el español ya escribe a su manera (Brasilia).
//
// **`capitalCastellana` es la pista, no una segunda respuesta.** Se glosa entre paréntesis y en
// pequeño donde la forma local **se leería mal** —la j que suena /y/ (Jakarta, Juba, Abuja, Ljubljana, Skopje) y la
// kh que suena jota (Khartūm)— o donde **no se reconocería sin ayuda** (Kyiv, Muqdisho, Bayrūt,
// Nawākshūt). La que se lee y se reconoce sola no la lleva: Riyād, Sanā, Tbilisi. Y donde la
// forma local **es** la castellana tampoco, que ahí no diría nada: Yibuti, Tūnis.
//
// **La capital oficial, aunque no sea la de facto:** Porto-Novo y no Cotonú, Yamusukro y no
// Abiyán, Sri Jayawardenapura Kotte y no Colombo. Donde el país declara varias va la que se
// diría en un examen —Pretoria de las tres de Sudáfrica, La Paz de las dos de Bolivia—, y donde
// la oficial la disputan dos Estados —Palestina, Israel— la que reconoce quien la nombra.
//
// De dónde salió cada columna, por si hay que rehacerla: `continente` y `subregion` son el
// CONTINENT y SUBREGION de Natural Earth 10m —el mismo reparto que dibuja las formas, así que
// los transcontinentales no los arbitra nadie—; `km2`, la superficie total de Wikidata (P2046),
// territorios lejanos incluidos aunque la silueta los suelte. `nombre`, `oficial` y `capital`
// arrancaron del NAME_ES de Natural Earth y del anexo de países de la Wikipedia en español,
// pero ya no salen de ahí: están revisados uno a uno con el criterio de arriba.

export type Continente =
  | "África"
  | "América del Norte"
  | "América del Sur"
  | "Asia"
  | "Europa"
  | "Oceanía";

export type Pais = {
  id: string; // ISO 3166-1 alfa-2, en minúsculas: clave de todo y nombre del SVG de bandera
  nombre: string;
  oficial: string;
  capital: string;
  continente: Continente;
  subregion: string;
  km2: number; // solo para la ficha; el escalón de zoom sale de la forma, no de aquí
  // Va al final de la fila, y no junto a `capital`, para no abrir una columna que 189 filas
  // dejarían vacía.
  capitalCastellana?: string;
};

export const PAISES: Pais[] = [
  { id: "af", nombre: "Afganistán",                      oficial: "Emirato Islámico de Afganistán",                  capital: "Kabul",                     continente: "Asia",              subregion: "Asia del Sur",              km2:    652_230 },
  { id: "al", nombre: "Albania",                         oficial: "República de Albania",                            capital: "Tiranë",                    continente: "Europa",            subregion: "Europa del Sur",            km2:     28_748 },
  { id: "de", nombre: "Alemania",                        oficial: "República Federal de Alemania",                   capital: "Berlín",                    continente: "Europa",            subregion: "Europa Occidental",         km2:    357_588 },
  { id: "ad", nombre: "Andorra",                         oficial: "Principado de Andorra",                           capital: "Andorra la Vella",          continente: "Europa",            subregion: "Europa del Sur",            km2:        468 },
  { id: "ao", nombre: "Angola",                          oficial: "República de Angola",                             capital: "Luanda",                    continente: "África",            subregion: "África Central",            km2:  1_246_700 },
  { id: "ag", nombre: "Antigua y Barbuda",               oficial: "Antigua y Barbuda",                               capital: "Saint John's",              continente: "América del Norte", subregion: "Caribe",                    km2:        440 },
  { id: "sa", nombre: "Arabia Saudí",                    oficial: "Reino de Arabia Saudí",                           capital: "Riyād",                     continente: "Asia",              subregion: "Asia Occidental",           km2:  2_250_000 },
  { id: "dz", nombre: "Argelia",                         oficial: "República Argelina Democrática y Popular",        capital: "Alger",                     continente: "África",            subregion: "África del Norte",          km2:  2_381_741 },
  { id: "ar", nombre: "Argentina",                       oficial: "República Argentina",                             capital: "Buenos Aires",              continente: "América del Sur",   subregion: "Sudamérica",                km2:  2_780_400 },
  { id: "am", nombre: "Armenia",                         oficial: "República de Armenia",                            capital: "Yerevan",                   continente: "Asia",              subregion: "Asia Occidental",           km2:     29_743 },
  { id: "au", nombre: "Australia",                       oficial: "Mancomunidad de Australia",                       capital: "Canberra",                  continente: "Oceanía",           subregion: "Australia y Nueva Zelanda", km2:  7_692_024 },
  { id: "at", nombre: "Austria",                         oficial: "República de Austria",                            capital: "Viena",                     continente: "Europa",            subregion: "Europa Occidental",         km2:     83_879 },
  { id: "az", nombre: "Azerbaiyán",                      oficial: "República de Azerbaiyán",                         capital: "Bakú",                      continente: "Asia",              subregion: "Asia Occidental",           km2:     86_600 },
  { id: "bs", nombre: "Bahamas",                         oficial: "Mancomunidad de las Bahamas",                     capital: "Nassau",                    continente: "América del Norte", subregion: "Caribe",                    km2:     13_878 },
  { id: "bh", nombre: "Bahrain",                         oficial: "Reino de Bahrain",                                capital: "Manama",                    continente: "Asia",              subregion: "Asia Occidental",           km2:        786 },
  { id: "bd", nombre: "Bangladesh",                      oficial: "República Popular de Bangladesh",                 capital: "Dhaka",                     continente: "Asia",              subregion: "Asia del Sur",              km2:    147_570 },
  { id: "bb", nombre: "Barbados",                        oficial: "Barbados",                                        capital: "Bridgetown",                continente: "América del Norte", subregion: "Caribe",                    km2:        439 },
  { id: "by", nombre: "Belarús",                         oficial: "República de Belarús",                            capital: "Minsk",                     continente: "Europa",            subregion: "Europa Oriental",           km2:    207_597 },
  { id: "bz", nombre: "Belize",                          oficial: "Belize",                                          capital: "Belmopán",                  continente: "América del Norte", subregion: "Centroamérica",             km2:     22_966 },
  { id: "bj", nombre: "Benín",                           oficial: "República de Benín",                              capital: "Porto-Novo",                continente: "África",            subregion: "África Occidental",         km2:    114_763 },
  { id: "bt", nombre: "Bhutan",                          oficial: "Reino de Bhutan",                                 capital: "Thimphu",                   continente: "Asia",              subregion: "Asia del Sur",              km2:     38_394 },
  { id: "bo", nombre: "Bolivia",                         oficial: "Estado Plurinacional de Bolivia",                 capital: "La Paz",                    continente: "América del Sur",   subregion: "Sudamérica",                km2:  1_098_581 },
  { id: "ba", nombre: "Bosnia y Herzegovina",            oficial: "Bosnia y Herzegovina",                            capital: "Sarajevo",                  continente: "Europa",            subregion: "Europa del Sur",            km2:     51_197 },
  { id: "bw", nombre: "Botswana",                        oficial: "República de Botswana",                           capital: "Gaborone",                  continente: "África",            subregion: "África Austral",            km2:    581_737 },
  { id: "br", nombre: "Brasil",                          oficial: "República Federativa de Brasil",                  capital: "Brasilia",                  continente: "América del Sur",   subregion: "Sudamérica",                km2:  8_515_767 },
  { id: "bn", nombre: "Brunei",                          oficial: "Estado de Brunei Darussalam",                     capital: "Bandar Seri Begawan",       continente: "Asia",              subregion: "Sudeste Asiático",          km2:      5_765 },
  { id: "bg", nombre: "Bulgaria",                        oficial: "República de Bulgaria",                           capital: "Sofía",                     continente: "Europa",            subregion: "Europa Oriental",           km2:    110_994 },
  { id: "bf", nombre: "Burkina Faso",                    oficial: "Burkina Faso",                                    capital: "Uagadugú",                  continente: "África",            subregion: "África Occidental",         km2:    274_200 },
  { id: "bi", nombre: "Burundi",                         oficial: "República de Burundi",                            capital: "Gitega",                    continente: "África",            subregion: "África Oriental",           km2:     27_834 },
  { id: "be", nombre: "Bélgica",                         oficial: "Reino de Bélgica",                                capital: "Bruselas",                  continente: "Europa",            subregion: "Europa Occidental",         km2:     30_688 },
  { id: "cv", nombre: "Cabo Verde",                      oficial: "República de Cabo Verde",                         capital: "Praia",                     continente: "África",            subregion: "África Occidental",         km2:      4_033 },
  { id: "kh", nombre: "Camboya",                         oficial: "Reino de Camboya",                                capital: "Phnom Penh",                continente: "Asia",              subregion: "Sudeste Asiático",          km2:    181_035 },
  { id: "cm", nombre: "Camerún",                         oficial: "República de Camerún",                            capital: "Yaundé",                    continente: "África",            subregion: "África Central",            km2:    475_442 },
  { id: "ca", nombre: "Canadá",                          oficial: "Canadá",                                          capital: "Ottawa",                    continente: "América del Norte", subregion: "Norteamérica",              km2:  9_984_670 },
  { id: "td", nombre: "Chad",                            oficial: "República del Chad",                              capital: "N'Djamena",                 continente: "África",            subregion: "África Central",            km2:  1_284_000 },
  { id: "cl", nombre: "Chile",                           oficial: "República de Chile",                              capital: "Santiago",                  continente: "América del Sur",   subregion: "Sudamérica",                km2:    756_102 },
  { id: "cn", nombre: "China",                           oficial: "República Popular China",                         capital: "Beijing",                   continente: "Asia",              subregion: "Asia Oriental",             km2:  9_596_961 },
  { id: "cy", nombre: "Chipre",                          oficial: "República de Chipre",                             capital: "Nicosia",                   continente: "Asia",              subregion: "Asia Occidental",           km2:      9_242 },
  { id: "va", nombre: "Ciudad del Vaticano",             oficial: "Estado de la Ciudad del Vaticano",                capital: "Ciudad del Vaticano",       continente: "Europa",            subregion: "Europa del Sur",            km2:       0.49 },
  { id: "co", nombre: "Colombia",                        oficial: "República de Colombia",                           capital: "Bogotá",                    continente: "América del Sur",   subregion: "Sudamérica",                km2:  1_141_748 },
  { id: "km", nombre: "Comoras",                         oficial: "Unión de las Comoras",                            capital: "Moroni",                    continente: "África",            subregion: "África Oriental",           km2:      2_034 },
  { id: "kp", nombre: "Corea del Norte",                 oficial: "República Popular Democrática de Corea",          capital: "Pyongyang",                 continente: "Asia",              subregion: "Asia Oriental",             km2:    120_540 },
  { id: "kr", nombre: "Corea del Sur",                   oficial: "República de Corea",                              capital: "Seúl",                      continente: "Asia",              subregion: "Asia Oriental",             km2:    100_295 },
  { id: "cr", nombre: "Costa Rica",                      oficial: "República de Costa Rica",                         capital: "San José",                  continente: "América del Norte", subregion: "Centroamérica",             km2:     51_180 },
  { id: "ci", nombre: "Costa de Marfil",                 oficial: "República de Costa de Marfil",                    capital: "Yamusukro",                 continente: "África",            subregion: "África Occidental",         km2:    322_463 },
  { id: "hr", nombre: "Croacia",                         oficial: "República de Croacia",                            capital: "Zagreb",                    continente: "Europa",            subregion: "Europa del Sur",            km2:     56_594 },
  { id: "cu", nombre: "Cuba",                            oficial: "República de Cuba",                               capital: "La Habana",                 continente: "América del Norte", subregion: "Caribe",                    km2:    109_884 },
  { id: "dk", nombre: "Dinamarca",                       oficial: "Reino de Dinamarca",                              capital: "Copenhague",                continente: "Europa",            subregion: "Europa del Norte",          km2:     42_925 },
  { id: "dm", nombre: "Dominica",                        oficial: "Mancomunidad de Dominica",                        capital: "Roseau",                    continente: "América del Norte", subregion: "Caribe",                    km2:        751 },
  { id: "ec", nombre: "Ecuador",                         oficial: "República del Ecuador",                           capital: "Quito",                     continente: "América del Sur",   subregion: "Sudamérica",                km2:    257_204 },
  { id: "eg", nombre: "Egipto",                          oficial: "República Árabe de Egipto",                       capital: "El Cairo",                  continente: "África",            subregion: "África del Norte",          km2:  1_010_408 },
  { id: "sv", nombre: "El Salvador",                     oficial: "República de El Salvador",                        capital: "San Salvador",              continente: "América del Norte", subregion: "Centroamérica",             km2:     21_041 },
  { id: "ae", nombre: "Emiratos Árabes Unidos",          oficial: "Emiratos Árabes Unidos",                          capital: "Abu Dhabi",                 continente: "Asia",              subregion: "Asia Occidental",           km2:     83_600 },
  { id: "er", nombre: "Eritrea",                         oficial: "Estado de Eritrea",                               capital: "Asmara",                    continente: "África",            subregion: "África Oriental",           km2:    117_600 },
  { id: "sk", nombre: "Eslovaquia",                      oficial: "República Eslovaca",                              capital: "Bratislava",                continente: "Europa",            subregion: "Europa Oriental",           km2:     49_034 },
  { id: "si", nombre: "Eslovenia",                       oficial: "República de Eslovenia",                          capital: "Ljubljana",                 continente: "Europa",            subregion: "Europa del Sur",            km2:     20_271, capitalCastellana: "Liubliana" },
  { id: "es", nombre: "España",                          oficial: "Reino de España",                                 capital: "Madrid",                    continente: "Europa",            subregion: "Europa del Sur",            km2:    505_990 },
  { id: "us", nombre: "Estados Unidos",                  oficial: "Estados Unidos de América",                       capital: "Washington D. C.",          continente: "América del Norte", subregion: "Norteamérica",              km2:  9_826_675 },
  { id: "ee", nombre: "Estonia",                         oficial: "República de Estonia",                            capital: "Tallinn",                   continente: "Europa",            subregion: "Europa del Norte",          km2:     45_335 },
  { id: "sz", nombre: "Eswatini",                        oficial: "Reino de Eswatini",                               capital: "Mbabane",                   continente: "África",            subregion: "África Austral",            km2:     17_364 },
  { id: "et", nombre: "Etiopía",                         oficial: "República Democrática Federal de Etiopía",        capital: "Addis Abeba",               continente: "África",            subregion: "África Oriental",           km2:  1_104_300 },
  { id: "fj", nombre: "Fiji",                            oficial: "República de Fiji",                               capital: "Suva",                      continente: "Oceanía",           subregion: "Melanesia",                 km2:     18_274 },
  { id: "ph", nombre: "Filipinas",                       oficial: "República de Filipinas",                          capital: "Manila",                    continente: "Asia",              subregion: "Sudeste Asiático",          km2:    343_448 },
  { id: "fi", nombre: "Finlandia",                       oficial: "República de Finlandia",                          capital: "Helsinki",                  continente: "Europa",            subregion: "Europa del Norte",          km2:    338_478 },
  { id: "fr", nombre: "Francia",                         oficial: "República Francesa",                              capital: "París",                     continente: "Europa",            subregion: "Europa Occidental",         km2:    643_801 },
  { id: "ga", nombre: "Gabón",                           oficial: "República Gabonesa",                              capital: "Libreville",                continente: "África",            subregion: "África Central",            km2:    267_667 },
  { id: "gm", nombre: "Gambia",                          oficial: "República de Gambia",                             capital: "Banjul",                    continente: "África",            subregion: "África Occidental",         km2:     11_300 },
  { id: "ge", nombre: "Georgia",                         oficial: "Georgia",                                         capital: "Tbilisi",                   continente: "Asia",              subregion: "Asia Occidental",           km2:     69_700 },
  { id: "gh", nombre: "Ghana",                           oficial: "República de Ghana",                              capital: "Accra",                     continente: "África",            subregion: "África Occidental",         km2:    238_535 },
  { id: "gd", nombre: "Granada",                         oficial: "Granada",                                         capital: "Saint George's",            continente: "América del Norte", subregion: "Caribe",                    km2:        348 },
  { id: "gr", nombre: "Grecia",                          oficial: "República Helénica",                              capital: "Atenas",                    continente: "Europa",            subregion: "Europa del Sur",            km2:    131_957 },
  { id: "gt", nombre: "Guatemala",                       oficial: "República de Guatemala",                          capital: "Ciudad de Guatemala",       continente: "América del Norte", subregion: "Centroamérica",             km2:    108_889 },
  { id: "gn", nombre: "Guinea",                          oficial: "República de Guinea",                             capital: "Conakry",                   continente: "África",            subregion: "África Occidental",         km2:    245_857 },
  { id: "gq", nombre: "Guinea Ecuatorial",               oficial: "República de Guinea Ecuatorial",                  capital: "Ciudad de la Paz",          continente: "África",            subregion: "África Central",            km2:     28_051 },
  { id: "gw", nombre: "Guinea-Bissau",                   oficial: "República de Guinea-Bissau",                      capital: "Bissau",                    continente: "África",            subregion: "África Occidental",         km2:     36_125 },
  { id: "gy", nombre: "Guyana",                          oficial: "República Cooperativa de Guyana",                 capital: "Georgetown",                continente: "América del Sur",   subregion: "Sudamérica",                km2:    214_970 },
  { id: "ht", nombre: "Haití",                           oficial: "República de Haití",                              capital: "Puerto Príncipe",           continente: "América del Norte", subregion: "Caribe",                    km2:     27_750 },
  { id: "hn", nombre: "Honduras",                        oficial: "República de Honduras",                           capital: "Tegucigalpa",               continente: "América del Norte", subregion: "Centroamérica",             km2:    112_492 },
  { id: "hu", nombre: "Hungría",                         oficial: "Hungría",                                         capital: "Budapest",                  continente: "Europa",            subregion: "Europa Oriental",           km2:     93_011 },
  { id: "in", nombre: "India",                           oficial: "República de la India",                           capital: "Nueva Delhi",               continente: "Asia",              subregion: "Asia del Sur",              km2:  3_287_263 },
  { id: "id", nombre: "Indonesia",                       oficial: "República de Indonesia",                          capital: "Jakarta",                   continente: "Asia",              subregion: "Sudeste Asiático",          km2:  1_904_570, capitalCastellana: "Yakarta" },
  { id: "iq", nombre: "Iraq",                            oficial: "República de Iraq",                               capital: "Baghdād",                   continente: "Asia",              subregion: "Asia Occidental",           km2:    437_072 },
  { id: "ie", nombre: "Irlanda",                         oficial: "Irlanda",                                         capital: "Dublín",                    continente: "Europa",            subregion: "Europa del Norte",          km2:     69_797 },
  { id: "ir", nombre: "Irán",                            oficial: "República Islámica de Irán",                      capital: "Tehrān",                    continente: "Asia",              subregion: "Asia del Sur",              km2:  1_648_195 },
  { id: "is", nombre: "Islandia",                        oficial: "República de Islandia",                           capital: "Reykjavík",                 continente: "Europa",            subregion: "Europa del Norte",          km2:    103_004 },
  { id: "mh", nombre: "Islas Marshall",                  oficial: "República de las Islas Marshall",                 capital: "Majuro",                    continente: "Oceanía",           subregion: "Micronesia",                km2:        181 },
  { id: "sb", nombre: "Islas Salomón",                   oficial: "Islas Salomón",                                   capital: "Honiara",                   continente: "Oceanía",           subregion: "Melanesia",                 km2:     28_400 },
  { id: "il", nombre: "Israel",                          oficial: "Estado de Israel",                                capital: "Jerusalén",                 continente: "Asia",              subregion: "Asia Occidental",           km2:     20_770 },
  { id: "it", nombre: "Italia",                          oficial: "República Italiana",                              capital: "Roma",                      continente: "Europa",            subregion: "Europa del Sur",            km2:    302_068 },
  { id: "jm", nombre: "Jamaica",                         oficial: "Jamaica",                                         capital: "Kingston",                  continente: "América del Norte", subregion: "Caribe",                    km2:     10_992 },
  { id: "jp", nombre: "Japón",                           oficial: "Estado del Japón",                                capital: "Tokyo",                     continente: "Asia",              subregion: "Asia Oriental",             km2:    377_972 },
  { id: "jo", nombre: "Jordania",                        oficial: "Reino Hachemita de Jordania",                     capital: "Ammān",                     continente: "Asia",              subregion: "Asia Occidental",           km2:     89_341 },
  { id: "kz", nombre: "Kazajistán",                      oficial: "República de Kazajistán",                         capital: "Astaná",                    continente: "Asia",              subregion: "Asia Central",              km2:  2_724_900 },
  { id: "ke", nombre: "Kenya",                           oficial: "República de Kenya",                              capital: "Nairobi",                   continente: "África",            subregion: "África Oriental",           km2:    581_309 },
  { id: "kg", nombre: "Kirguistán",                      oficial: "República Kirguisa",                              capital: "Bishkek",                   continente: "Asia",              subregion: "Asia Central",              km2:    199_951 },
  { id: "ki", nombre: "Kiribati",                        oficial: "República de Kiribati",                           capital: "Tarawa Sur",                continente: "Oceanía",           subregion: "Micronesia",                km2:        811 },
  { id: "kw", nombre: "Kuwait",                          oficial: "Estado de Kuwait",                                capital: "Ciudad de Kuwait",          continente: "Asia",              subregion: "Asia Occidental",           km2:     17_818 },
  { id: "la", nombre: "Laos",                            oficial: "República Democrática Popular Lao",               capital: "Vientiane",                 continente: "Asia",              subregion: "Sudeste Asiático",          km2:    236_800 },
  { id: "ls", nombre: "Lesotho",                         oficial: "Reino de Lesotho",                                capital: "Maseru",                    continente: "África",            subregion: "África Austral",            km2:     30_355 },
  { id: "lv", nombre: "Letonia",                         oficial: "República de Letonia",                            capital: "Rīga",                      continente: "Europa",            subregion: "Europa del Norte",          km2:     64_589 },
  { id: "lr", nombre: "Liberia",                         oficial: "República de Liberia",                            capital: "Monrovia",                  continente: "África",            subregion: "África Occidental",         km2:    111_369 },
  { id: "ly", nombre: "Libia",                           oficial: "Estado de Libia",                                 capital: "Trípoli",                   continente: "África",            subregion: "África del Norte",          km2:  1_759_541 },
  { id: "li", nombre: "Liechtenstein",                   oficial: "Principado de Liechtenstein",                     capital: "Vaduz",                     continente: "Europa",            subregion: "Europa Occidental",         km2:        160 },
  { id: "lt", nombre: "Lituania",                        oficial: "República de Lituania",                           capital: "Vilnius",                   continente: "Europa",            subregion: "Europa del Norte",          km2:     65_300 },
  { id: "lu", nombre: "Luxemburgo",                      oficial: "Gran Ducado de Luxemburgo",                       capital: "Luxemburgo",                continente: "Europa",            subregion: "Europa Occidental",         km2:      2_593 },
  { id: "lb", nombre: "Líbano",                          oficial: "República Libanesa",                              capital: "Bayrūt",                    continente: "Asia",              subregion: "Asia Occidental",           km2:     10_452, capitalCastellana: "Beirut" },
  { id: "mk", nombre: "Macedonia del Norte",             oficial: "República de Macedonia del Norte",                capital: "Skopje",                    continente: "Europa",            subregion: "Europa del Sur",            km2:     25_713, capitalCastellana: "Skopie" },
  { id: "mg", nombre: "Madagascar",                      oficial: "República de Madagascar",                         capital: "Antananarivo",              continente: "África",            subregion: "África Oriental",           km2:    587_295 },
  { id: "mw", nombre: "Malawi",                          oficial: "República de Malawi",                             capital: "Lilongwe",                  continente: "África",            subregion: "África Oriental",           km2:    118_484 },
  { id: "my", nombre: "Malaysia",                        oficial: "Malaysia",                                        capital: "Kuala Lumpur",              continente: "Asia",              subregion: "Sudeste Asiático",          km2:    330_803 },
  { id: "mv", nombre: "Maldivas",                        oficial: "República de Maldivas",                           capital: "Malé",                      continente: "Asia",              subregion: "Asia del Sur",              km2:        298 },
  { id: "mt", nombre: "Malta",                           oficial: "República de Malta",                              capital: "La Valeta",                 continente: "Europa",            subregion: "Europa del Sur",            km2:        316 },
  { id: "ml", nombre: "Malí",                            oficial: "República de Malí",                               capital: "Bamako",                    continente: "África",            subregion: "África Occidental",         km2:  1_240_192 },
  { id: "ma", nombre: "Marruecos",                       oficial: "Reino de Marruecos",                              capital: "Rabat",                     continente: "África",            subregion: "África del Norte",          km2:    446_550 },
  { id: "mu", nombre: "Mauricio",                        oficial: "República de Mauricio",                           capital: "Port Louis",                continente: "África",            subregion: "África Oriental",           km2:      2_040 },
  { id: "mr", nombre: "Mauritania",                      oficial: "República Islámica de Mauritania",                capital: "Nawākshūt",                 continente: "África",            subregion: "África Occidental",         km2:  1_030_700, capitalCastellana: "Nuakchot" },
  { id: "fm", nombre: "Micronesia",                      oficial: "Estados Federados de Micronesia",                 capital: "Palikir",                   continente: "Oceanía",           subregion: "Micronesia",                km2:        702 },
  { id: "md", nombre: "Moldavia",                        oficial: "República de Moldavia",                           capital: "Chișinău",                  continente: "Europa",            subregion: "Europa Oriental",           km2:     33_844 },
  { id: "mn", nombre: "Mongolia",                        oficial: "Mongolia",                                        capital: "Ulaanbaatar",               continente: "Asia",              subregion: "Asia Oriental",             km2:  1_564_116 },
  { id: "me", nombre: "Montenegro",                      oficial: "Montenegro",                                      capital: "Podgorica",                 continente: "Europa",            subregion: "Europa del Sur",            km2:     13_883 },
  { id: "mz", nombre: "Mozambique",                      oficial: "República de Mozambique",                         capital: "Maputo",                    continente: "África",            subregion: "África Oriental",           km2:    801_590 },
  { id: "mm", nombre: "Myanmar",                         oficial: "República de la Unión de Myanmar",                capital: "Nay Pyi Taw",               continente: "Asia",              subregion: "Sudeste Asiático",          km2:    676_577 },
  { id: "mx", nombre: "México",                          oficial: "Estados Unidos Mexicanos",                        capital: "Ciudad de México",          continente: "América del Norte", subregion: "Centroamérica",             km2:  1_964_375 },
  { id: "mc", nombre: "Mónaco",                          oficial: "Principado de Mónaco",                            capital: "Mónaco",                    continente: "Europa",            subregion: "Europa Occidental",         km2:       2.08 },
  { id: "na", nombre: "Namibia",                         oficial: "República de Namibia",                            capital: "Windhoek",                  continente: "África",            subregion: "África Austral",            km2:    825_615 },
  { id: "nr", nombre: "Nauru",                           oficial: "República de Nauru",                              capital: "Yaren",                     continente: "Oceanía",           subregion: "Micronesia",                km2:         21 },
  { id: "np", nombre: "Nepal",                           oficial: "República Federal Democrática de Nepal",          capital: "Kathmandu",                 continente: "Asia",              subregion: "Asia del Sur",              km2:    147_181 },
  { id: "ni", nombre: "Nicaragua",                       oficial: "República de Nicaragua",                          capital: "Managua",                   continente: "América del Norte", subregion: "Centroamérica",             km2:    120_340 },
  { id: "ng", nombre: "Nigeria",                         oficial: "República Federal de Nigeria",                    capital: "Abuja",                     continente: "África",            subregion: "África Occidental",         km2:    923_768, capitalCastellana: "Abuya" },
  { id: "no", nombre: "Noruega",                         oficial: "Reino de Noruega",                                capital: "Oslo",                      continente: "Europa",            subregion: "Europa del Norte",          km2:    385_207 },
  { id: "nz", nombre: "Nueva Zelanda",                   oficial: "Nueva Zelanda",                                   capital: "Wellington",                continente: "Oceanía",           subregion: "Australia y Nueva Zelanda", km2:    268_021 },
  { id: "ne", nombre: "Níger",                           oficial: "República del Níger",                             capital: "Niamey",                    continente: "África",            subregion: "África Occidental",         km2:  1_267_000 },
  { id: "om", nombre: "Omán",                            oficial: "Sultanato de Omán",                               capital: "Masqat",                    continente: "Asia",              subregion: "Asia Occidental",           km2:    309_500 },
  { id: "pk", nombre: "Pakistán",                        oficial: "República Islámica de Pakistán",                  capital: "Islamabad",                 continente: "Asia",              subregion: "Asia del Sur",              km2:    881_913 },
  { id: "pw", nombre: "Palau",                           oficial: "República de Palau",                              capital: "Ngerulmud",                 continente: "Oceanía",           subregion: "Micronesia",                km2:        466 },
  { id: "ps", nombre: "Palestina",                       oficial: "Estado de Palestina",                             capital: "Ramallah",                  continente: "Asia",              subregion: "Asia Occidental",           km2:      6_020 },
  { id: "pa", nombre: "Panamá",                          oficial: "República de Panamá",                             capital: "Ciudad de Panamá",          continente: "América del Norte", subregion: "Centroamérica",             km2:     74_177 },
  { id: "pg", nombre: "Papúa Nueva Guinea",              oficial: "Estado Independiente de Papúa Nueva Guinea",      capital: "Puerto Moresby",            continente: "Oceanía",           subregion: "Melanesia",                 km2:    462_840 },
  { id: "py", nombre: "Paraguay",                        oficial: "República del Paraguay",                          capital: "Asunción",                  continente: "América del Sur",   subregion: "Sudamérica",                km2:    406_756 },
  { id: "nl", nombre: "Países Bajos",                    oficial: "Reino de los Países Bajos",                       capital: "Ámsterdam",                 continente: "Europa",            subregion: "Europa Occidental",         km2:     42_201 },
  { id: "pe", nombre: "Perú",                            oficial: "República del Perú",                              capital: "Lima",                      continente: "América del Sur",   subregion: "Sudamérica",                km2:  1_285_216 },
  { id: "pl", nombre: "Polonia",                         oficial: "República de Polonia",                            capital: "Varsovia",                  continente: "Europa",            subregion: "Europa Oriental",           km2:    312_683 },
  { id: "pt", nombre: "Portugal",                        oficial: "República Portuguesa",                            capital: "Lisboa",                    continente: "Europa",            subregion: "Europa del Sur",            km2:     92_225 },
  { id: "qa", nombre: "Qatar",                           oficial: "Estado de Qatar",                                 capital: "Doha",                      continente: "Asia",              subregion: "Asia Occidental",           km2:     11_437 },
  { id: "gb", nombre: "Reino Unido",                     oficial: "Reino Unido de Gran Bretaña e Irlanda del Norte", capital: "Londres",                   continente: "Europa",            subregion: "Europa del Norte",          km2:    242_495 },
  { id: "cf", nombre: "República Centroafricana",        oficial: "República Centroafricana",                        capital: "Bangui",                    continente: "África",            subregion: "África Central",            km2:    622_984 },
  { id: "cz", nombre: "República Checa",                 oficial: "República Checa",                                 capital: "Praga",                     continente: "Europa",            subregion: "Europa Oriental",           km2:     78_871 },
  { id: "cd", nombre: "República Democrática del Congo", oficial: "República Democrática del Congo",                 capital: "Kinshasa",                  continente: "África",            subregion: "África Central",            km2:  2_344_858 },
  { id: "do", nombre: "República Dominicana",            oficial: "República Dominicana",                            capital: "Santo Domingo",             continente: "América del Norte", subregion: "Caribe",                    km2:     48_671 },
  { id: "cg", nombre: "República del Congo",             oficial: "República del Congo",                             capital: "Brazzaville",               continente: "África",            subregion: "África Central",            km2:    342_000 },
  { id: "ro", nombre: "Rumanía",                         oficial: "Rumanía",                                         capital: "Bucarest",                  continente: "Europa",            subregion: "Europa Oriental",           km2:    238_397 },
  { id: "ru", nombre: "Rusia",                           oficial: "Federación de Rusia",                             capital: "Moscú",                     continente: "Europa",            subregion: "Europa Oriental",           km2: 17_075_400 },
  { id: "rw", nombre: "Rwanda",                          oficial: "República de Rwanda",                             capital: "Kigali",                    continente: "África",            subregion: "África Oriental",           km2:     26_338 },
  { id: "ws", nombre: "Samoa",                           oficial: "Estado Independiente de Samoa",                   capital: "Apia",                      continente: "Oceanía",           subregion: "Polinesia",                 km2:      2_842 },
  { id: "kn", nombre: "San Cristóbal y Nieves",          oficial: "Federación de San Cristóbal y Nieves",            capital: "Basseterre",                continente: "América del Norte", subregion: "Caribe",                    km2:        269 },
  { id: "sm", nombre: "San Marino",                      oficial: "Serenísima República de San Marino",              capital: "San Marino",                continente: "Europa",            subregion: "Europa del Sur",            km2:       61.2 },
  { id: "vc", nombre: "San Vicente y las Granadinas",    oficial: "San Vicente y las Granadinas",                    capital: "Kingstown",                 continente: "América del Norte", subregion: "Caribe",                    km2:        389 },
  { id: "lc", nombre: "Santa Lucía",                     oficial: "Santa Lucía",                                     capital: "Castries",                  continente: "América del Norte", subregion: "Caribe",                    km2:        617 },
  { id: "st", nombre: "Santo Tomé y Príncipe",           oficial: "República Democrática de Santo Tomé y Príncipe",  capital: "Santo Tomé",                continente: "África",            subregion: "África Central",            km2:      1_001 },
  { id: "sn", nombre: "Senegal",                         oficial: "República de Senegal",                            capital: "Dakar",                     continente: "África",            subregion: "África Occidental",         km2:    196_722 },
  { id: "rs", nombre: "Serbia",                          oficial: "República de Serbia",                             capital: "Belgrado",                  continente: "Europa",            subregion: "Europa del Sur",            km2:     88_499 },
  { id: "sc", nombre: "Seychelles",                      oficial: "República de las Seychelles",                     capital: "Victoria",                  continente: "África",            subregion: "África Oriental",           km2:        459 },
  { id: "sl", nombre: "Sierra Leona",                    oficial: "República de Sierra Leona",                       capital: "Freetown",                  continente: "África",            subregion: "África Occidental",         km2:     71_740 },
  { id: "sg", nombre: "Singapur",                        oficial: "República de Singapur",                           capital: "Singapur",                  continente: "Asia",              subregion: "Sudeste Asiático",          km2:        719 },
  { id: "sy", nombre: "Siria",                           oficial: "República Árabe Siria",                           capital: "Damasco",                   continente: "Asia",              subregion: "Asia Occidental",           km2:    185_180 },
  { id: "so", nombre: "Somalia",                         oficial: "República Federal de Somalia",                    capital: "Muqdisho",                  continente: "África",            subregion: "África Oriental",           km2:    637_657, capitalCastellana: "Mogadiscio" },
  { id: "lk", nombre: "Sri Lanka",                       oficial: "República Democrática Socialista de Sri Lanka",   capital: "Sri Jayawardenapura Kotte", continente: "Asia",              subregion: "Asia del Sur",              km2:     65_610 },
  { id: "za", nombre: "Sudáfrica",                       oficial: "República de Sudáfrica",                          capital: "Pretoria",                  continente: "África",            subregion: "África Austral",            km2:  1_221_037 },
  { id: "sd", nombre: "Sudán",                           oficial: "República de Sudán",                              capital: "Khartūm",                   continente: "África",            subregion: "África del Norte",          km2:  1_886_068, capitalCastellana: "Jartum" },
  { id: "ss", nombre: "Sudán del Sur",                   oficial: "República de Sudán del Sur",                      capital: "Juba",                      continente: "África",            subregion: "África Oriental",           km2:    644_329, capitalCastellana: "Yuba" },
  { id: "se", nombre: "Suecia",                          oficial: "Reino de Suecia",                                 capital: "Estocolmo",                 continente: "Europa",            subregion: "Europa del Norte",          km2:    447_425 },
  { id: "ch", nombre: "Suiza",                           oficial: "Confederación Suiza",                             capital: "Berna",                     continente: "Europa",            subregion: "Europa Occidental",         km2:     41_291 },
  { id: "sr", nombre: "Suriname",                        oficial: "República de Suriname",                           capital: "Paramaribo",                continente: "América del Sur",   subregion: "Sudamérica",                km2:    163_270 },
  { id: "th", nombre: "Tailandia",                       oficial: "Reino de Tailandia",                              capital: "Bangkok",                   continente: "Asia",              subregion: "Sudeste Asiático",          km2:    513_120 },
  { id: "tz", nombre: "Tanzania",                        oficial: "República Unida de Tanzania",                     capital: "Dodoma",                    continente: "África",            subregion: "África Oriental",           km2:    947_303 },
  { id: "tj", nombre: "Tayikistán",                      oficial: "República de Tayikistán",                         capital: "Dushanbe",                  continente: "Asia",              subregion: "Asia Central",              km2:    143_100 },
  { id: "tl", nombre: "Timor Oriental",                  oficial: "República Democrática de Timor Oriental",         capital: "Dili",                      continente: "Asia",              subregion: "Sudeste Asiático",          km2:     14_919 },
  { id: "tg", nombre: "Togo",                            oficial: "República Togolesa",                              capital: "Lomé",                      continente: "África",            subregion: "África Occidental",         km2:     56_785 },
  { id: "to", nombre: "Tonga",                           oficial: "Reino de Tonga",                                  capital: "Nuku'alofa",                continente: "Oceanía",           subregion: "Polinesia",                 km2:        749 },
  { id: "tt", nombre: "Trinidad y Tobago",               oficial: "República de Trinidad y Tobago",                  capital: "Puerto España",             continente: "América del Norte", subregion: "Caribe",                    km2:      5_128 },
  { id: "tm", nombre: "Turkmenistán",                    oficial: "República de Turkmenistán",                       capital: "Aşgabat",                   continente: "Asia",              subregion: "Asia Central",              km2:    491_210 },
  { id: "tr", nombre: "Turquía",                         oficial: "República de Turquía",                            capital: "Ankara",                    continente: "Asia",              subregion: "Asia Occidental",           km2:    783_562 },
  { id: "tv", nombre: "Tuvalu",                          oficial: "Tuvalu",                                          capital: "Funafuti",                  continente: "Oceanía",           subregion: "Polinesia",                 km2:      25.14 },
  { id: "tn", nombre: "Túnez",                           oficial: "República Tunecina",                              capital: "Tūnis",                     continente: "África",            subregion: "África del Norte",          km2:    163_610 },
  { id: "ua", nombre: "Ucrania",                         oficial: "Ucrania",                                         capital: "Kyiv",                      continente: "Europa",            subregion: "Europa Oriental",           km2:    603_550, capitalCastellana: "Kiev" },
  { id: "ug", nombre: "Uganda",                          oficial: "República de Uganda",                             capital: "Kampala",                   continente: "África",            subregion: "África Oriental",           km2:    241_038 },
  { id: "uy", nombre: "Uruguay",                         oficial: "República Oriental del Uruguay",                  capital: "Montevideo",                continente: "América del Sur",   subregion: "Sudamérica",                km2:    176_215 },
  { id: "uz", nombre: "Uzbekistán",                      oficial: "República de Uzbekistán",                         capital: "Toshkent",                  continente: "Asia",              subregion: "Asia Central",              km2:    448_978 },
  { id: "vu", nombre: "Vanuatu",                         oficial: "República de Vanuatu",                            capital: "Port Vila",                 continente: "Oceanía",           subregion: "Melanesia",                 km2:     12_190 },
  { id: "ve", nombre: "Venezuela",                       oficial: "República Bolivariana de Venezuela",              capital: "Caracas",                   continente: "América del Sur",   subregion: "Sudamérica",                km2:    912_050 },
  { id: "vn", nombre: "Vietnam",                         oficial: "República Socialista de Vietnam",                 capital: "Hà Nội",                    continente: "Asia",              subregion: "Sudeste Asiático",          km2:    331_690 },
  { id: "ye", nombre: "Yemen",                           oficial: "República de Yemen",                              capital: "Sanā",                      continente: "Asia",              subregion: "Asia Occidental",           km2:    455_503 },
  { id: "dj", nombre: "Yibuti",                          oficial: "República de Yibuti",                             capital: "Yibuti",                    continente: "África",            subregion: "África Oriental",           km2:     23_200 },
  { id: "zm", nombre: "Zambia",                          oficial: "República de Zambia",                             capital: "Lusaka",                    continente: "África",            subregion: "África Oriental",           km2:    752_618 },
  { id: "zw", nombre: "Zimbabwe",                        oficial: "República de Zimbabwe",                           capital: "Harare",                    continente: "África",            subregion: "África Oriental",           km2:    390_757 },
];

export const PAIS_POR_ID = new Map(PAISES.map((p) => [p.id, p]));
