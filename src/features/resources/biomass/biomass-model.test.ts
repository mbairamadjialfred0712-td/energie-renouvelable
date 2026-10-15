import { expect, test } from "vitest";
import { biomassErrors, safeTotal } from "./biomass-model";
const b = { quantity: 10, unit: "t/an", moisture: 120, lhv: 15, lhvBasis: null, fraction: null, potential: 5, potentialSource: null, periodStart: null, periodEnd: null, levels: {}, seasonal: [] };
test("errors", () => { const e = biomassErrors(b); expect(e.length).toBe(3); });
test("total", () => { expect("reason" in safeTotal([{id:"a",type:"X",unit:"t/an",lhvBasis:null,start:"2024-01-01",end:"2024-12-31",quantity:1},{id:"b",type:"X",unit:"t/an",lhvBasis:null,start:"2024-01-01",end:"2024-12-31",quantity:2}])).toBe(true);
 expect(safeTotal([{id:"a",type:"X",unit:"t/an",lhvBasis:null,start:"2024-01-01",end:"2024-12-31",quantity:1},{id:"b",type:"Y",unit:"t/an",lhvBasis:null,start:"2024-01-01",end:"2024-12-31",quantity:2}])).toEqual({total:3,unit:"t/an"}); });
