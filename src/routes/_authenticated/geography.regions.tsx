import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { deleteRegion, listCountries, listRegions, saveRegion } from "@/lib/geography.functions";
import { EntityManager, STATUS_FIELD, STATUS_LABELS, text } from "@/features/geography/entity-manager";
import { metaFor, str } from "@/features/geography/form-helpers";

type Row = Awaited<ReturnType<typeof listRegions>>[number];

export const Route = createFileRoute("/_authenticated/geography/regions")({
  head: () => metaFor("Régions", "Régions rattachées à un pays du référentiel."),
  component: RegionsPage,
});

function RegionsPage() {
  const { data: countries = [] } = useQuery({ queryKey: ["countries"], queryFn: () => listCountries() });
  return (
    <EntityManager<Row>
      eyebrow="Territoires / Niveau 2"
      title="Régions"
      description="Chaque région est obligatoirement rattachée à un pays."
      disabled={countries.length === 0 ? { reason: "Créez d’abord un pays : une région doit y être rattachée." } : null}
      queryKey={["regions"]}
      invalidate={[["territory-summary"]]}
      fetcher={() => listRegions()}
      saver={(form, id) =>
        saveRegion({ data: { id: id ?? undefined, countryId: form["countryId"], name: form["name"], code: form["code"], description: form["description"], status: form["status"] } as never })
      }
      remover={(row) => deleteRegion({ data: { id: row.id } })}
      emptyForm={{ status: "draft" }}
      toForm={(row) => ({ countryId: row.country_id, name: row.name, code: str(row.code), description: str(row.description), status: row.status })}
      rowId={(row) => row.id}
      rowLabel={(row) => row.name}
      searchText={(row) => `${row.name} ${row.code ?? ""} ${row.countries?.name ?? ""}`}
      fields={[
        { key: "countryId", label: "Pays", type: "select", required: true, options: countries.map((c) => ({ value: c.id, label: c.name })) },
        { key: "name", label: "Nom", type: "text", required: true },
        { key: "code", label: "Code", type: "text" },
        STATUS_FIELD,
        { key: "description", label: "Description", type: "textarea", colSpan: 2 },
      ]}
      columns={[
        { label: "Nom", render: (r) => <span className="font-medium">{r.name}</span> },
        { label: "Code", render: (r) => text(r.code) },
        { label: "Pays", render: (r) => text(r.countries?.name) },
        { label: "Statut", render: (r) => STATUS_LABELS[r.status] },
      ]}
    />
  );
}
