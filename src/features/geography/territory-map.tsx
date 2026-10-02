import { useEffect, useRef } from "react";

export type MapPoint = { id: string; name: string; latitude: number; longitude: number; kind: "locality" | "site"; detail?: string | null };

/**
 * Carte OpenStreetMap chargée uniquement dans le navigateur.
 * Seuls les points disposant de coordonnées GPS réelles sont affichés : aucune position n’est estimée.
 */
export function TerritoryMap({ points }: { points: MapPoint[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | null = null;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (disposed || !containerRef.current) return;
      map = L.map(containerRef.current, { scrollWheelZoom: false }).setView([7.5, -5.5], 3);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: "© contributeurs OpenStreetMap",
      }).addTo(map);
      const bounds: Array<[number, number]> = [];
      for (const point of points) {
        const color = point.kind === "site" ? "#d4a017" : "#1f4e79";
        L.circleMarker([point.latitude, point.longitude], { radius: 7, color, fillColor: color, fillOpacity: 0.75, weight: 2 })
          .bindPopup(
            `<strong>${escapeHtml(point.name)}</strong><br/>${point.kind === "site" ? "Site d’étude" : "Localité"}${point.detail ? ` · ${escapeHtml(point.detail)}` : ""}<br/>${point.latitude.toFixed(5)}°, ${point.longitude.toFixed(5)}°`,
          )
          .addTo(map);
        bounds.push([point.latitude, point.longitude]);
      }
      if (bounds.length === 1) map.setView(bounds[0]!, 10);
      if (bounds.length > 1) map.fitBounds(bounds, { padding: [30, 30] });
    })();
    return () => {
      disposed = true;
      map?.remove();
    };
  }, [points]);

  return <div ref={containerRef} className="relative z-0 h-[420px] w-full border border-border bg-muted" aria-label="Carte des localités et sites d’étude" />;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}
