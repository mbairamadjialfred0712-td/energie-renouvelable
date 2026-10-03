import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null));

const optionalNumber = (min: number, max: number) =>
  z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .transform((value) => {
      if (value === null || value === undefined || value === "") return null;
      const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."));
      if (!Number.isFinite(parsed)) throw new Error("Valeur numérique invalide.");
      if (parsed < min || parsed > max) throw new Error(`Valeur hors bornes (${min} à ${max}).`);
      return parsed;
    });

const recordStatus = z.enum(["draft", "active", "archived"]).default("draft");

export const LOCALITY_TYPES = [
  { value: "urbain", label: "Urbain" },
  { value: "periurbain", label: "Périurbain" },
  { value: "rural", label: "Rural" },
  { value: "village", label: "Village" },
  { value: "zone_industrielle", label: "Zone industrielle" },
  { value: "autre", label: "Autre" },
] as const;

export const SITE_TYPES = [
  { value: "centrale", label: "Centrale" },
  { value: "micro_reseau", label: "Micro-réseau" },
  { value: "site_isole", label: "Site isolé" },
  { value: "site_agricole", label: "Site agricole" },
  { value: "site_industriel", label: "Site industriel" },
  { value: "autre", label: "Autre" },
] as const;

const idSchema = z.object({ id: z.string().uuid() });

const countrySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(160),
  code: z.string().trim().min(2).max(10),
  iso2: optionalText(2),
  iso3: optionalText(3),
  currency: optionalText(10),
  latitude: optionalNumber(-90, 90),
  longitude: optionalNumber(-180, 180),
  description: optionalText(2000),
  status: recordStatus,
});

const regionSchema = z.object({
  id: z.string().uuid().optional(),
  countryId: z.string().uuid(),
  name: z.string().trim().min(2).max(160),
  code: optionalText(20),
  description: optionalText(2000),
  status: recordStatus,
});

const departmentSchema = z.object({
  id: z.string().uuid().optional(),
  regionId: z.string().uuid(),
  name: z.string().trim().min(2).max(160),
  code: optionalText(20),
  description: optionalText(2000),
  status: recordStatus,
});

const localitySchema = z.object({
  id: z.string().uuid().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(2).max(160),
  code: optionalText(20),
  localityType: z.enum(["urbain", "periurbain", "rural", "village", "zone_industrielle", "autre"]).nullable().optional(),
  latitude: optionalNumber(-90, 90),
  longitude: optionalNumber(-180, 180),
  altitudeM: optionalNumber(-500, 9000),
  population: optionalNumber(0, 5_000_000_000),
  gridAccess: z.boolean().nullable().optional(),
  annualDemandKwh: optionalNumber(0, 1e15),
  dataSource: optionalText(400),
  dataPeriod: optionalText(160),
  dataQuality: optionalText(240),
  description: optionalText(2000),
  status: recordStatus,
});

const siteSchema = z.object({
  id: z.string().uuid().optional(),
  localityId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(2).max(160),
  code: optionalText(20),
  siteType: z.enum(["centrale", "micro_reseau", "site_isole", "site_agricole", "site_industriel", "autre"]).default("autre"),
  latitude: optionalNumber(-90, 90),
  longitude: optionalNumber(-180, 180),
  altitudeM: optionalNumber(-500, 9000),
  areaM2: optionalNumber(0, 1e12),
  gridAccess: z.boolean().nullable().optional(),
  gridDistanceKm: optionalNumber(0, 100000),
  plannedPowerKw: optionalNumber(0, 1e9),
  dataSource: optionalText(400),
  dataPeriod: optionalText(160),
  dataQuality: optionalText(240),
  notes: optionalText(2000),
  status: recordStatus,
});

/* ---------------------------------- Lecture --------------------------------- */

export const listCountries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("countries").select("*").order("name");
    if (error) throw new Error("Les pays n’ont pas pu être chargés.");
    return data;
  });

export const listRegions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("regions")
      .select("*, countries(id, name, code)")
      .order("name");
    if (error) throw new Error("Les régions n’ont pas pu être chargées.");
    return data;
  });

export const listDepartments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("departments")
      .select("*, regions(id, name, country_id, countries(id, name))")
      .order("name");
    if (error) throw new Error("Les départements n’ont pas pu être chargés.");
    return data;
  });

export const listLocalities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("localities")
      .select("*, departments(id, name, regions(id, name, countries(id, name)))")
      .order("name");
    if (error) throw new Error("Les localités n’ont pas pu être chargées.");
    return data;
  });

export const listStudySites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("study_sites")
      .select("*, localities(id, name, departments(id, name, regions(id, name, countries(id, name))))")
      .order("name");
    if (error) throw new Error("Les sites d’étude n’ont pas pu être chargés.");
    return data;
  });

export const getTerritorySummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const count = async (table: "countries" | "regions" | "departments" | "localities" | "study_sites") => {
      const { count: value, error } = await context.supabase.from(table).select("id", { count: "exact", head: true });
      if (error) throw new Error("Le décompte territorial a échoué.");
      return value ?? 0;
    };
    const [countries, regions, departments, localities, sites] = await Promise.all([
      count("countries"),
      count("regions"),
      count("departments"),
      count("localities"),
      count("study_sites"),
    ]);
    const [{ data: localityPoints }, { data: sitePoints }] = await Promise.all([
      context.supabase.from("localities").select("id, name, latitude, longitude, locality_type").not("latitude", "is", null).not("longitude", "is", null),
      context.supabase.from("study_sites").select("id, name, latitude, longitude, site_type").not("latitude", "is", null).not("longitude", "is", null),
    ]);
    return {
      countries,
      regions,
      departments,
      localities,
      sites,
      localityPoints: localityPoints ?? [],
      sitePoints: sitePoints ?? [],
    };
  });

/* --------------------------------- Écriture --------------------------------- */

export const saveCountry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => countrySchema.parse(input))
  .handler(async ({ data, context }) => {
    const payload = {
      name: data.name,
      code: data.code.toUpperCase(),
      iso2: data.iso2?.toUpperCase() ?? null,
      iso3: data.iso3?.toUpperCase() ?? null,
      currency: data.currency,
      latitude: data.latitude,
      longitude: data.longitude,
      description: data.description,
      status: data.status,
    };
    const query = data.id
      ? context.supabase.from("countries").update(payload).eq("id", data.id).select("id").single()
      : context.supabase.from("countries").insert({ ...payload, owner_id: context.userId }).select("id").single();
    const { data: row, error } = await query;
    if (error) throw new Error("Le pays n’a pas pu être enregistré.");
    return row;
  });

export const saveRegion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => regionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const payload = { country_id: data.countryId, name: data.name, code: data.code, description: data.description, status: data.status };
    const query = data.id
      ? context.supabase.from("regions").update(payload).eq("id", data.id).select("id").single()
      : context.supabase.from("regions").insert({ ...payload, owner_id: context.userId }).select("id").single();
    const { data: row, error } = await query;
    if (error) throw new Error("La région n’a pas pu être enregistrée.");
    return row;
  });

export const saveDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => departmentSchema.parse(input))
  .handler(async ({ data, context }) => {
    const payload = { region_id: data.regionId, name: data.name, code: data.code, description: data.description, status: data.status };
    const query = data.id
      ? context.supabase.from("departments").update(payload).eq("id", data.id).select("id").single()
      : context.supabase.from("departments").insert({ ...payload, owner_id: context.userId }).select("id").single();
    const { data: row, error } = await query;
    if (error) throw new Error("Le département n’a pas pu être enregistré.");
    return row;
  });

const localityPayload = (data: z.infer<typeof localitySchema>) => ({
  department_id: data.departmentId ?? null,
  name: data.name,
  code: data.code,
  locality_type: data.localityType ?? null,
  latitude: data.latitude,
  longitude: data.longitude,
  altitude_m: data.altitudeM,
  population: data.population,
  grid_access: data.gridAccess ?? null,
  annual_demand_kwh: data.annualDemandKwh,
  data_source: data.dataSource,
  data_period: data.dataPeriod,
  data_quality: data.dataQuality,
  description: data.description,
  status: data.status,
});

export const saveLocality = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => localitySchema.parse(input))
  .handler(async ({ data, context }) => {
    const payload = localityPayload(data);
    const query = data.id
      ? context.supabase.from("localities").update(payload).eq("id", data.id).select("id").single()
      : context.supabase.from("localities").insert({ ...payload, owner_id: context.userId }).select("id").single();
    const { data: row, error } = await query;
    if (error) throw new Error("La localité n’a pas pu être enregistrée.");
    return row;
  });

export const saveStudySite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => siteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const payload = {
      locality_id: data.localityId ?? null,
      name: data.name,
      code: data.code,
      site_type: data.siteType,
      latitude: data.latitude,
      longitude: data.longitude,
      altitude_m: data.altitudeM,
      area_m2: data.areaM2,
      grid_access: data.gridAccess ?? null,
      grid_distance_km: data.gridDistanceKm,
      planned_power_kw: data.plannedPowerKw,
      data_source: data.dataSource,
      data_period: data.dataPeriod,
      data_quality: data.dataQuality,
      notes: data.notes,
      status: data.status,
    };
    const query = data.id
      ? context.supabase.from("study_sites").update(payload).eq("id", data.id).select("id").single()
      : context.supabase.from("study_sites").insert({ ...payload, owner_id: context.userId }).select("id").single();
    const { data: row, error } = await query;
    if (error) throw new Error("Le site d’étude n’a pas pu être enregistré.");
    return row;
  });

/* -------------------------------- Suppression ------------------------------- */

const deleteFrom = async (
  supabase: { from: (table: string) => any },
  table: "countries" | "regions" | "departments" | "localities" | "study_sites",
  id: string,
  childTable?: "regions" | "departments" | "localities" | "study_sites",
  childKey?: string,
) => {
  if (childTable && childKey) {
    const { count, error: countError } = await supabase.from(childTable).select("id", { count: "exact", head: true }).eq(childKey, id);
    if (countError) throw new Error("La vérification des dépendances a échoué.");
    if ((count ?? 0) > 0) throw new Error(`Suppression refusée : ${count} enregistrement(s) dépendant(s) existent encore.`);
  }
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw new Error("La suppression a échoué.");
  return { ok: true };
};

export const deleteCountry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(({ data, context }) => deleteFrom(context.supabase as never, "countries", data.id, "regions", "country_id"));

export const deleteRegion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(({ data, context }) => deleteFrom(context.supabase as never, "regions", data.id, "departments", "region_id"));

export const deleteDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(({ data, context }) => deleteFrom(context.supabase as never, "departments", data.id, "localities", "department_id"));

export const deleteLocality = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(({ data, context }) => deleteFrom(context.supabase as never, "localities", data.id, "study_sites", "locality_id"));

export const deleteStudySite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(({ data, context }) => deleteFrom(context.supabase as never, "study_sites", data.id));

/* ------------------------------ Import contrôlé ----------------------------- */

export type ImportLevel = "countries" | "regions" | "departments" | "localities";

const importRowSchema = z.object({
  name: z.string().trim().min(2).max(160),
  code: optionalText(20),
  parent: optionalText(160),
  description: optionalText(2000),
  iso2: optionalText(2),
  iso3: optionalText(3),
  currency: optionalText(10),
  localityType: optionalText(40),
  latitude: optionalNumber(-90, 90),
  longitude: optionalNumber(-180, 180),
  altitudeM: optionalNumber(-500, 9000),
  population: optionalNumber(0, 5_000_000_000),
  annualDemandKwh: optionalNumber(0, 1e15),
  gridAccess: z.boolean().nullable().optional(),
  dataSource: optionalText(400),
  dataPeriod: optionalText(160),
  dataQuality: optionalText(240),
});

const PARENT: Record<ImportLevel, { table: "countries" | "regions" | "departments"; label: string; required: boolean } | null> = {
  countries: null,
  regions: { table: "countries", label: "pays", required: true },
  departments: { table: "regions", label: "région", required: true },
  localities: { table: "departments", label: "département", required: false },
};
const PARENT_COLUMN: Record<ImportLevel, string | null> = { countries: null, regions: "country_id", departments: "region_id", localities: "department_id" };

/**
 * Import contrôlé d’un niveau territorial. Les parents sont résolus par nom ou code parmi
 * les enregistrements existants ; aucun parent n’est créé automatiquement.
 */
export const importTerritories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        level: z.enum(["countries", "regions", "departments", "localities"]),
        rows: z.array(importRowSchema).min(1).max(5000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase as unknown as { from: (t: string) => any };
    const parentInfo = PARENT[data.level];
    const parentColumn = PARENT_COLUMN[data.level];

    // Parents disponibles (nom et code, insensibles à la casse)
    const parentIndex = new Map<string, string[]>();
    if (parentInfo) {
      const { data: parents, error } = await db.from(parentInfo.table).select("id, name, code");
      if (error) throw new Error("La lecture des niveaux parents a échoué.");
      for (const p of (parents ?? []) as Array<{ id: string; name: string; code: string | null }>) {
        for (const key of [p.name, p.code].filter(Boolean) as string[]) {
          const k = key.trim().toLowerCase();
          parentIndex.set(k, [...new Set([...(parentIndex.get(k) ?? []), p.id])]);
        }
      }
    }

    // Doublons existants
    const selectCols = parentColumn ? `name, code, ${parentColumn}` : "name, code";
    const { data: existing, error: existingError } = await db.from(data.level).select(selectCols);
    if (existingError) throw new Error("La vérification des doublons a échoué.");
    const known = new Set<string>();
    for (const row of (existing ?? []) as Array<Record<string, string | null>>) {
      const scope = parentColumn ? row[parentColumn] ?? "" : "";
      known.add(`${scope}|n:${row["name"]!.trim().toLowerCase()}`);
      if (data.level === "countries" && row["code"]) known.add(`|c:${row["code"].trim().toLowerCase()}`);
    }

    const allowedTypes = LOCALITY_TYPES.map((t) => t.value) as readonly string[];
    const accepted: Array<Record<string, unknown>> = [];
    const skipped: Array<{ line: number; name: string; reason: string }> = [];

    data.rows.forEach((row, index) => {
      const line = index + 2;
      let parentId: string | null = null;
      if (parentInfo) {
        if (!row.parent) {
          if (parentInfo.required) return skipped.push({ line, name: row.name, reason: `Colonne ${parentInfo.label} vide.` });
        } else {
          const matches = parentIndex.get(row.parent.trim().toLowerCase()) ?? [];
          if (matches.length === 0) return skipped.push({ line, name: row.name, reason: `${parentInfo.label} « ${row.parent} » introuvable. Importez d’abord le niveau parent.` });
          if (matches.length > 1) return skipped.push({ line, name: row.name, reason: `${parentInfo.label} « ${row.parent} » ambigu : utilisez son code.` });
          parentId = matches[0]!;
        }
      }
      const nameKey = `${parentId ?? ""}|n:${row.name.trim().toLowerCase()}`;
      if (known.has(nameKey)) return skipped.push({ line, name: row.name, reason: "Doublon : déjà présent à ce niveau." });

      if (data.level === "countries") {
        if (!row.code) return skipped.push({ line, name: row.name, reason: "Code pays obligatoire." });
        const codeKey = `|c:${row.code.toLowerCase()}`;
        if (known.has(codeKey)) return skipped.push({ line, name: row.name, reason: `Doublon : le code ${row.code} existe déjà.` });
        known.add(codeKey);
        known.add(nameKey);
        return accepted.push({
          owner_id: context.userId, name: row.name, code: row.code.toUpperCase(), iso2: row.iso2?.toUpperCase() ?? null, iso3: row.iso3?.toUpperCase() ?? null,
          currency: row.currency?.toUpperCase() ?? null, latitude: row.latitude, longitude: row.longitude, description: row.description, status: "draft",
        });
      }
      if (data.level === "regions" || data.level === "departments") {
        known.add(nameKey);
        return accepted.push({ owner_id: context.userId, [parentColumn!]: parentId, name: row.name, code: row.code, description: row.description, status: "draft" });
      }
      const type = row.localityType?.toLowerCase() ?? null;
      if (type && !allowedTypes.includes(type)) return skipped.push({ line, name: row.name, reason: `Type de zone inconnu : « ${row.localityType} ».` });
      known.add(nameKey);
      return accepted.push({
        owner_id: context.userId, department_id: parentId, name: row.name, code: row.code, locality_type: type, latitude: row.latitude, longitude: row.longitude,
        altitude_m: row.altitudeM, population: row.population, annual_demand_kwh: row.annualDemandKwh, grid_access: row.gridAccess ?? null,
        data_source: row.dataSource, data_period: row.dataPeriod, data_quality: row.dataQuality, description: row.description, status: "draft",
      });
    });

    for (let i = 0; i < accepted.length; i += 500) {
      const { error } = await db.from(data.level).insert(accepted.slice(i, i + 500));
      if (error) throw new Error(`L’insertion a échoué après ${i} ligne(s) : ${error.message}`);
    }
    return { inserted: accepted.length, skipped };
  });
