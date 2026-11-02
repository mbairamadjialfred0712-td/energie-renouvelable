import { describe, it, expect } from "vitest";
import { filterInventory, summarizeInventory, resourceListSearch } from "./inventory";
const rows = [{ locality_id: "A", status: "validated" }, { locality_id: "A", status: "unverified" }, { locality_id: "B", status: "validated" }];
describe("Common resource inventory", () => {
  it("counts actual records and their dedicated validation status", () => expect(summarizeInventory(rows)).toEqual({ registered: 3, validated: 2, localities: 2 }));
  it("uses the same locality and status scope", () => expect(filterInventory(rows, { locality: "A", status: "validated" })).toEqual([rows[0]]));
  it("does not invent rows for empty datasets", () => expect(summarizeInventory([])).toEqual({ registered: 0, validated: 0, localities: 0 }));
  it("retains relevant filters, not arbitrary return URLs", () => expect(resourceListSearch({ locality: "A", q: "QA", nature: "measured", redirect: "https://evil.test" })).toEqual({ locality: "A", q: "QA", nature: "measured" }));
  it("retains battery filters across detail navigation without admitting external targets", () => expect(resourceListSearch({ q: "QA", status: "validated", chem: "lfp", application: "stationary", redirect: "//evil.test", owner_id: "other" })).toEqual({ q: "QA", status: "validated", chem: "lfp", application: "stationary" }));
});
