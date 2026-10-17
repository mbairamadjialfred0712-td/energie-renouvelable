import { expect, it } from "vitest";
import { prepareCspSource } from "./csp-source.server";
import type { SimulationRequest } from "@/features/engine/engine-contract";
type Client = Parameters<typeof prepareCspSource>[0];
const id = "00000000-0000-4000-8000-000000000001";
const request: SimulationRequest = { engine: "csp", schema_version: "1.0", project_id: id, input_data: { site_id: { value: id, unit: "-", nature: "assumption", source: "test" } }, assumptions: {}, source_references: [] };
function mock(status: string, siteAccessible = true, projectLocality = id) {
  const tables: Record<string, unknown> = {
    site_weather_datasets: { id, status, site_id: id, locality_id: id, time_standard: "UTC", radiation_unit: "W/m²", source: "Test only", samples: [] },
    study_sites: siteAccessible ? { id, locality_id: id } : null,
    projects: { id, locality_id: projectLocality },
  };
  return { from: (table: string) => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: tables[table], error: null }) }) }) }) } as unknown as Client;
}
it("requires stored weather id", async () => { await expect(prepareCspSource(mock("validated"), request, undefined, false, true)).rejects.toThrow("Jeu météo"); });
it("rejects unvalidated weather on server", async () => { await expect(prepareCspSource(mock("unverified"), request, id, false, true)).rejects.toThrow("non validé"); });
it("rejects inaccessible site on server", async () => { await expect(prepareCspSource(mock("validated", false), request, id, false, true)).rejects.toThrow("inaccessibles"); });
it("rejects different project locality on server", async () => { await expect(prepareCspSource(mock("validated", true, "other"), request, id, false, true)).rejects.toThrow("incohérents"); });