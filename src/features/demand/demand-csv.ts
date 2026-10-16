import { CATEGORIES, STATUSES, MONTH_DAYS, equipmentEnergy, inventoryTotal, measurementDaily, overlappingMeasurements } from "./demand-engine";
import type { DemandRow } from "@/lib/demand.functions";

// CSV « ; » + virgule décimale (Excel français), une ligne par équipement, mesure et synthèse.
const HEAD = ["demande_id", "demande", "categorie", "localite", "site", "periode_debut", "periode_fin", "statut", "source", "methode_acquisition", "type_ligne", "nature_donnee", "libelle",
  "quantite", "puissance_unitaire", "unite_puissance", "heures_par_jour", "jours_par_semaine", "facteur_utilisation", "priorite",
  "kwh_jour_usage_estime", "kwh_jour_moyen_estime", "kwh_mois_estime_30j", "mesure_debut", "mesure_fin", "energie_mesuree", "unite_energie", "kwh_jour_moyen_mesure", "pointe_mesuree_kw", "remarque"];

const num = (x: number | null | undefined, d = 4) => (x == null || !Number.isFinite(x) ? "" : String(Number(x.toFixed(d))).replace(".", ","));
const cell = (x: string) => (/[;"\n\r]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x);

export function demandsToCsv(rows: DemandRow[]) {
  const out: string[][] = [HEAD];
  for (const d of rows) {
    const base = [d.id, d.name, d.category === "autre" ? `Autre — ${d.consumer_detail ?? ""}` : CATEGORIES[d.category], d.locality_name ?? "", d.site_name ?? "", d.period_start ?? "", d.period_end ?? "", STATUSES[d.status], d.source, d.acquisition_method ?? ""];
    const blank = (n: number) => Array(n).fill("");
    for (const e of d.equipment) {
      const r = equipmentEnergy(e);
      out.push([...base, "equipement", "estimation (inventaire)", e.name, num(e.quantity), num(e.unit_power), e.power_unit, num(e.hours_per_day), num(e.days_per_week), num(e.usage_factor), e.priority,
        num(r?.perUseDayKwh), num(r?.avgDailyKwh), num(r?.monthlyKwh), ...blank(6), r ? (e.usage_factor != null ? `Facteur : ${e.usage_factor_definition} (${e.usage_factor_source})` : "") : "Ligne incomplète : non calculée"]);
    }
    for (const m of d.measurements) {
      const x = measurementDaily(m);
      out.push([...base, "mesure", "mesure", m.notes ?? "Consommation mesurée", ...blank(10), m.start, m.end, num(m.energy), m.unit, num(x?.avgDailyKwh), num(m.peak_kw), m.unit === "Wh" ? "Moyenne : Wh ÷ 1 000 ÷ jours inclusifs" : "Moyenne : kWh ÷ jours inclusifs"]);
    }
    const inv = inventoryTotal(d.equipment);
    out.push([...base, "synthese", "estimation (calculée)", "Total inventaire", ...blank(8), inv.complete ? num(inv.avgDailyKwh) : "", inv.complete ? num(inv.monthlyKwh) : "", ...blank(5), num(d.measured_peak_kw),
      [inv.complete ? `Mois = moyenne journalière × ${MONTH_DAYS} j ; l’inventaire ne remplace pas une mesure` : inv.reason, overlappingMeasurements(d.measurements) ? "Mesures chevauchantes : non sommées" : ""].filter(Boolean).join(" · ")]);
  }
  return "\uFEFF" + out.map((r) => r.map((c) => cell(String(c))).join(";")).join("\r\n");
}

export function downloadCsv(content: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
