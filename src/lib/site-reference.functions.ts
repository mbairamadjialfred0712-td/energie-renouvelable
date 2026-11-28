import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { dossierInput, searchPlaceSchema } from "@/features/site-reference/contracts";
import type { Json } from "@/integrations/supabase/types";

export const listSiteDossiers = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const r = await context.supabase.from("site_reference_dossiers").select("id,name,geography,created_at,weather_dataset_id").eq("owner_id", context.userId).order("created_at", { ascending: false }).limit(30);
  if (r.error) throw new Error("Les dossiers de site sont indisponibles."); return r.data;
});

export const searchSitePlaces = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => searchPlaceSchema.parse(i)).handler(async ({ data, context }) => {
  const { localPlaces, markHomonyms } = await import("./site-reference.server");
  const local = await localPlaces(context.supabase, data.query, data.countryCode);
  if (!data.external) return { places: markHomonyms(local), requestId: null, warning: null, cached: false };
  const { assertCanRun } = await import("./engine-access.server"); await assertCanRun(context.supabase, context.userId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server"); const { retrieveGeocoding } = await import("./providers/geocoding.server");
  try { const result = await retrieveGeocoding(supabaseAdmin, context.userId, data.query, data.countryCode); return { places: markHomonyms([...local, ...result.places]), requestId: result.id, warning: null, cached: result.cached }; }
  catch (e) { return { places: markHomonyms(local), requestId: null, warning: e instanceof Error ? e.message : "Recherche externe indisponible.", cached: false }; }
});

export const createSiteDossier = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => dossierInput.parse(i)).handler(async ({ data, context }) => {
  const { assertCanRun } = await import("./engine-access.server"); await assertCanRun(context.supabase, context.userId);
  if (data.nasaYear !== null && Date.UTC(data.nasaYear + 1, 0, 1) > Date.now()) throw new Error("NASA : choisir une année entièrement passée.");
  const { resolvePlace } = await import("./site-reference.server"); const selected = await resolvePlace(context.supabase, context.userId, data.key, data.geocodingRequestId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const geography = { ...selected, latitude: data.latitude, longitude: data.longitude, originalLatitude: selected.latitude, originalLongitude: selected.longitude, correctionNote: data.correctionNote, positionConfirmed: true, confirmedBy: context.userId, confirmedAt: new Date().toISOString() };
  const { data: d, error } = await supabaseAdmin.from("site_reference_dossiers").insert({ owner_id: context.userId, name: data.name, geography: geography as unknown as Json }).select("id").single();
  if (error || !d) throw new Error("Le dossier de site n’a pas pu être créé.");
  const warnings: string[] = [];
  const { retrievePvgis } = await import("./providers/pvgis.server"); const { retrieveNasa } = await import("./providers/nasa.server");
  const saveReference = async (provider: "pvgis" | "nasa", run: () => Promise<{ id: string }>) => {
    try { const r = await run(); const saved = await supabaseAdmin.from("site_reference_dossiers").update(provider === "pvgis" ? { pvgis_request_id: r.id } : { nasa_request_id: r.id }).eq("id", d.id).eq("owner_id", context.userId).select("id").single(); if (saved.error) throw new Error("Source reçue mais référence non sauvegardée."); }
    catch (e) { warnings.push(`${provider.toUpperCase()} : ${e instanceof Error ? e.message : "Source indisponible."}`); }
  };
  await Promise.all([saveReference("pvgis", () => retrievePvgis(supabaseAdmin, context.userId, data.latitude, data.longitude)), ...(data.nasaYear !== null ? [saveReference("nasa", () => retrieveNasa(supabaseAdmin, context.userId, data.latitude, data.longitude, `${data.nasaYear}-01-01`, `${data.nasaYear}-12-31`))] : [])]);
  return { id: d.id, warnings };
});

export const getSiteDossier = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i)).handler(async ({ data, context }) => {
  const { readDossier } = await import("./site-reference.server"); return readDossier(context.supabase, context.userId, data.id);
});

export const retrieveDossierSource = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => z.object({ id: z.string().uuid(), provider: z.enum(["pvgis", "nasa"]), year: z.number().int().min(2001).max(2100).optional() }).parse(i)).handler(async ({ data, context }) => {
  const { assertCanRun } = await import("./engine-access.server"); await assertCanRun(context.supabase, context.userId);
  const { readDossier } = await import("./site-reference.server"); const d = await readDossier(context.supabase, context.userId, data.id); const g = d.dossier.geography;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let requestId: string;
  if (data.provider === "pvgis") { const { retrievePvgis } = await import("./providers/pvgis.server"); requestId = (await retrievePvgis(supabaseAdmin, context.userId, g.latitude, g.longitude)).id; }
  else { if (!data.year || Date.UTC(data.year + 1, 0, 1) > Date.now()) throw new Error("Choisir une année NASA entièrement passée."); const { retrieveNasa } = await import("./providers/nasa.server"); requestId = (await retrieveNasa(supabaseAdmin, context.userId, g.latitude, g.longitude, `${data.year}-01-01`, `${data.year}-12-31`)).id; }
  if (d.dossier.weather_dataset_id && data.provider === "pvgis") throw new Error("Une fiche météo est déjà préparée. Créez un nouveau dossier pour conserver cette version.");
  const r = await supabaseAdmin.from("site_reference_dossiers").update(data.provider === "pvgis" ? { pvgis_request_id: requestId } : { nasa_request_id: requestId }).eq("id", data.id).eq("owner_id", context.userId).select("id").single();
  if (r.error) throw new Error("La source n’a pas pu être liée au dossier."); return { ok: true };
});

export const prepareReferenceStudy = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i)).handler(async ({ data, context }) => {
  const { assertCanRun } = await import("./engine-access.server"); await assertCanRun(context.supabase, context.userId);
  const { referenceWeather } = await import("./site-reference.server"); const p = await referenceWeather(context.supabase, context.userId, data.id);
  if (p.dossier.weather_dataset_id) return { weatherId: p.dossier.weather_dataset_id };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: id, error } = await supabaseAdmin.rpc("prepare_site_reference_weather", { _owner: context.userId, _dossier: data.id, _samples: p.samples, _provenance: p.provenance, _elevation: p.elevation });
  if (error || typeof id !== "string") throw new Error("La préparation du site et de la météo a été refusée."); return { weatherId: id };
});
