// Lo común a los dos mapas Leaflet. Leaflet interpola HTML crudo en divIcon, tooltips y
// popups: todo texto de los datos pasa por `escapar`.
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export const escapar = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const ESPANA: [number, number] = [40.2, -3.7];

// Arranca con España entera hasta el primer encuadre. `soltar` lo desmonta.
export function crearMapa(contenedor: HTMLDivElement): { mapa: L.Map; soltar: () => void } {
  const mapa = L.map(contenedor, { zoomControl: false, attributionControl: false }).setView(ESPANA, 6);
  // La atribución antes que las teselas, para que recoja su texto.
  L.control.attribution({ position: "bottomleft", prefix: false }).addTo(mapa);
  L.control.zoom({ position: "topright" }).addTo(mapa);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap",
    maxZoom: 18,
  }).addTo(mapa);

  // Leaflet no recalcula su tamaño cuando cambia el del contenedor.
  const ro = new ResizeObserver(() => mapa.invalidateSize());
  ro.observe(contenedor);
  return { mapa, soltar: () => { ro.disconnect(); mapa.remove(); } };
}

export const iconoPin = (etiqueta: string, nombre: string) =>
  L.divIcon({
    className: "fr-pin-wrap",
    html: `<span class="fr-pin">${escapar(etiqueta)}</span><span class="fr-pin-globo">${escapar(nombre)}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
