import type { ResourceRow } from "@/lib/resources.functions";
import { RESOURCE_DETAILS, type ResourceType } from "./resource-types";
import { recordedDate } from "@/services/simulation/solar-pv-engine";

export function resourceEvolutionPoints(rows: ResourceRow[], type: ResourceType, metric: string, unit: string, locality = "all", from = "", to = "") {
  const spec = RESOURCE_DETAILS[type].fields.find((f) => f.key === metric && f.kind === "number");
  const lower = recordedDate(from), upper = recordedDate(to);
  const invalidRange = lower !== null && upper !== null && lower > upper;
  let undated = 0;
  const points: { date: number; value: number; row: ResourceRow }[] = [];
  for (const row of rows) {
    if (!spec || spec.unit !== unit || (locality !== "all" && row.locality_id !== locality)) continue;
    const raw = row.detail[metric];
    if (raw === null || raw === undefined || raw === "") continue;
    const value = Number(raw);
    if (!Number.isFinite(value)) continue;
    const start = recordedDate(row.detail["period_start"]), end = recordedDate(row.detail["period_end"]);
    if (start === null || end === null || end < start) { undated++; continue; }
    if (invalidRange || (lower !== null && end < lower) || (upper !== null && start > upper)) continue;
    points.push({ date: start, value, row });
  }
  return { points: points.sort((a, b) => a.date - b.date || a.row.id.localeCompare(b.row.id)), undated, invalidRange };
}