import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CATEGORIES, STATUSES, ASSUMPTIONS, MONTH_DAYS, equipmentEnergy, inventoryTotal, measurementDaily, overlappingMeasurements } from "./demand-engine";
import type { DemandRow } from "@/lib/demand.functions";

const axis = { tick: { fontSize: 11, fill: "var(--muted-foreground)" }, stroke: "var(--border)" };
export const fmt = (v: number | null | undefined, unit: string, d = 2) => (v == null ? "—" : `${v.toLocaleString("fr-FR", { maximumFractionDigits: d })} ${unit}`);
export const periodText = (r: { period_start: string | null; period_end: string | null }) => (r.period_start || r.period_end ? `${r.period_start ?? "?"} → ${r.period_end ?? "?"}` : "Période non renseignée");
export const categoryText = (r: Pick<DemandRow, "category" | "consumer_detail">) => (r.category === "autre" ? `Autre — ${r.consumer_detail ?? ""}` : CATEGORIES[r.category]);

export function DemandStatusBadge({ status }: { status: keyof typeof STATUSES }) {
  const cls = status === "validated" ? "bg-status-ready/15 text-foreground" : status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground";
  return <span className={`inline-flex shrink-0 rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{STATUSES[status]}</span>;
}
export function Empty({ text }: { text: string }) {
  return <p className="grid h-40 place-items-center border border-dashed border-border px-4 text-center text-sm text-muted-foreground">{text}</p>;
}
function Card({ title, meta, children }: { title: string; meta: string; children: React.ReactNode }) {
  return <div className="min-w-0 border border-border bg-background p-4"><h3 className="text-sm font-semibold">{title}</h3><p className="mb-3 text-xs text-muted-foreground">{meta}</p>{children}</div>;
}

export function CategoryChart({ rows }: { rows: DemandRow[] }) {
  const data = Object.entries(rows.reduce<Record<string, number>>((m, r) => ({ ...m, [CATEGORIES[r.category]]: (m[CATEGORIES[r.category]] ?? 0) + 1 }), {})).map(([name, n]) => ({ name, n }));
  return <Card title="Répartition par catégorie de consommateur" meta="Nombre de fiches enregistrées · donnée saisie">
    {!data.length ? <Empty text="Aucune demande enregistrée." /> : <div className="h-56"><ResponsiveContainer><BarChart data={data}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="name" {...axis} /><YAxis {...axis} allowDecimals={false} width={30} /><Tooltip /><Bar dataKey="n" name="Fiches" fill="var(--chart-1)" isAnimationActive={false} /></BarChart></ResponsiveContainer></div>}
  </Card>;
}

export function ConsumptionSummary({ d }: { d: DemandRow }) {
  const inv = inventoryTotal(d.equipment);
  const overlap = overlappingMeasurements(d.measurements);
  return <div className="grid gap-4 lg:grid-cols-2">
    <div className="border border-border bg-background p-4 text-sm"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">Estimation par inventaire (calculée)</p>
      {inv.complete ? <dl className="mt-2 grid grid-cols-2 gap-2"><dt className="text-muted-foreground">Moyenne journalière</dt><dd className="font-medium">{fmt(inv.avgDailyKwh, "kWh/j")}</dd><dt className="text-muted-foreground">Mensuelle ({MONTH_DAYS} j)</dt><dd className="font-medium">{fmt(inv.monthlyKwh, "kWh/mois")}</dd><dt className="text-muted-foreground">Puissance nominale installée</dt><dd className="font-medium">{fmt(inv.installedKw, "kW")}</dd></dl> : <p className="mt-2 text-muted-foreground">{inv.reason}</p>}
      <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-muted-foreground">{ASSUMPTIONS.map((a) => <li key={a}>{a}</li>)}</ul></div>
    <div className="border border-border bg-background p-4 text-sm"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">Consommation mesurée (donnée)</p>
      {!d.measurements.length ? <p className="mt-2 text-muted-foreground">Aucune mesure enregistrée. L’estimation ne remplace pas une mesure.</p> : <ul className="mt-2 space-y-1">{d.measurements.map((m, i) => { const x = measurementDaily(m); return <li key={i}>{m.start} → {m.end} : <b>{fmt(m.energy, m.unit)}</b>{x ? ` · moyenne ${fmt(x.avgDailyKwh, "kWh/j")} sur ${x.days} j` : ""}{m.peak_kw != null ? ` · pointe ${fmt(m.peak_kw, "kW")}` : ""}</li>; })}</ul>}
      {overlap && <p className="mt-2 text-xs text-destructive">Des périodes de mesure se chevauchent : aucune somme n’est calculée.</p>}
      {d.measured_peak_kw != null && <p className="mt-2">Puissance maximale mesurée : {fmt(d.measured_peak_kw, "kW")}</p>}</div>
  </div>;
}

export function DemandCharts({ d }: { d: DemandRow }) {
  const eq = d.equipment.map((e) => ({ name: e.name, v: equipmentEnergy(e)?.avgDailyKwh ?? null })).filter((x) => x.v != null);
  const prof = [...d.daily_profile].sort((a, b) => a.start_hour - b.start_hour).map((s) => ({ name: `${s.start_hour}–${s.end_hour} h`, [s.nature === "measured" ? "Mesuré" : "Estimé"]: s.power_kw }));
  const meas = [...d.measurements].sort((a, b) => a.start.localeCompare(b.start)).map((m) => ({ name: `${m.start}→${m.end}`, v: measurementDaily(m)?.avgDailyKwh ?? null }));
  const inv = inventoryTotal(d.equipment);
  const cmp = inv.complete && meas.length ? meas.map((m) => ({ name: m.name, Mesuré: m.v, Estimé: inv.avgDailyKwh })) : [];
  return <div className="grid gap-4 lg:grid-cols-2">
    <Card title="Consommation estimée par équipement" meta="kWh/j (moyenne sur 7 jours) · calculée depuis l’inventaire">{!eq.length ? <Empty text="Aucun équipement complet." /> : <div className="h-56"><ResponsiveContainer><BarChart data={eq}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="name" {...axis} /><YAxis {...axis} width={50} /><Tooltip /><Bar dataKey="v" name="kWh/j estimés" fill="var(--chart-2)" isAnimationActive={false} /></BarChart></ResponsiveContainer></div>}</Card>
    <Card title="Profil journalier" meta={`kW par créneau · ${periodText(d)} · mesuré ou estimé selon la saisie`}>{!prof.length ? <Empty text="Aucun créneau horaire saisi." /> : <div className="h-56"><ResponsiveContainer><BarChart data={prof}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="name" {...axis} /><YAxis {...axis} width={50} /><Tooltip /><Legend /><Bar dataKey="Mesuré" fill="var(--chart-1)" isAnimationActive={false} /><Bar dataKey="Estimé" fill="var(--chart-3)" isAnimationActive={false} /></BarChart></ResponsiveContainer></div>}</Card>
    <Card title="Évolution des mesures" meta="kWh/j moyen par période mesurée · donnée mesurée (Wh ÷ 1 000 si nécessaire)">{meas.length < 2 ? <Empty text="Il faut au moins deux mesures datées." /> : <div className="h-56"><ResponsiveContainer><BarChart data={meas}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="name" {...axis} /><YAxis {...axis} width={50} /><Tooltip /><Bar dataKey="v" name="kWh/j mesurés" fill="var(--chart-1)" isAnimationActive={false} /></BarChart></ResponsiveContainer></div>}</Card>
    <Card title="Mesuré vs estimé" meta="kWh/j · mesure (donnée) et inventaire (calcul)">{!cmp.length ? <Empty text="Comparaison possible seulement avec une mesure et un inventaire complet." /> : <div className="h-56"><ResponsiveContainer><BarChart data={cmp}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="name" {...axis} /><YAxis {...axis} width={50} /><Tooltip /><Legend /><Bar dataKey="Mesuré" fill="var(--chart-1)" isAnimationActive={false} /><Bar dataKey="Estimé" fill="var(--chart-2)" isAnimationActive={false} /></BarChart></ResponsiveContainer></div>}</Card>
  </div>;
}
