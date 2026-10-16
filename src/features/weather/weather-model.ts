import { z } from "zod";

export const WEATHER_COLUMNS = ["timestamp", "ghi", "dni", "dhi", "temp_air", "wind_speed"] as const;
export const WEATHER_METRICS = WEATHER_COLUMNS.slice(1) as ("ghi" | "dni" | "dhi" | "temp_air" | "wind_speed")[];
export const WEATHER_LABELS = { ghi: "GHI", dni: "DNI", dhi: "DHI", temp_air: "Température de l’air", wind_speed: "Vitesse du vent" };
export const weatherSampleSchema = z.object({
  timestamp: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$/),
  ghi: z.number().finite().nonnegative().nullable(), dni: z.number().finite().nonnegative().nullable(), dhi: z.number().finite().nonnegative().nullable(),
  temp_air: z.number().finite().min(-273.15).nullable(), wind_speed: z.number().finite().nonnegative().nullable(),
});
export type WeatherSample = z.infer<typeof weatherSampleSchema>;
export function weatherIssues(rows: WeatherSample[]) {
  const errors: string[] = []; let missing = 0; let gaps = 0;
  if (!rows.length || rows.length > 8784) errors.push("La fiche doit contenir entre 1 et 8 784 heures.");
  rows.forEach((row, i) => {
    const time = Date.parse(row.timestamp);
    if (!weatherSampleSchema.safeParse(row).success || !Number.isFinite(time) || new Date(time).toISOString().replace(".000Z", "Z") !== row.timestamp) errors.push(`Ligne ${i + 2} : date ou valeur invalide.`);
    const previous = rows[i - 1];
    if (previous) { const delta = time - Date.parse(previous.timestamp); if (delta <= 0) errors.push(`Ligne ${i + 2} : heure dupliquée ou désordonnée.`); else if (delta > 3600000) gaps += delta / 3600000 - 1; }
    for (const metric of WEATHER_METRICS) if (row[metric] === null) missing++;
  });
  return { errors, missing, gaps };
}

/** Strict rectangular CSV: quoted cells are supported; malformed values never become zeros. */
export function csvCells(text: string): string[][] {
  const delimiter = (text.split(/\r?\n/)[0] ?? "").includes(";") ? ";" : ",";
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') { if (quoted && input[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (c === delimiter && !quoted) { row.push(cell); cell = ""; }
    else if ((c === "\n" || c === "\r") && !quoted) { if (c === "\r" && input[i + 1] === "\n") i++; row.push(cell); if (row.some((s) => s.trim())) rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (quoted) throw new Error("Guillemets non fermés dans le CSV.");
  row.push(cell); if (row.some((s) => s.trim())) rows.push(row);
  return rows;
}

export function parseWeatherCells(cells: unknown[][]): WeatherSample[] {
  const header = (cells[0] ?? []).map((c) => String(c ?? "").trim().toLowerCase());
  if (new Set(header).size !== header.length || WEATHER_COLUMNS.some((key) => !header.includes(key)) || header.some((key) => !WEATHER_COLUMNS.includes(key as typeof WEATHER_COLUMNS[number]))) throw new Error("Colonnes attendues : timestamp, ghi, dni, dhi, temp_air, wind_speed.");
  const rows = cells.slice(1).filter((r) => r.some((c) => c !== null && c !== "")).map((r, i) => {
    if (r.length !== header.length) throw new Error(`Ligne ${i + 2} : nombre de colonnes incorrect.`);
    const field = (key: string) => r[header.indexOf(key)];
    const numeric = (key: string) => { const raw = String(field(key) ?? "").trim().replace(",", "."); if (!raw) return null; const value = Number(raw); if (!Number.isFinite(value)) throw new Error(`Ligne ${i + 2} : ${key} n’est pas numérique.`); return value; };
    return { timestamp: String(field("timestamp") ?? "").trim(), ghi: numeric("ghi"), dni: numeric("dni"), dhi: numeric("dhi"), temp_air: numeric("temp_air"), wind_speed: numeric("wind_speed") };
  });
  const { errors } = weatherIssues(rows); if (errors.length) throw new Error(errors.slice(0, 5).join(" "));
  return rows;
}
export const weatherCsv = (rows: WeatherSample[]) => "\uFEFF" + [WEATHER_COLUMNS.join(";"), ...rows.map((r) => WEATHER_COLUMNS.map((k) => r[k] ?? "").join(";"))].join("\r\n") + "\r\n";

export const NASA_FIELDS = { ghi: "ALLSKY_SFC_SW_DWN", dni: "ALLSKY_SFC_SW_DNI", dhi: "ALLSKY_SFC_SW_DIFF", temp_air: "T2M", wind_speed: "WS10M" } as const;
export function parseNasaWeather(payload: unknown, start: string, end: string): WeatherSample[] {
  const schema = z.object({ header: z.object({ fill_value: z.number(), time_standard: z.literal("UTC") }), parameters: z.record(z.object({ units: z.string() })), properties: z.object({ parameter: z.record(z.record(z.number().finite())) }) });
  const data = schema.parse(payload);
  for (const [key, field] of Object.entries(NASA_FIELDS)) {
    const expected = key === "temp_air" ? "C" : key === "wind_speed" ? "m/s" : "Wh/m^2";
    if (data.parameters[field]?.units !== expected || !data.properties.parameter[field]) throw new Error("La source a renvoyé une unité ou une colonne inattendue.");
  }
  const rows: WeatherSample[] = [];
  for (let t = Date.parse(`${start}T00:00:00Z`); t <= Date.parse(`${end}T23:00:00Z`); t += 3600000) {
    const timestamp = new Date(t).toISOString().replace(".000Z", "Z");
    const key = timestamp.slice(0, 13).replace(/[-T]/g, "");
    const value = (field: keyof typeof NASA_FIELDS) => { const n = data.properties.parameter[NASA_FIELDS[field]]?.[key]; return n === undefined || n === data.header.fill_value ? null : n; };
    rows.push({ timestamp, ghi: value("ghi"), dni: value("dni"), dhi: value("dhi"), temp_air: value("temp_air"), wind_speed: value("wind_speed") });
  }
  const issues = weatherIssues(rows); if (issues.errors.length) throw new Error("Valeurs incohérentes renvoyées par la source météo.");
  return rows;
}