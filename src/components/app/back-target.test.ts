import { it, expect } from "vitest";
import { backTarget } from "./back-target";
it("resource details return to their matching list without history", () => expect(backTarget("/resources/wind/abc").to).toBe("/resources/wind"));
it("technology lists return to Technologies", () => expect(backTarget("/technologies/storage").to).toBe("/technologies"));
it("simulation results return to Simulations", () => expect(backTarget("/simulations/abc/results").to).toBe("/simulations"));
it("unknown pages have a non-empty internal fallback", () => expect(backTarget("/unknown").to).toBe("/dashboard"));