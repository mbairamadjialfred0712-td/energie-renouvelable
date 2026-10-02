import { createFileRoute } from "@tanstack/react-router";
import { deleteCountry, listCountries, saveCountry } from "@/lib/geography.functions";
import { EntityManager, STATUS_FIELD, STATUS_LABELS, numberText, text } from "@/features/geography/entity-manager";
import { metaFor, pick, str } from "@/features/geography/form-helpers";

type Row = Awaited<ReturnType<typeof listCountries>>[number];

export const Route = createFileRoute("/_authenticated/geography/countries")({
  head: () => metaFor("Pays", "Référentiel des pays : codes ISO, devise, coordonnées de référence."),
  component: CountriesPage,
});

const KEYS = ["name", "code", "iso2", "iso3", "currency", "latitude", "longitude", "description", "status"];

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
      toForm={(row) => Object.fromEntries(KEYS.map((key) => [key, str((row as Record<string, unknown>)[key])]))}
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
        { key: "description", label: "Description", type: "textarea", colSpan: 2 },
      ]}
      columns={[
        { label: "Nom", render: (r) => <span className="font-medium">{r.name}</span> },
        { label: "Code", render: (r) => r.code },
        { label: "ISO 2 / 3", render: (r) => `${text(r.iso2)} / ${text(r.iso3)}` },
        { label: "Devise", render: (r) => text(r.currency) },
        { label: "Coordonnées", render: (r) => (r.latitude !== null && r.longitude !== null ? `${numberText(r.latitude)}°, ${numberText(r.longitude)}°` : "—") },
        { label: "Statut", render: (r) => STATUS_LABELS[r.status] },
      ]}
    />
  );
}
