import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { analyzeHourly, annualSum, markHomonyms, parsePvgisTmy, pvReadiness, type PlaceResult } from "@/features/site-reference/site-reference";
import { WEATHER_METRICS, WEATHER_LABELS, parseNasaWeather, weatherIssues, type WeatherSample } from "@/features/weather/weather-model";
import { parseGeocoding } from "./providers/geocoding.server";

export type UserDb = SupabaseClient<Database>;
export async function localPlaces(db: UserDb, query: string, countryCode: string) {
  const safe = query.replace(/[%_(),]/g, " ").trim();
  const { data, error } = await db.from("localities").select("id,name,latitude,longitude,data_source,data_quality,departments(name,regions(name,countries(name,iso2)))").ilike("name", `%${safe}%`).order("name").limit(30);
  if (error) throw new Error("Le référentiel local est indisponible.");
  return (data ?? []).flatMap((r): Omit<PlaceResult, "homonym">[] => {
    const country = r.departments?.regions?.countries;
    if (r.latitude === null || r.longitude === null || (countryCode && country?.iso2?.toLowerCase() !== countryCode.toLowerCase())) return [];
    return [{ key: `locality:${r.id}`, name: r.name, country: country?.name ?? null, region: r.departments?.regions?.name ?? null, latitude: r.latitude, longitude: r.longitude, precision: "locality_center", source: r.data_source ?? "Référentiel local — source non renseignée", localityId: r.id }];
  });
}

/** Relit l’identité retenue ; aucun libellé/source fournisseur n’est accepté depuis le navigateur. */
export async function resolvePlace(db: UserDb, ownerId: string, key: string, requestId: string | null): Promise<PlaceResult> {
  if (key.startsWith("locality:")) {
    const id = key.slice(9); if (!/^[\da-f-]{36}$/i.test(id)) throw new Error("Localité invalide.");
    const { data: r, error } = await db.from("localities").select("id,name,latitude,longitude,data_source,departments(name,regions(name,countries(name)))").eq("id", id).maybeSingle();
    if (error || !r || r.latitude === null || r.longitude === null) throw new Error("Localité inaccessible ou sans coordonnées.");
    return { key, name: r.name, country: r.departments?.regions?.countries?.name ?? null, region: r.departments?.regions?.name ?? null, latitude: r.latitude, longitude: r.longitude, precision: "locality_center", source: r.data_source ?? "Référentiel local — source non renseignée", localityId: r.id, homonym: false };
  }
  if (!requestId) throw new Error("Référence de géocodage manquante.");
  const { data: r, error } = await db.from("provider_requests").select("payload,provider,status,owner_id").eq("id", requestId).eq("owner_id", ownerId).maybeSingle();
  if (error || !r || r.provider !== "nominatim" || r.status !== "ok") throw new Error("Résultat de recherche inaccessible.");
  const place = parseGeocoding(r.payload).find((p) => p.key === key);
  if (!place) throw new Error("Lieu non présent dans la réponse de géocodage enregistrée.");
  return { ...place, homonym: false };
}

export function meteorologySummary(samples: WeatherSample[], unit: string) {
  const calendar = analyzeHourly(samples.map((r) => r.timestamp)); const issues = weatherIssues(samples);
  const variables = WEATHER_METRICS.map((metric) => {
    const values = samples.map((r) => r[metric]); const missing = values.filter((v) => v === null).length;
    const available = values.filter((v): v is number => v !== null);
    const mean = available.length === values.length && available.length > 0 ? available.reduce((a, b) => a + b, 0) / available.length : null;
    return { metric, label: WEATHER_LABELS[metric], unit: metric === "temp_air" ? "°C" : metric === "wind_speed" ? "m/s à 10 m" : unit, count: values.length - missing, missing,
      status: missing ? "missing" as const : "modeled" as const, annual: ["ghi", "dni", "dhi"].includes(metric) && calendar.pvCompatible ? annualSum(values) : null, mean };
  });
  return { calendar, missing: issues.missing, errors: issues.errors, variables };
}

export async function readDossier(db: UserDb, ownerId: string, id: string) {
  const { data: dossier, error } = await db.from("site_reference_dossiers").select("*").eq("id", id).eq("owner_id", ownerId).maybeSingle();
  if (error || !dossier) throw new Error("Dossier de site absent ou inaccessible.");
  const ids = [dossier.pvgis_request_id, dossier.nasa_request_id].filter((v): v is string => !!v);
  const requests = ids.length ? await db.from("provider_requests").select("id,provider,adapter_version,request_url,status,error,payload,params,retrieved_at").in("id", ids).eq("owner_id", ownerId) : { data: [], error: null };
  if (requests.error) throw new Error("Les sources du dossier sont inaccessibles.");
  const sources = (requests.data ?? []).map((r) => {
    try {
      if (r.status !== "ok") throw new Error(r.error ?? "Récupération incomplète.");
      if (r.provider === "pvgis") {
        const tmy = parsePvgisTmy(r.payload);
        return { id: r.id, provider: r.provider, version: r.adapter_version, url: r.request_url, retrievedAt: r.retrieved_at, status: "ok", error: null, summary: meteorologySummary(tmy.rows, "W/m²"),
          elevation: tmy.elevation, period: `${tmy.yearMin}–${tmy.yearMax} · année type (pas une mesure de 2023)`, radiationDb: tmy.radiationDb, meteoDb: tmy.meteoDb, offset: tmy.irradianceTimeOffset,
          transformation: "Libellé de référence 2023, mois/jour/heure UTC conservés. Valeurs et horodatages source conservés intégralement ; aucun décalage, suppression ni interpolation." };
      }
      const params = r.params as { start?: string; end?: string };
      if (!params.start || !params.end) throw new Error("Période NASA absente.");
      const start = `${params.start.slice(0, 4)}-${params.start.slice(4, 6)}-${params.start.slice(6, 8)}`; const end = `${params.end.slice(0, 4)}-${params.end.slice(4, 6)}-${params.end.slice(6, 8)}`;
      const samples = parseNasaWeather(r.payload, start, end);
      return { id: r.id, provider: r.provider, version: r.adapter_version, url: r.request_url, retrievedAt: r.retrieved_at, status: "ok", error: null, summary: meteorologySummary(samples, "Wh/m² par heure"), elevation: null, period: `${start} → ${end}`, radiationDb: "NASA POWER", meteoDb: "MERRA-2 / réanalyse", offset: 0, transformation: "Calendrier UTC d’origine conservé, 29 février inclus. Valeurs absentes conservées comme manquantes. Aucune conversion." };
    } catch (e) { return { id: r.id, provider: r.provider, version: r.adapter_version, url: r.request_url, retrievedAt: r.retrieved_at, status: "error", error: e instanceof Error ? e.message : "Source illisible.", summary: null, elevation: null, period: null, radiationDb: null, meteoDb: null, offset: null, transformation: null }; }
  });
  let weatherStatus: string | null = null;
  if (dossier.weather_dataset_id) { const r = await db.from("site_weather_datasets").select("status").eq("id", dossier.weather_dataset_id).maybeSingle(); weatherStatus = r.data?.status ?? null; }
  const pvgis = sources.find((s) => s.provider === "pvgis");
  return { dossier: { ...dossier, geography: dossier.geography as unknown as PlaceResult & { originalLatitude: number; originalLongitude: number; correctionNote: string; positionConfirmed: boolean } }, sources, weatherStatus,
    readiness: pvReadiness({ calendar: pvgis?.summary?.calendar ?? null, siteSaved: !!dossier.site_id, weatherValidated: weatherStatus === "validated" }) };
}

/** Enregistrement atomique via RPC dédiée ; l’API relit le cache propriétaire avant l’appel. */
export async function referenceWeather(db: UserDb, ownerId: string, dossierId: string) {
  const { data: d, error } = await db.from("site_reference_dossiers").select("*").eq("id", dossierId).eq("owner_id", ownerId).maybeSingle();
  if (error || !d?.pvgis_request_id) throw new Error("Dossier ou source PVGIS inaccessible.");
  const { data: raw, error: re } = await db.from("provider_requests").select("payload,request_url,retrieved_at").eq("id", d.pvgis_request_id).eq("owner_id", ownerId).eq("status", "ok").maybeSingle();
  if (re || !raw) throw new Error("Source PVGIS non disponible.");
  const tmy = parsePvgisTmy(raw.payload); const issues = weatherIssues(tmy.rows);
  if (issues.missing || issues.gaps || issues.errors.length) throw new Error("La fiche météo ne peut pas être préparée : données manquantes ou invalides.");
  return { dossier: d, samples: tmy.rows.map(({ raw_time: _raw, ...r }) => r), elevation: tmy.elevation,
    provenance: { method: "PVGIS TMY · libellé de référence non bissextile 2023", request_url: raw.request_url, retrieved_at: raw.retrieved_at, provider_request_id: d.pvgis_request_id,
      original_timestamps: tmy.rows.map((r) => r.raw_time), months_selected: tmy.monthsSelected, reference_year: 2023, irradiance_time_offset_hours: tmy.irradianceTimeOffset,
      pv_integration_status: "pending_scientific_timing_validation", limitations: "Données modélisées, pas de mesures sur le site. Année type construite à partir de mois de différentes années. Aucun décalage d’irradiance appliqué. La convention temporelle PVGIS/PVWatts doit être validée avant raccordement au calcul réel." } as unknown as Json };
}
export { markHomonyms };
