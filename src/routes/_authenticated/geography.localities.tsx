import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LOCALITY_TYPES, deleteLocality, listDepartments, listLocalities, saveLocality } from "@/lib/geography.functions";
import { EntityManager, STATUS_FIELD, STATUS_LABELS, numberText, text } from "@/features/geography/entity-manager";
import { bool, metaFor, nullable, str } from "@/features/geography/form-helpers";

type Row = Awaited<ReturnType<typeof listLocalities>>[number];

export const Route = createFileRoute("/_authenticated/geography/localities")({
  head: () => metaFor("Localités", "Fiches techniques des localités : type de zone, coordonnées, population, accès réseau et demande."),
  component: LocalitiesPage,
});

const typeLabel = (value: string | null) => LOCALITY_TYPES.find((t) => t.value === value)?.label ?? "—";

function LocalitiesPage() {
  const { data: departments = [] } = useQuery({ queryKey: ["departments"], queryFn: () => listDepartments() });
  return (
    <EntityManager<Row>
      eyebrow="Territoires / Niveau 4"
      title="Localités"
      description="Fiches techniques des localités. Chaque valeur chiffrée doit être accompagnée de sa source et de sa période."
      queryKey={["localities"]}
      invalidate={[["territory-summary"]]}
      fetcher={() => listLocalities()}
      saver={(form, id) =>
        saveLocality({
          data: {
            id: id ?? undefined,
            departmentId: nullable(form["departmentId"]),
            name: form["name"],
            code: form["code"],
            localityType: nullable(form["localityType"]),
            latitude: form["latitude"],
            longitude: form["longitude"],
            altitudeM: form["altitudeM"],
            population: form["population"],
            gridAccess: bool(form["gridAccess"]),
            annualDemandKwh: form["annualDemandKwh"],
            dataSource: form["dataSource"],
            dataPeriod: form["dataPeriod"],
            dataQuality: form["dataQuality"],
            description: form["description"],
            status: form["status"],
          } as never,
        })
      }
      remover={(row) => deleteLocality({ data: { id: row.id } })}
      emptyForm={{ status: "draft" }}
      toForm={(row) => ({
        departmentId: str(row.department_id),
        name: row.name,
        code: str(row.code),
        localityType: str(row.locality_type),
        latitude: str(row.latitude),
        longitude: str(row.longitude),
        altitudeM: str(row.altitude_m),
        population: str(row.population),
        gridAccess: row.grid_access === null ? "" : String(row.grid_access),
        annualDemandKwh: str(row.annual_demand_kwh),
        dataSource: str(row.data_source),
        dataPeriod: str(row.data_period),
        dataQuality: str(row.data_quality),
        description: str(row.description),
        status: row.status,
      })}
      rowId={(row) => row.id}
      rowLabel={(row) => row.name}
      searchText={(row) => `${row.name} ${row.code ?? ""} ${row.departments?.name ?? ""} ${row.data_source ?? ""}`}
      fields={[
        { key: "name", label: "Nom", type: "text", required: true },
        { key: "code", label: "Code", type: "text" },
        {
          key: "departmentId",
          label: "Département",
          type: "select",
          options: departments.map((d) => ({ value: d.id, label: `${d.name}${d.regions?.name ? ` — ${d.regions.name}` : ""}` })),
        },
        { key: "localityType", label: "Type de zone", type: "select", options: LOCALITY_TYPES },
        { key: "latitude", label: "Latitude", unit: "°", type: "number", help: "-90 à 90, WGS84" },
        { key: "longitude", label: "Longitude", unit: "°", type: "number", help: "-180 à 180, WGS84" },
        { key: "altitudeM", label: "Altitude", unit: "m", type: "number" },
        { key: "population", label: "Population", unit: "habitants", type: "number" },
        { key: "gridAccess", label: "Accès au réseau électrique", type: "boolean" },
        { key: "annualDemandKwh", label: "Demande annuelle", unit: "kWh/an", type: "number" },
        { key: "dataSource", label: "Source des données", type: "text", help: "Recensement, enquête, rapport…" },
        { key: "dataPeriod", label: "Période / année", type: "text" },
        { key: "dataQuality", label: "Qualité", type: "text", help: "Mesurée, déclarée, estimée…" },
        STATUS_FIELD,
        { key: "description", label: "Description", type: "textarea", colSpan: 2 },
      ]}
      columns={[
        { label: "Nom", render: (r) => <span className="font-medium">{r.name}</span> },
        { label: "Type", render: (r) => typeLabel(r.locality_type) },
        { label: "Département", render: (r) => text(r.departments?.name) },
        { label: "Coordonnées", render: (r) => (r.latitude !== null && r.longitude !== null ? `${numberText(r.latitude)}°, ${numberText(r.longitude)}°` : "—") },
        { label: "Population", render: (r) => numberText(r.population, "hab.") },
        { label: "Réseau", render: (r) => (r.grid_access === null ? "—" : r.grid_access ? "Oui" : "Non") },
        { label: "Demande", render: (r) => numberText(r.annual_demand_kwh, "kWh/an") },
        { label: "Source", render: (r) => <span className="text-xs text-muted-foreground">{text(r.data_source)}{r.data_period ? ` (${r.data_period})` : ""}</span> },
        { label: "Statut", render: (r) => STATUS_LABELS[r.status] },
      ]}
    />
  );
}
