import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getProjectFinance, saveProjectFinance } from "@/lib/finance.functions";
import { computeLcoe, LCOE_FORMULA } from "@/features/finance/finance-engine";

const fmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 4 });

type Fields = { currency: string; capex: string; annualOpex: string; lifetimeYears: string; discountRatePct: string; yearOneProductionKwh: string; degradationPctPerYear: string; notes: string };
type Replacement = { year: string; cost: string };

export function ProjectFinance({ projectId, canWrite }: { projectId: string; canWrite: boolean }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["project-finance", projectId], queryFn: () => getProjectFinance({ data: { projectId } }) });
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<Fields | null>(null);
  const [simId, setSimId] = useState<string>("");
  const [replacements, setReplacements] = useState<Replacement[]>([]);
  const [error, setError] = useState<string | null>(null);

  const a = data?.assumptions ?? null;
  const linked = data?.linkedProduction ?? null;

  const result = useMemo(() => {
    const production = linked ? linked.annualKwh : a?.year_one_production_kwh;
    if (!a || production == null) return null;
    try {
      return computeLcoe({
        currency: a.currency, capex: a.capex, annualOpex: a.annual_opex, lifetimeYears: a.lifetime_years,
        discountRatePct: a.discount_rate_pct, yearOneProductionKwh: production,
        degradationPctPerYear: a.degradation_pct_per_year,
        replacements: (a.replacements as { year: number; cost: number }[]) ?? [],
      });
    } catch { return null; }
  }, [a, linked]);

  function startEdit() {
    setError(null);
    setFields({
      currency: a?.currency ?? "EUR",
      capex: a ? String(a.capex) : "",
      annualOpex: a ? String(a.annual_opex) : "",
      lifetimeYears: a ? String(a.lifetime_years) : "",
      discountRatePct: a ? String(a.discount_rate_pct) : "",
      yearOneProductionKwh: a?.year_one_production_kwh != null ? String(a.year_one_production_kwh) : "",
      degradationPctPerYear: a ? String(a.degradation_pct_per_year) : "",
      notes: a?.notes ?? "",
    });
    setSimId(a?.production_simulation_id ?? "");
    setReplacements(((a?.replacements as { year: number; cost: number }[] | null) ?? []).map((r) => ({ year: String(r.year), cost: String(r.cost) })));
    setEditing(true);
  }

  const num = (s: string) => Number(s.replace(/\s/g, "").replace(",", "."));

  async function submit() {
    if (!fields) return;
    setError(null);
    try {
      await saveProjectFinance({ data: {
        project_id: projectId, currency: fields.currency.trim() || "EUR",
        capex: num(fields.capex), annual_opex: num(fields.annualOpex), lifetime_years: num(fields.lifetimeYears),
        discount_rate_pct: num(fields.discountRatePct), degradation_pct_per_year: num(fields.degradationPctPerYear),
        year_one_production_kwh: simId ? null : (fields.yearOneProductionKwh.trim() === "" ? null : num(fields.yearOneProductionKwh)),
        production_simulation_id: simId || null,
        replacements: replacements.filter((r) => r.year.trim() || r.cost.trim()).map((r) => ({ year: num(r.year), cost: num(r.cost) })),
        notes: fields.notes.trim() || null,
      } });
      toast.success("Hypothèses financières enregistrées et historisées.");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["project-finance", projectId] });
    } catch (e) { setError(e instanceof Error ? e.message : "Entrées invalides."); }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  if (editing && fields) {
    const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFields({ ...fields, [k]: e.target.value });
    return <div className="space-y-4 border border-border bg-background p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1"><Label>Devise</Label><Input value={fields.currency} onChange={set("currency")} /></div>
        <div className="space-y-1"><Label>CAPEX total ({fields.currency}) *</Label><Input value={fields.capex} onChange={set("capex")} /></div>
        <div className="space-y-1"><Label>OPEX annuel ({fields.currency}) *</Label><Input value={fields.annualOpex} onChange={set("annualOpex")} /></div>
        <div className="space-y-1"><Label>Durée d'étude (ans) *</Label><Input value={fields.lifetimeYears} onChange={set("lifetimeYears")} /></div>
        <div className="space-y-1"><Label>Taux d'actualisation (%) *</Label><Input value={fields.discountRatePct} onChange={set("discountRatePct")} /></div>
        <div className="space-y-1"><Label>Dégradation annuelle (%) *</Label><Input value={fields.degradationPctPerYear} onChange={set("degradationPctPerYear")} /></div>
      </div>
      <div className="space-y-1"><Label>Production année 1</Label>
        <select aria-label="Source de production" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={simId} onChange={(e) => setSimId(e.target.value)}>
          <option value="">Saisie manuelle (hypothèse déclarée)</option>
          {(data?.simulations ?? []).filter((s) => (s.engine_version ?? "").startsWith("photovoltaic")).map((s) => <option key={s.id} value={s.id}>Simulation « {s.name} » — production annuelle enregistrée</option>)}
        </select></div>
      {!simId && <div className="max-w-xs space-y-1"><Label>Production année 1 (kWh) *</Label><Input value={fields.yearOneProductionKwh} onChange={set("yearOneProductionKwh")} /></div>}
      <div className="space-y-2">
        <div className="flex items-center justify-between"><Label>Remplacements d'équipements</Label><Button type="button" variant="outline" size="sm" onClick={() => setReplacements((r) => [...r, { year: "", cost: "" }])}>Ajouter</Button></div>
        {replacements.map((r, i) => <div key={i} className="flex items-center gap-2"><Input aria-label={`Année remplacement ${i + 1}`} placeholder="Année" value={r.year} onChange={(e) => setReplacements(replacements.map((x, j) => j === i ? { ...x, year: e.target.value } : x))} /><Input aria-label={`Coût remplacement ${i + 1}`} placeholder={`Coût (${fields.currency})`} value={r.cost} onChange={(e) => setReplacements(replacements.map((x, j) => j === i ? { ...x, cost: e.target.value } : x))} /><Button type="button" variant="ghost" size="sm" onClick={() => setReplacements(replacements.filter((_, j) => j !== i))}>Retirer</Button></div>)}
      </div>
      <div className="space-y-1"><Label>Notes / sources des coûts</Label><textarea className="h-16 w-full rounded-md border bg-background px-3 py-2 text-sm" value={fields.notes} onChange={set("notes")} /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setEditing(false)}>Annuler</Button><Button onClick={submit}>Enregistrer les hypothèses</Button></div>
    </div>;
  }

  return <div className="space-y-4 border border-border bg-background p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-semibold">Analyse économique (LCOE)</h3>
      {canWrite && <Button size="sm" variant="outline" onClick={startEdit}>{a ? "Modifier les hypothèses" : "Renseigner les hypothèses"}</Button>}
    </div>
    {!a ? <p className="text-sm text-muted-foreground">Aucune hypothèse financière enregistrée pour ce projet. Aucune valeur n'est estimée par défaut.</p> : <>
      <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <p><span className="text-muted-foreground">CAPEX : </span>{fmt.format(a.capex)} {a.currency}</p>
        <p><span className="text-muted-foreground">OPEX annuel : </span>{fmt.format(a.annual_opex)} {a.currency}</p>
        <p><span className="text-muted-foreground">Durée : </span>{a.lifetime_years} ans</p>
        <p><span className="text-muted-foreground">Taux d'actualisation : </span>{a.discount_rate_pct} %</p>
        <p><span className="text-muted-foreground">Dégradation : </span>{a.degradation_pct_per_year} %/an</p>
        <p><span className="text-muted-foreground">Remplacements : </span>{(a.replacements as { year: number; cost: number }[]).length ? (a.replacements as { year: number; cost: number }[]).map((r) => `an ${r.year} (${fmt.format(r.cost)})`).join(", ") : "aucun"}</p>
      </div>
      <p className="text-sm"><span className="text-muted-foreground">Production année 1 : </span>
        {linked ? <>{fmt.format(linked.annualKwh)} kWh <Badge variant="outline" className="ml-1">calculée — simulation « {linked.name} »</Badge></>
          : a.year_one_production_kwh != null ? <>{fmt.format(a.year_one_production_kwh)} kWh <Badge variant="secondary" className="ml-1">hypothèse saisie</Badge></> : "—"}</p>
      {result ? <div className="border border-primary/30 bg-primary/5 p-4">
        <p className="text-2xl font-semibold">{fmt.format(result.lcoePerKwh)} {a.currency}/kWh</p>
        <p className="mt-1 text-xs text-muted-foreground">{LCOE_FORMULA}. Coûts actualisés {fmt.format(result.totalDiscountedCost)} {a.currency} · énergie actualisée {fmt.format(result.totalDiscountedEnergyKwh)} kWh. Indicateur, pas un prix de vente.</p>
        <Button asChild size="sm" variant="outline" className="mt-3"><Link to="/finance" search={{ project: projectId }}>Ouvrir dans Analyse financière</Link></Button>
      </div> : <p className="text-sm text-muted-foreground">LCOE non calculable : production année 1 manquante.</p>}
      {a.notes && <p className="text-xs text-muted-foreground">Notes : {a.notes}</p>}
      <p className="text-xs text-muted-foreground">Dernière mise à jour : {new Date(a.updated_at).toLocaleString("fr-FR")} · {(data?.history.length ?? 0)} version(s) historisée(s).</p>
    </>}
  </div>;
}
