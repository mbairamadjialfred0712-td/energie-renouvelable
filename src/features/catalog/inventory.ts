export type InventoryRow = { locality_id: string; status: string; locality_name?: string | null };
export type InventoryFilter = { locality?: string | undefined; status?: string | undefined };
export function filterInventory<T extends InventoryRow>(rows: T[], filter: InventoryFilter): T[] {
  return rows.filter(r => (!filter.locality || r.locality_id === filter.locality) && (!filter.status || r.status === filter.status));
}
export function summarizeInventory(rows: InventoryRow[]) {
  return { registered: rows.length, validated: rows.filter(r => r.status === "validated").length, localities: new Set(rows.map(r => r.locality_id)).size };
}
export function catalogSearch(input: Record<string, unknown>): InventoryFilter {
  return { ...(typeof input["locality"] === "string" ? { locality: input["locality"] } : {}), ...(typeof input["status"] === "string" ? { status: input["status"] } : {}) };
}
export type ResourceListSearch = { locality?: string | undefined; status?: string | undefined; q?: string | undefined; nature?: string | undefined; height?: string | undefined; type?: string | undefined; basis?: string | undefined; chem?: string | undefined; application?: string | undefined };
export function resourceListSearch(input: Record<string, unknown>): ResourceListSearch {
  return Object.fromEntries(["locality", "status", "q", "nature", "height", "type", "basis", "chem", "application"].flatMap(key => typeof input[key] === "string" ? [[key, input[key]]] : []));
}
