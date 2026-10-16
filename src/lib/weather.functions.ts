import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { NASA_FIELDS, parseNasaWeather, weatherIssues, weatherSampleSchema } from "@/features/weather/weather-model";

export const listWeather = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from("site_weather_datasets").select("id,name,site_id,locality_id,source,reference,data_nature,radiation_unit,wind_height_m,status,period_start,period_end,created_at,study_sites(name),localities(name)").order("created_at", { ascending: false });
  if (error) throw new Error("Les fiches météo n’ont pas pu être chargées.");
  return data;
});
export const getWeather = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i)).handler(async ({ data, context }) => {
  const { data: row, error } = await context.supabase.from("site_weather_datasets").select("*,study_sites(name,latitude,longitude),localities(name)").eq("id", data.id).maybeSingle();
  if (error) throw new Error("La fiche météo n’a pas pu être chargée.");
  return row;
});
const saveSchema = z.object({ site_id: z.string().uuid(), name: z.string().trim().min(2).max(200), source: z.string().trim().min(2).max(500), reference: z.string().max(2000), data_nature: z.enum(["measured","imported","api","estimate","assumption"]), radiation_unit: z.enum(["W/m²","Wh/m²"]), wind_height_m: z.number().finite().positive(), notes: z.string().max(4000), samples: z.array(weatherSampleSchema).min(1).max(8784), provenance: z.object({ method: z.string().max(100), file_name: z.string().max(300).optional(), request_url: z.string().max(2000).optional(), retrieved_at: z.string().max(100).optional(), limitations: z.string().max(2000).optional() }) });
export const saveWeather = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => saveSchema.parse(i)).handler(async ({ data, context }) => {
  const issues = weatherIssues(data.samples); if (issues.errors.length) throw new Error(issues.errors.slice(0, 5).join(" "));
  const { data: site } = await context.supabase.from("study_sites").select("locality_id").eq("id", data.site_id).maybeSingle();
  if (!site?.locality_id) throw new Error("Le site doit être rattaché à une localité.");
  const first = data.samples[0]; const last = data.samples[data.samples.length - 1];
  if (!first || !last) throw new Error("Série vide.");
  const { data: row, error } = await context.supabase.from("site_weather_datasets").insert({ ...data, samples: data.samples, owner_id: context.userId, locality_id: site.locality_id, period_start: first.timestamp, period_end: last.timestamp, status: "unverified", time_standard: "UTC" }).select("id").single();
  if (error || !row) throw new Error("Enregistrement refusé : un rôle Ingénieur ou Administrateur est nécessaire.");
  return row;
});
export const setWeatherStatus = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["unverified","in_review","validated","rejected","archived"]) }).parse(i)).handler(async ({ data, context }) => {
  const { data: rows, error } = await context.supabase.from("site_weather_datasets").update({ status: data.status }).eq("id", data.id).select("id");
  if (error || !rows?.length) throw new Error("Changement refusé : droits insuffisants ou série incomplète.");
  return { ok: true };
});
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => Number.isFinite(Date.parse(d)) && new Date(d).toISOString().slice(0,10) === d, "Date invalide");
export const fetchNasaWeather = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => z.object({ site_id: z.string().uuid(), start: day, end: day }).parse(i)).handler(async ({ data, context }) => {
  const { data: roles, error: roleError } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
  if (roleError || !roles?.some((r) => r.role === "admin" || r.role === "engineer")) throw new Error("Récupération réservée aux ingénieurs et administrateurs.");
  const duration = (Date.parse(data.end) - Date.parse(data.start)) / 86400000;
  if (data.start < "2001-01-01" || duration < 0 || duration > 365 || Date.parse(data.end) >= Date.now()) throw new Error("Choisissez une période passée de 366 jours maximum, depuis 2001.");
  const { data: site } = await context.supabase.from("study_sites").select("latitude,longitude,locality_id").eq("id", data.site_id).maybeSingle();
  if (!site?.locality_id || site.latitude === null || site.longitude === null) throw new Error("Renseignez les coordonnées du site et sa localité avant la récupération.");
  const url = new URL("https://power.larc.nasa.gov/api/temporal/hourly/point");
  url.search = new URLSearchParams({ parameters: Object.values(NASA_FIELDS).join(","), community: "RE", latitude: String(site.latitude), longitude: String(site.longitude), start: data.start.replaceAll("-", ""), end: data.end.replaceAll("-", ""), format: "JSON", "time-standard": "UTC" }).toString();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(55000) });
    if (!response.ok) return { error: "NASA POWER est indisponible ou ne dispose pas de cette période. Réessayez avec une période plus courte.", preview: null };
    const samples = parseNasaWeather(await response.json(), data.start, data.end);
    return { error: null, preview: { samples, source: "NASA POWER — données satellitaires et réanalyse", reference: url.href, radiation_unit: "Wh/m²" as const, wind_height_m: 10, data_nature: "api" as const, provenance: { method: "NASA POWER hourly UTC", request_url: url.href, retrieved_at: new Date().toISOString(), limitations: "Données de grille, non mesurées sur le site. Rayonnements conservés en Wh/m² par intervalle horaire, sans conversion. Température à 2 m, vent à 10 m. Aucune interpolation ni remplacement des valeurs manquantes." } } };
  } catch { return { error: "La récupération météo a échoué. Réessayez ou importez un fichier.", preview: null }; }
});