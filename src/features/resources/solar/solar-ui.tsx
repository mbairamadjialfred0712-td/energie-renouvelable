import { Badge } from "@/components/ui/badge";
import { DATA_NATURES, SOLAR_STATUSES, type DataNature, type SolarStatus } from "./solar-model";

export const fmt = (v: number | null, unit?: string) => (v === null ? "—" : `${v.toLocaleString("fr-FR", { maximumFractionDigits: 3 })}${unit ? ` ${unit}` : ""}`);
export const periodText = (r: { period_start: string | null; period_end: string | null; period: string | null }) =>
  r.period_start || r.period_end ? `${r.period_start ?? "?"} → ${r.period_end ?? "?"}` : r.period ?? "—";

export function StatusBadge({ status }: { status: SolarStatus }) {
  return <Badge variant={status === "validated" ? "default" : status === "rejected" ? "destructive" : "outline"}>{SOLAR_STATUSES[status]}</Badge>;
}
export function NatureBadge({ nature }: { nature: DataNature }) {
  return <Badge variant={nature === "assumption" || nature === "estimate" ? "secondary" : "outline"} className={nature === "assumption" ? "italic" : ""}>{DATA_NATURES[nature]}</Badge>;
}
