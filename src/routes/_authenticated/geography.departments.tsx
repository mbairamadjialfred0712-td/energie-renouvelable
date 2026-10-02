import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { deleteDepartment, listDepartments, listRegions, saveDepartment } from "@/lib/geography.functions";
import { EntityManager, STATUS_FIELD, STATUS_LABELS, text } from "@/features/geography/entity-manager";
import { metaFor, str } from "@/features/geography/form-helpers";

type Row = Awaited<ReturnType<typeof listDepartments>>[number];

export const Route = createFileRoute("/_authenticated/geography/departments")({
  head: () => metaFor("Départements", "Départements et provinces rattachés à une région."),
  component: DepartmentsPage,
});

function DepartmentsPage() {
  const { data: regions = [] } = useQuery({ queryKey: ["regions"], queryFn: () => listRegions() });
  return (
    <EntityManager<Row>
      eyebrow="Territoires / Niveau 3"
      title="Départements"
      description="Départements ou provinces, rattachés à une région (et donc à un pays)."
      disabled={regions.length === 0 ? { reason: "Créez d’abord une région : un département doit y être rattaché." } : null}
      queryKey={["departments"]}
      invalidate={[["territory-summary"]]}
      fetcher={() => listDepartments()}
      saver={(form, id) =>
        saveDepartment({ data: { id: id ?? undefined, regionId: form["regionId"], name: form["name"], code: form["code"], description: form["description"], status: form["status"] } as never })
      }
      remover={(row) => deleteDepartment({ data: { id: row.id } })}
      emptyForm={{ status: "draft" }}
      toForm={(row) => ({ regionId: row.region_id, name: row.name, code: str(row.code), description: str(row.description), status: row.status })}
      rowId={(row) => row.id}
      rowLabel={(row) => row.name}
      searchText={(row) => `${row.name} ${row.code ?? ""} ${row.regions?.name ?? ""} ${row.regions?.countries?.name ?? ""}`}
      fields={[
        {
          key: "regionId",
          label: "Région",
          type: "select",
          required: true,
          options: regions.map((r) => ({ value: r.id, label: `${r.name}${r.countries?.name ? ` — ${r.countries.name}` : ""}` })),
        },
        { key: "name", label: "Nom", type: "text", required: true },
        { key: "code", label: "Code", type: "text" },
        STATUS_FIELD,
        { key: "description", label: "Description", type: "textarea", colSpan: 2 },
      ]}
      columns={[
        { label: "Nom", render: (r) => <span className="font-medium">{r.name}</span> },
        { label: "Code", render: (r) => text(r.code) },
        { label: "Région", render: (r) => text(r.regions?.name) },
        { label: "Pays", render: (r) => text(r.regions?.countries?.name) },
        { label: "Statut", render: (r) => STATUS_LABELS[r.status] },
      ]}
    />
  );
}
