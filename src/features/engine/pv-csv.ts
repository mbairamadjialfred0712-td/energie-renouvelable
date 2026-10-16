// Lecture d'un CSV horaire — aucune interpolation, aucune valeur comblée. Cellule vide → null (refusée par le moteur).
export const PV_SERIES = [
  { key: "ghi", label: "GHI", unit: "W/m²", required: true },
  { key: "dni", label: "DNI", unit: "W/m²", required: true },
  { key: "dhi", label: "DHI", unit: "W/m²", required: true },
  { key: "temp_air", label: "Température de l’air", unit: "°C", required: true },
  { key: "wind_speed", label: "Vent à 10 m", unit: "m/s", required: true },
  { key: "albedo", label: "Albédo", unit: "-", required: false },
] as const;

export type ParsedSeries = { timestamps: string[]; series: Record<string, (number | null)[]>; errors: string[] };

export function parsePvCsv(text: string): ParsedSeries {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  const errors: string[] = [];
  if (lines.length < 2) return { timestamps: [], series: {}, errors: ["Fichier vide."] };
  const head = lines[0] ?? "";
  const sep = head.includes(";") ? ";" : ",";
  const header = head.split(sep).map((h) => h.trim().toLowerCase());
  const ti = header.indexOf("timestamp");
  if (ti < 0) errors.push("Colonne « timestamp » manquante.");
  const cols: Record<string, number> = {};
  for (const s of PV_SERIES) {
    const i = header.indexOf(s.key);
    if (i >= 0) cols[s.key] = i;
    else if (s.required) errors.push(`Colonne « ${s.key} » manquante.`);
  }
  const unknown = header.filter((h) => h !== "timestamp" && !PV_SERIES.some((s) => s.key === h));
  if (unknown.length) errors.push(`Colonnes non prises en charge : ${unknown.join(", ")}.`);
  const timestamps: string[] = [];
  const series: Record<string, (number | null)[]> = Object.fromEntries(Object.keys(cols).map((k) => [k, []]));
  for (const line of lines.slice(1)) {
    const cells = line.split(sep);
    timestamps.push((cells[ti] ?? "").trim());
    for (const [k, i] of Object.entries(cols)) {
      const raw = (cells[i] ?? "").trim();
      const num = raw === "" ? null : Number(sep === ";" ? raw.replace(",", ".") : raw);
      series[k]?.push(num === null || Number.isFinite(num) ? num : null);
    }
  }
  return { timestamps, series, errors };
}
