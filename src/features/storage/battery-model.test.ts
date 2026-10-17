import { describe, expect, it } from "vitest";
import { buildConfigSnapshot, configErrors, configStatusChangeErrors, configTotals, energyCheck, sheetErrors, sheetWarnings, snapshotDiff, statusChangeErrors, usableEstimate, validationGateErrors, type ConfigSnapshot, type Sheet } from "./battery-model";

const base = (): Sheet => ({ name: "PowerWall X", manufacturer: "ACME", chemistry: "lfp", source: "Fiche fabricant 2024", status: "unverified", application: null, acquisition_method: "fiche_technique" });

describe("sheetErrors — champs obligatoires et unités", () => {
  it("accepte une fiche minimale valide", () => expect(sheetErrors(base())).toEqual([]));
  it("exige nom, fabricant et source (2 caractères minimum, aligné sur la base)", () => {
    const e = sheetErrors({ ...base(), name: "A", manufacturer: "", source: "B" });
    expect(e.join(" ")).toMatch(/nom commercial/);
    expect(e.join(" ")).toMatch(/fabricant/);
    expect(e.join(" ")).toMatch(/source documentaire/);
  });
  it("exige la précision de technologie pour « Autre »", () => {
    expect(sheetErrors({ ...base(), chemistry: "other", chemistry_detail: "" }).join(" ")).toMatch(/Autre/);
  });
  it("rejette les valeurs physiques négatives ou nulles sans sens", () => {
    const e = sheetErrors({ ...base(), nominal_voltage_v: -48, capacity_ah: 0, energy_kwh: -1 });
    expect(e.join(" ")).toMatch(/Tension nominale/);
    expect(e.join(" ")).toMatch(/Capacité nominale/);
    expect(e.join(" ")).toMatch(/Énergie nominale/);
  });
  it("rejette les pourcentages hors [0,100]", () => {
    const e = sheetErrors({ ...base(), dod_pct: 120, rte_pct: -5 });
    expect(e.join(" ")).toMatch(/DoD/);
    expect(e.join(" ")).toMatch(/aller-retour/);
  });
  it("accepte un SOC minimum et une dégradation à 0 (autorisés par la base)", () => {
    expect(sheetErrors({ ...base(), soc_min_pct: 0, soc_max_pct: 90, degradation_pct_year: 0 })).toEqual([]);
  });
  it("rejette les pourcentages strictement positifs à 0 (DoD, RTE)", () => {
    const e = sheetErrors({ ...base(), dod_pct: 0, rte_pct: 0 });
    expect(e.join(" ")).toMatch(/strictement positif/);
    expect(e.join(" ")).toMatch(/aller-retour.*strictement positif/);
  });
  it("rejette les cycles non entiers ou négatifs", () => {
    expect(sheetErrors({ ...base(), cycles: 2.5 }).join(" ")).toMatch(/entier positif/);
    expect(sheetErrors({ ...base(), cycles: 0 }).join(" ")).toMatch(/entier positif/);
  });
  it("contrôle l'ordre SOC, températures et tensions", () => {
    expect(sheetErrors({ ...base(), soc_min_pct: 90, soc_max_pct: 90 }).join(" ")).toMatch(/SOC minimum/);
    expect(sheetErrors({ ...base(), temp_min_c: 45, temp_max_c: -10 }).join(" ")).toMatch(/température minimale/i);
    expect(sheetErrors({ ...base(), voltage_min_v: 60, voltage_max_v: 40 }).join(" ")).toMatch(/tension minimale/i);
  });
  it("exige la devise dès qu'un coût est renseigné", () => {
    expect(sheetErrors({ ...base(), price: 500 }).join(" ")).toMatch(/devise/);
    expect(sheetErrors({ ...base(), price: 500, currency: "XOF" })).toEqual([]);
  });
  it("rejette les dates incohérentes et les URL non http", () => {
    expect(sheetErrors({ ...base(), published_on: "2025-01-01", consulted_on: "2024-01-01" }).join(" ")).toMatch(/consultation/);
    expect(sheetErrors({ ...base(), doc_url: "ftp://x" }).join(" ")).toMatch(/http/);
  });
});

describe("energyCheck — cohérence V × Ah ÷ 1 000 (indicatif)", () => {
  it("calcule sans jamais remplacer la valeur fabricant", () => {
    const c = energyCheck({ ...base(), nominal_voltage_v: 51.2, capacity_ah: 100, energy_kwh: 5.12 });
    expect(c).toMatchObject({ computed: 5.12, declared: 5.12 });
    expect(c!.gapPct).toBeCloseTo(0, 5);
  });
  it("renvoie null si une donnée manque (pas de calcul partiel)", () => {
    expect(energyCheck({ ...base(), nominal_voltage_v: 51.2, capacity_ah: 100 })).toBeNull();
  });
  it("signale un écart > 5 % en avertissement non bloquant", () => {
    expect(sheetWarnings({ ...base(), nominal_voltage_v: 48, capacity_ah: 100, energy_kwh: 6 }).join(" ")).toMatch(/écart/);
  });
});

describe("usableEstimate — estimation distincte de la donnée fabricant", () => {
  it("ne calcule jamais si la capacité utilisable est déclarée", () => {
    expect(usableEstimate({ ...base(), energy_kwh: 10, dod_pct: 90, usable_kwh: 8 })).toBeNull();
  });
  it("estime Énergie × DoD ÷ 100 et documente la formule", () => {
    const u = usableEstimate({ ...base(), energy_kwh: 10, dod_pct: 90 });
    expect(u!.kwh).toBeCloseTo(9, 6);
    expect(u!.formula).toMatch(/DoD/);
  });
  it("renvoie null sans hypothèse de 100 % quand le DoD manque", () => {
    expect(usableEstimate({ ...base(), energy_kwh: 10 })).toBeNull();
  });
});

describe("sheetWarnings — alertes non bloquantes", () => {
  it("signale une capacité utilisable déclarée supérieure à l'énergie nominale", () => {
    expect(sheetWarnings({ ...base(), energy_kwh: 5, usable_kwh: 6 }).join(" ")).toMatch(/dépasse/);
  });
  it("signale un RTE supérieur au produit des rendements", () => {
    expect(sheetWarnings({ ...base(), rte_pct: 95, charge_eff_pct: 95, discharge_eff_pct: 95 }).join(" ")).toMatch(/aller-retour/);
  });
  it("signale des cycles sans conditions et une dégradation sans source", () => {
    const w = sheetWarnings({ ...base(), cycles: 6000, degradation_pct_year: 2 });
    expect(w.join(" ")).toMatch(/conditions/);
    expect(w.join(" ")).toMatch(/hypothèse/);
  });
});

describe("validation du statut « validé »", () => {
  it("exige la méthode d'acquisition et au moins une caractéristique électrique", () => {
    const e = validationGateErrors({ ...base(), acquisition_method: null });
    expect(e.join(" ")).toMatch(/méthode/);
    expect(e.join(" ")).toMatch(/caractéristique électrique/);
  });
  it("passe avec méthode et une caractéristique documentée", () => {
    expect(validationGateErrors({ ...base(), energy_kwh: 5 })).toEqual([]);
    expect(statusChangeErrors({ ...base(), energy_kwh: 5 }, "in_review", "validated")).toEqual([]);
  });
  it("interdit le retour d'une fiche validée/rejetée à « Non vérifié »", () => {
    expect(statusChangeErrors({ ...base() }, "validated", "unverified").join(" ")).toMatch(/redevenir/);
    expect(statusChangeErrors({ ...base() }, "rejected", "unverified").join(" ")).toMatch(/redevenir/);
  });
  it("autorise validated → in_review et archived → in_review", () => {
    expect(statusChangeErrors({ ...base() }, "validated", "in_review")).toEqual([]);
    expect(statusChangeErrors({ ...base() }, "archived", "in_review")).toEqual([]);
  });
  it("ne change rien si le statut est inchangé", () => {
    expect(statusChangeErrors({ ...base() }, "validated", "validated")).toEqual([]);
  });
});

describe("configErrors / configTotals — configurations projet", () => {
  const cfg = { module_count: 4, series_count: 2, parallel_count: 2, soc_min_pct: 10, soc_max_pct: 95, rte_pct: 90, charge_eff_pct: 95, discharge_eff_pct: 95, usable_energy_limit_kwh: 15, retained_cost: 3000, currency: "EUR" };
  it("accepte une configuration cohérente", () => expect(configErrors(cfg)).toEqual([]));
  it("exige série × parallèle = nombre de modules", () => {
    expect(configErrors({ ...cfg, parallel_count: 3 }).join(" ")).toMatch(/Série × parallèle/);
  });
  it("rejette pourcentages hors plage et SOC inversé", () => {
    expect(configErrors({ ...cfg, rte_pct: 101 }).join(" ")).toMatch(/0 et 100/);
    expect(configErrors({ ...cfg, soc_min_pct: 95, soc_max_pct: 10 }).join(" ")).toMatch(/SOC minimum/);
  });
  it("exige une devise avec un coût retenu", () => {
    expect(configErrors({ ...cfg, currency: null }).join(" ")).toMatch(/devise/);
  });
  it("calcule les totaux nominaux modules × fiche, sans limite projet", () => {
    const t = configTotals(cfg, { ...base(), energy_kwh: 5, max_charge_kw: 2.5, max_discharge_kw: 2.5 });
    expect(t).toEqual({ energyKwh: 20, chargeKw: 10, dischargeKw: 10 });
  });
  it("renvoie null quand la fiche ne documente pas la valeur", () => {
    expect(configTotals(cfg, base())).toEqual({ energyKwh: null, chargeKw: null, dischargeKw: null });
  });
});

describe("instantané de configuration — buildConfigSnapshot / snapshotDiff", () => {
  const sheet = (): Sheet => ({ ...base(), sheet_version: "v3", energy_kwh: 5, max_charge_kw: 2.5, max_discharge_kw: 2.5, soc_min_pct: 10, soc_max_pct: 95, rte_pct: 90, price: 3000, currency: "EUR", doc_url: "https://exemple.fr/fiche.pdf", consulted_on: "2026-01-10" });
  it("fige l’identité, les caractéristiques utilisées, les unités, la source et la date", () => {
    const snap = buildConfigSnapshot(sheet(), "11111111-1111-1111-1111-111111111111", "2026-10-17T08:00:00.000Z");
    expect(snap.meta.datasheet_id).toBe("11111111-1111-1111-1111-111111111111");
    expect(snap.meta.snapshot_at).toBe("2026-10-17T08:00:00.000Z");
    expect(snap.meta.source).toBe("Fiche fabricant 2024");
    expect(snap.meta.sheet_version).toBe("v3");
    expect(snap.meta.units["energy_kwh"]).toBe("kWh");
    expect(snap.sheet.energy_kwh).toBe(5);
    expect(snap.sheet.name).toBe("PowerWall X");
  });
  it("ne fabrique pas de valeurs : les champs absents de la fiche restent null", () => {
    const snap = buildConfigSnapshot(base(), "id", "2026-10-17T08:00:00.000Z");
    expect(snap.sheet["energy_kwh"]).toBeNull();
    expect(snap.sheet.cycles).toBeUndefined();
  });
  it("les totaux calculés depuis l’instantané ne changent pas quand la fiche est modifiée ensuite", () => {
    const cfg = { module_count: 4, series_count: 2, parallel_count: 2, soc_min_pct: null, soc_max_pct: null, rte_pct: null, charge_eff_pct: null, discharge_eff_pct: null, usable_energy_limit_kwh: null, retained_cost: null, currency: null };
    const snap = buildConfigSnapshot(sheet(), "id", "2026-10-17T08:00:00.000Z");
    const modified = { ...sheet(), energy_kwh: 9 };
    expect(configTotals(cfg, snap.sheet as Sheet)).toEqual({ energyKwh: 20, chargeKw: 10, dischargeKw: 10 });
    expect(configTotals(cfg, modified)).toEqual({ energyKwh: 36, chargeKw: 10, dischargeKw: 10 });
  });
  it("snapshotDiff signale chaque changement avec ancienne et nouvelle valeur, et reste vide sans changement", () => {
    const snap = buildConfigSnapshot(sheet(), "id", "2026-10-17T08:00:00.000Z");
    expect(snapshotDiff(snap, sheet())).toEqual([]);
    const d = snapshotDiff(snap, { ...sheet(), energy_kwh: 9, rte_pct: null });
    expect(d.map((x) => x.key).sort()).toEqual(["energy_kwh", "rte_pct"]);
    expect(d.find((x) => x.key === "energy_kwh")).toMatchObject({ oldVal: 5, newVal: 9, unit: "kWh" });
  });
});

describe("configStatusChangeErrors — statut des configurations projet", () => {
  const cfg = { module_count: 4, series_count: null, parallel_count: null, soc_min_pct: null, soc_max_pct: null, rte_pct: null, charge_eff_pct: null, discharge_eff_pct: null, usable_energy_limit_kwh: null, retained_cost: null, currency: null, justification: "Choix documenté, note du 2026-10-01" };
  it("exige une justification documentée pour valider", () => {
    expect(configStatusChangeErrors({ ...cfg, justification: null }, "in_review", "validated").join(" ")).toMatch(/justification/);
    expect(configStatusChangeErrors(cfg, "in_review", "validated")).toEqual([]);
  });
  it("interdit le retour d’une configuration validée ou rejetée à « Non vérifié »", () => {
    expect(configStatusChangeErrors(cfg, "validated", "unverified").join(" ")).toMatch(/À examiner/);
    expect(configStatusChangeErrors(cfg, "rejected", "unverified").join(" ")).toMatch(/À examiner/);
    expect(configStatusChangeErrors(cfg, "validated", "in_review")).toEqual([]);
  });
  it("la validation d’une fiche fabricant ne valide pas sa configuration (règles séparées)", () => {
    expect(configStatusChangeErrors(cfg, "unverified", "in_review")).toEqual([]);
  });
});

it('refuses invalid capacity estimates rather than returning invented energy',()=>{
 expect(usableEstimate({...base(),energy_kwh:10,dod_pct:101})).toBeNull();
 expect(usableEstimate({...base(),energy_kwh:Infinity,dod_pct:90})).toBeNull();
 expect(energyCheck({...base(),nominal_voltage_v:Infinity,capacity_ah:100,energy_kwh:5})).toBeNull();
});
it('rejects nonfinite retained storage values',()=>{
 const c={module_count:1,series_count:null,parallel_count:null,soc_min_pct:NaN,soc_max_pct:90,rte_pct:null,charge_eff_pct:null,discharge_eff_pct:null,usable_energy_limit_kwh:Infinity,retained_cost:null,currency:null};
 expect(configErrors(c).length).toBe(2);
});

it('level A computes nominal V×Ah only without declared energy',async()=>{const {nominalCapacity}=await import('./battery-model');expect(nominalCapacity({...base(),nominal_voltage_v:48,capacity_ah:100})?.kwh).toBe(4.8);expect(nominalCapacity({...base(),nominal_voltage_v:48,capacity_ah:100,energy_kwh:6})).toMatchObject({kwh:6,basis:'declared'});});
it('level A refuses missing or invalid nominal values',async()=>{const {nominalCapacity}=await import('./battery-model');expect(nominalCapacity(base())).toBeNull();expect(nominalCapacity({...base(),nominal_voltage_v:-48,capacity_ah:100})).toBeNull();expect(nominalCapacity({...base(),energy_kwh:NaN,nominal_voltage_v:48,capacity_ah:100})).toBeNull();});
