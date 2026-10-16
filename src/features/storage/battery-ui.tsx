import { STATUSES } from "./battery-model";

export const val = (x: unknown, unit: string) => (x == null || x === "" ? "—" : typeof x === "number" ? `${x.toLocaleString("fr-FR", { maximumFractionDigits: 3 })}${unit ? ` ${unit}` : ""}` : typeof x === "boolean" ? (x ? "Oui" : "Non") : String(x));
export function StatusBadge({ status }: { status: keyof typeof STATUSES }) {
  const cls = status === "validated" ? "bg-status-ready/15 text-foreground" : status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground";
  return <span className={`inline-flex shrink-0 rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{STATUSES[status]}</span>;
}
