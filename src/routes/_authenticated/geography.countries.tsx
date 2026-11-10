import { createFileRoute } from "@tanstack/react-router";
import { deleteCountry, listCountries, saveCountry } from "@/lib/geography.functions";
import { EntityManager, STATUS_FIELD, STATUS_LABELS, numberText, text } from "@/features/geography/entity-manager";
import { metaFor, pick, str } from "@/features/geography/form-helpers";
import { POPULATION_METHODS, populationLabel, populationWarning } from "@/features/geography/demography";

type Row = Awaited<ReturnType<typeof listCountries>>[number];

export const Route = createFileRoute("/_authenticated/geography/countries")({
  head: () => metaFor("Pays", "Référentiel des pays : codes ISO, devise, coordonnées et population nationale tracée."),
  component: CountriesPage,
});

const KEYS = ["name", "code", "iso2", "iso3", "currency", "latitude", "longitude", "description", "population", "populationYear", "populationSource", "populationMethod", "status"];

const CURRENT_YEAR = new Date().getFullYear();

function CountriesPage() {
  return (
    <EntityManager<Row>
      eyebrow="Territoires / Niveau 1"
      title="Pays"
      description="Référentiel des pays utilisés dans les études. Les codes ISO suivent la norme ISO 3166-1."
      queryKey={["countries"]}
      invalidate={[["territory-summary"]]}
      fetcher={() => listCountries()}
      saver={(form, id) => saveCountry({ data: { ...pick(form, KEYS), id: id ?? undefined } as never })}
      remover={(row) => deleteCountry({ data: { id: row.id } })}
      emptyForm={{ status: "draft" }}
      toForm={(row) => {
        const r = row as Record<string, unknown>;
        return {
          ...Object.fromEntries(KEYS.map((key) => [key, str(r[key])])),
          populationYear: str(r["population_year"]),
          populationSource: str(r["population_source"]),
          populationMethod: str(r["population_method"]),
        };
      }}
      rowId={(row) => row.id}
      rowLabel={(row) => row.name}
      searchText={(row) => `${row.name} ${row.code} ${row.iso2 ?? ""} ${row.iso3 ?? ""}`}
      fields={[
        { key: "name", label: "Nom", type: "text", required: true },
        { key: "code", label: "Code interne", type: "text", required: true },
        { key: "iso2", label: "Code ISO alpha-2", type: "text", help: "2 lettres, ex. CI" },
        { key: "iso3", label: "Code ISO alpha-3", type: "text", help: "3 lettres, ex. CIV" },
        { key: "currency", label: "Devise", type: "text", help: "Code ISO 4217, ex. XOF" },
        STATUS_FIELD,
        { key: "latitude", label: "Latitude de référence", unit: "°", type: "number", help: "-90 à 90, degrés décimaux WGS84" },
        { key: "longitude", label: "Longitude de référence", unit: "°", type: "number", help: "-180 à 180, degrés décimaux WGS84" },
        { key: "population", label: "Population nationale", unit: "habitants", type: "number", help: "Valeur officielle uniquement, avec son année et sa source. Laisser vide si inconnue." },
        { key: "populationYear", label: "Année de référence", type: "number", help: "Année de la donnée, ex. 2026" },
        { key: "populationMethod", label: "Méthode", type: "select", options: Object.entries(POPULATION_METHODS).map(([value, label]) => ({ value, label })), help: "Une projection ou une estimation n'est pas un recensement." },
        { key: "populationSource", label: "Source démographique", type: "text", help: "Organisme et référence, ex. ANStat — projection démographique 2026" },
        { key: "description", label: "Description", type: "textarea", colSpan: 2 },
      ]}
      columns={[
        { label: "Nom", render: (r) => <span className="font-medium">{r.name}</span> },
        { label: "Code", render: (r) => r.code },
        { label: "ISO 2 / 3", render: (r) => `${text(r.iso2)} / ${text(r.iso3)}` },
        { label: "Devise", render: (r) => text(r.currency) },
        { label: "Coordonnées", render: (r) => (r.latitude !== null && r.longitude !== null ? `${numberText(r.latitude)}°, ${numberText(r.longitude)}°` : "—") },
        { label: "Population", render: (r) => {
          const warning = populationWarning(r, CURRENT_YEAR);
          return (
            <div>
              <div>{populationLabel(r)}</div>
              {r.population !== null && r.population !== undefined && (
                <div className="text-xs text-muted-foreground">
                  {r.population_method ? POPULATION_METHODS[r.population_method as keyof typeof POPULATION_METHODS] : "Méthode inconnue"}
                  {r.population_source ? ` — ${r.population_source}` : ""}
                </div>
              )}
              {warning && <div className="text-xs text-amber-600">{warning}</div>}
            </div>
          );
        } },
        { label: "Statut", render: (r) => STATUS_LABELS[r.status] },
      ]}
    />
  );
}
