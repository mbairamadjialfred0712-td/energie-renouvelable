import { it, expect } from "vitest";
import { requestEvidence } from "./scenario-evidence.server";
it("unknown engines cannot produce comparable evidence", () => expect(requestEvidence({ schema_version: "1.0", engine: "hybrid", input_data: {}, assumptions: {}, source_references: [] }).requestValid).toBe(false));
it("incomplete PV parameters cannot become comparable evidence", () => expect(requestEvidence({ schema_version: "1.0", engine: "photovoltaic", input_data: {}, assumptions: {}, source_references: [] }).requestValid).toBe(false));
it("invalid saved request is explicitly incomplete", () => expect(requestEvidence(null)).toEqual({ requestValid: false, natures: [], boundary: "" }));