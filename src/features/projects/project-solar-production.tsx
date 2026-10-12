import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listSolar, getSolarAccess } from "@/lib/solar.functions";
import { calculateProjectSolar } from "@/lib/solar-production.functions";
import type { ProjectRecord } from "@/lib/projects.functions";
import { isAnnualPeriod, PV_LIMITS, PV_METHOD } from "@/services/simulation/solar-pv-engine";

export function ProjectSolarProduction({ record }: { record: ProjectRecord }) {
  const qc = useQueryClient();
  const [resourceId, setResourceId] = useState(""); const [power, setPower] = useState(""); const [pr, setPr] = useState(""); const [assumptions, setAssumptions] = useState("");
  const solar = useQuery({ queryKey: ["solar"], queryFn: () => listSolar() });
  const access = useQuery({ queryKey: ["solar-access"], queryFn: () => getSolarAccess() });
  const eligible = (solar.data ?? []).filter((r) => r.status === "validated" && r.annual !== null && r.annual > 0 && isAnnualPeriod(r.period_start, r.period_end) && (!record.project.localityId || record.project.localityId === r.locality_id));
  const selected = eligible.find((r) => r.id === resourceId);
  const calculate = useMutation({ mutationFn: calculateProjectSolar, onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["project", record.project.id] }); } });
  return <section className="space-y-5 py-4">
    <h2 className="text-lg font-semibold">Estimation photovoltaïque annuelle</h2>
    <p className="text-sm text-muted-foreground">{PV_LIMITS}</p>
    {access.data?.canWrite && <form className="space-y-4 border-y border-border py-5" onSubmit={(e) => { e.preventDefault(); calculate.mutate({ data: { projectId: record.project.id, resourceId, powerKwp: Number(power), performanceRatio: Number(pr), assumptions } }); }}>
      <label className="block space-y-2 text-sm">Jeu solaire validé<Select value={resourceId} onValueChange={setResourceId}><SelectTrigger aria-label="Jeu solaire validé"><SelectValue placeholder="Sélectionner un jeu annuel" /></SelectTrigger><SelectContent>{eligible.map((r) => <SelectItem key={r.id} value={r.id}>{r.locality_name} · {r.period_start} → {r.period_end} · {r.source}</SelectItem>)}</SelectContent></Select></label>
      {solar.isLoading ? <p className="text-sm text-muted-foreground">Chargement des jeux…</p> : solar.error ? <p role="alert" className="text-sm text-destructive">Les jeux solaires n’ont pas pu être chargés.</p> : !eligible.length && <p className="text-sm text-muted-foreground">Aucun jeu validé avec irradiation annuelle positive et année complète disponible pour ce projet.</p>}
      {selected && <p className="text-sm">Irradiation : {selected.annual?.toLocaleString("fr-FR")} kWh/m²/an · {selected.locality_name} · Source : {selected.source}</p>}
      <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm">Puissance installée (kWc)<Input aria-label="Puissance installée (kWc)" required type="number" min="0.001" max="1000000000" step="any" value={power} onChange={(e) => setPower(e.target.value)} /></label><label className="space-y-2 text-sm">Ratio de performance (0 &lt; PR ≤ 1)<Input aria-label="Ratio de performance" required type="number" min="0.001" max="1" step="any" value={pr} onChange={(e) => setPr(e.target.value)} /></label></div>
      <label className="block space-y-2 text-sm">Hypothèses techniques et justification du ratio<Textarea aria-label="Hypothèses techniques" required minLength={10} maxLength={4000} value={assumptions} onChange={(e) => setAssumptions(e.target.value)} /></label>
      <p className="text-xs text-muted-foreground">Puissance et ratio : hypothèses déclarées. {PV_METHOD}. La correspondance du jeu au site doit être vérifiée.</p>
      <Button type="submit" disabled={!selected || calculate.isPending}><Calculator />{calculate.isPending ? "Calcul en cours…" : "Estimer la production solaire"}</Button>
      {calculate.error && <p role="alert" className="text-sm text-destructive">{calculate.error.message}</p>}
      {calculate.isSuccess && <p role="status" className="text-sm text-primary">Estimation enregistrée avec sources et hypothèses.</p>}
    </form>}
    {!access.data?.canWrite && <p className="text-sm text-muted-foreground">Calcul réservé aux ingénieurs et administrateurs ; estimations disponibles en lecture.</p>}
    {!record.productions.length && <p className="text-sm text-muted-foreground">Aucune estimation enregistrée.</p>}
    {record.productions.map((r) => { const s = r.input_snapshot && typeof r.input_snapshot === "object" && !Array.isArray(r.input_snapshot) ? r.input_snapshot : {}; return <article key={r.id} className="space-y-3 border-b border-border py-4">
      <h3 className="text-xl font-semibold tabular-nums">{Number(r.production_kwh).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} kWh/an <span className="text-sm font-normal text-muted-foreground">— estimation indicative</span></h3>
      <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("fr-FR")} · {r.engine_version}</p>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">{[["Puissance (kWc)", s["power_kwp"]], ["Ratio PR", s["performance_ratio"]], ["Irradiation (kWh/m²/an)", s["annual_irradiation"]], ["Période", `${s["period_start"]} → ${s["period_end"]}`], ["Source", s["source"]], ["Référence", s["reference"]], ["Nature", s["data_nature"]], ["Hypothèses", s["assumptions"]]].map(([label, value]) => <div key={String(label)}><dt className="text-muted-foreground">{String(label)}</dt><dd className="break-words">{String(value ?? "—")}</dd></div>)}</dl>
      <p className="text-xs text-muted-foreground">{r.method}</p>
    </article>; })}
  </section>;
}