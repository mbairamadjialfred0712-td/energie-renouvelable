/** User-scoped access/read helpers, shared by authenticated engine handlers. */
export async function assertCanRun(supabase: any, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error("Rôles indisponibles.");
  if (!data?.some((r: { role: string }) => r.role === "admin" || r.role === "engineer")) throw new Error("Seuls les administrateurs et ingénieurs peuvent lancer une simulation.");
}

export async function readSimulationSeries(supabase: any, id: string, resultType: string) {
  const { data: sim, error: simError } = await supabase.from("simulations").select("id,name,status").eq("id", id).maybeSingle();
  if (simError) throw new Error("Lecture de la simulation indisponible.");
  if (!sim) throw new Error("Simulation introuvable.");
  if (sim.status !== "completed") throw new Error("Seules les simulations terminées fournissent des séries.");
  const { data: row, error } = await supabase.from("simulation_results").select("timeseries,unit").eq("simulation_id", id).eq("result_type", resultType).maybeSingle();
  if (error) throw new Error("Série indisponible.");
  const t = row?.timeseries as { values?: number[] } | null;
  if (!row || !t?.values?.length) return null;
  const { data: full, error: fullError } = await supabase.from("simulations").select("parameters").eq("id", id).single();
  if (fullError || !full) throw new Error("Lecture des paramètres indisponible.");
  const ts = (full.parameters as { request?: { timeseries?: { timestamps?: string[]; utc_offset_hours?: number } } } | null)?.request?.timeseries;
  if (!ts?.timestamps?.length || ts.timestamps.length !== t.values.length || typeof ts.utc_offset_hours !== "number") throw new Error("Série enregistrée incomplète : horodatages ou fuseau manquants.");
  return { name: sim.name as string, values: t.values, unit: row.unit as string, timestamps: ts.timestamps, utcOffset: ts.utc_offset_hours };
}