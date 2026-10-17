import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LCOE_FORMULA, computeLcoe, type FinanceInput, type FinanceResult, type ReplacementEvent } from "./finance-engine";

const numberFmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 4 });

function parseNumber(raw: string): number {
  return Number(raw.replace(/\s/g, "").replace(",", "."));
}

interface FieldState {
  currency: string;
  capex: string;
  annualOpex: string;
  lifetimeYears: string;
  discountRatePct: string;
  yearOneProductionKwh: string;
  degradationPctPerYear: string;
}

const EMPTY: FieldState = {
  currency: "EUR",
  capex: "",
  annualOpex: "",
  lifetimeYears: "",
  discountRatePct: "",
  yearOneProductionKwh: "",
  degradationPctPerYear: "",
};

interface ReplacementRow {
  year: string;
  cost: string;
}

function Field({ label, unit, value, onChange }: { label: string; unit?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {unit ? <span className="text-muted-foreground"> ({unit})</span> : null}
      </Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" />
    </div>
  );
}

export function FinanceCalculator({ initial, initialReplacements }: { initial?: Partial<FieldState> | undefined; initialReplacements?: ReplacementRow[] | undefined }) {
  const [fields, setFields] = useState<FieldState>({ ...EMPTY, ...initial });
  const [replacements, setReplacements] = useState<ReplacementRow[]>(initialReplacements ?? []);
  const [result, setResult] = useState<FinanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof FieldState) => (v: string) => setFields((f) => ({ ...f, [key]: v }));

  const canCompute = useMemo(
    () =>
      fields.capex.trim() !== "" &&
      fields.annualOpex.trim() !== "" &&
      fields.lifetimeYears.trim() !== "" &&
      fields.discountRatePct.trim() !== "" &&
      fields.yearOneProductionKwh.trim() !== "" &&
      fields.degradationPctPerYear.trim() !== "",
    [fields],
  );

  function compute() {
    setError(null);
    try {
      const parsedReplacements: ReplacementEvent[] = replacements
        .filter((r) => r.year.trim() !== "" || r.cost.trim() !== "")
        .map((r) => ({ year: parseNumber(r.year), cost: parseNumber(r.cost) }));
      const input: FinanceInput = {
        currency: fields.currency.trim() || "EUR",
        capex: parseNumber(fields.capex),
        annualOpex: parseNumber(fields.annualOpex),
        lifetimeYears: parseNumber(fields.lifetimeYears),
        discountRatePct: parseNumber(fields.discountRatePct),
        yearOneProductionKwh: parseNumber(fields.yearOneProductionKwh),
        degradationPctPerYear: parseNumber(fields.degradationPctPerYear),
        replacements: parsedReplacements,
      };
      setResult(computeLcoe(input));
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "Entrées invalides.");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Hypothèses économiques</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Devise" value={fields.currency} onChange={set("currency")} />
            <Field label="CAPEX" unit={fields.currency} value={fields.capex} onChange={set("capex")} />
            <Field label="OPEX annuel" unit={fields.currency} value={fields.annualOpex} onChange={set("annualOpex")} />
            <Field label="Durée d'étude" unit="ans" value={fields.lifetimeYears} onChange={set("lifetimeYears")} />
            <Field label="Taux d'actualisation" unit="%" value={fields.discountRatePct} onChange={set("discountRatePct")} />
            <Field label="Production année 1" unit="kWh" value={fields.yearOneProductionKwh} onChange={set("yearOneProductionKwh")} />
            <Field label="Dégradation annuelle" unit="%" value={fields.degradationPctPerYear} onChange={set("degradationPctPerYear")} />
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Remplacements d'équipements</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setReplacements((r) => [...r, { year: "", cost: "" }])}>
                Ajouter un remplacement
              </Button>
            </div>
            {replacements.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun remplacement prévu.</p>
            ) : (
              replacements.map((r, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="w-32 space-y-1">
                    <Label className="text-xs">Année</Label>
                    <Input
                      value={r.year}
                      inputMode="numeric"
                      onChange={(e) => setReplacements((rows) => rows.map((row, j) => (j === i ? { ...row, year: e.target.value } : row)))}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Coût ({fields.currency})</Label>
                    <Input
                      value={r.cost}
                      inputMode="decimal"
                      onChange={(e) => setReplacements((rows) => rows.map((row, j) => (j === i ? { ...row, cost: e.target.value } : row)))}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setReplacements((rows) => rows.filter((_, j) => j !== i))}>
                    Retirer
                  </Button>
                </div>
              ))
            )}
          </div>

          <Button type="button" disabled={!canCompute} onClick={compute}>
            Calculer le LCOE
          </Button>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Méthode de calcul</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="font-mono text-xs sm:text-sm">{LCOE_FORMULA}</p>
          <p className="text-muted-foreground">
            E_t = E₁ × (1−d)^(t−1) ; C_t = OPEX + R_t. CAPEX dépensé en année 0, jamais actualisé. OPEX constant en monnaie constante
            (inflation non modélisée). Remplacements en fin d'année indiquée. Aucune valeur résiduelle, aucun revenu, aucune fiscalité.
          </p>
          <p className="text-muted-foreground">
            Limite : ce LCOE n'est ni un prix de vente ni un indicateur de rentabilité ; NPV/TRI/payback ne sont pas calculés.
          </p>
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              Résultats
              <Badge variant="secondary">Résultat calculé — reproductible avec les mêmes entrées</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">LCOE</p>
                <p className="text-2xl font-semibold">
                  {numberFmt.format(result.lcoePerKwh)} {fields.currency}/kWh
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Coûts actualisés totaux</p>
                <p className="text-lg font-medium">
                  {numberFmt.format(result.totalDiscountedCost)} {fields.currency}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Énergie actualisée totale</p>
                <p className="text-lg font-medium">{numberFmt.format(result.totalDiscountedEnergyKwh)} kWh</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Totaux (CAPEX / OPEX / remplacements)</p>
                <p className="text-lg font-medium">
                  {numberFmt.format(result.totalCapex)} / {numberFmt.format(result.totalOpex)} / {numberFmt.format(result.totalReplacementCost)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Année</TableHead>
                    <TableHead>Production (kWh)</TableHead>
                    <TableHead>OPEX ({fields.currency})</TableHead>
                    <TableHead>Remplacement ({fields.currency})</TableHead>
                    <TableHead>Coût actualisé</TableHead>
                    <TableHead>Énergie actualisée (kWh)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.rows.map((row) => (
                    <TableRow key={row.year}>
                      <TableCell>{row.year}</TableCell>
                      <TableCell>{numberFmt.format(row.productionKwh)}</TableCell>
                      <TableCell>{numberFmt.format(row.opex)}</TableCell>
                      <TableCell>{numberFmt.format(row.replacementCost)}</TableCell>
                      <TableCell>{numberFmt.format(row.discountedCost)}</TableCell>
                      <TableCell>{numberFmt.format(row.discountedEnergyKwh)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
