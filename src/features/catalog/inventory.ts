export type InventoryRow = { locality_id: string; status: string; locality_name?: string | null };
export type InventoryFilter = { locality?: string; status?: string };
export function filterInventory<T extends InventoryRow>(rows: T[], filter: InventoryFilter): T[] {
  return rows.filter(r => (!filter.locality || r.locality_id === filter.locality) && (!filter.status || r.status === filter.status));
}
export function summarizeInventory(rows: InventoryRow[]) {
  return { registered: rows.length, validated: rows.filter(r => r.status === "validated").length, localities: new Set(rows.map(r => r.locality_id)).size };
}
export function catalogSearch(input: Record<string, unknown>): InventoryFilter {
  return { ...(typeof input["locality"] === "string" ? { locality: input["locality"] } : {}), ...(typeof input["status"] === "string" ? { status: input["status"] } : {}) };
}
export function resourceListSearch(input: Record<string, unknown>) {
  return Object.fromEntries(["locality", "status", "q", "nature", "height", "type", "basis"].flatMap(key => typeof input[key] === "string" ? [[key, input[key]]] : [])) as Record<string, string>;
}
