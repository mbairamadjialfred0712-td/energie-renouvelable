import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SITE_TYPES, deleteStudySite, listLocalities, listStudySites, saveStudySite } from "@/lib/geography.functions";
import { EntityManager, STATUS_FIELD, STATUS_LABELS, numberText, text } from "@/features/geography/entity-manager";
import { bool, metaFor, nullable, str } from "@/features/geography/form-helpers";

type Row = Awaited<ReturnType<typeof listStudySites>>[number];

export const Route = createFileRoute("/_authenticated/geography/sites")({
  head: () => metaFor("Sites d’étude", "Sites d’étude énergétiques rattachés à une localité : coordonnées, surface, accès réseau."),
  component: SitesPage,
});

const typeLabel = (value: string) => SITE_TYPES.find((t) => t.value === value)?.label ?? value;

function SitesPage() {
  const { data: localities = [] } = useQuery({ queryKey: ["localities"], queryFn: () => listLocalities() });
  return (
    <EntityManager<Row>
      eyebrow="Territoires / Niveau 5"
      title="Sites d’étude"
      description="Emplacements précis étudiés pour une installation énergétique (centrale, micro-réseau, site isolé…)."
      note="La puissance envisagée est une intention de projet saisie par l’ingénieur, pas un résultat de dimensionnement."
      queryKey={["study-sites"]}
      invalidate={[["territory-summary"]]}
      fetcher={() => listStudySites()}
      saver={(form, id) =>
        saveStudySite({
          data: {
            id: id ?? undefined,
            localityId: nullable(form["localityId"]),
            name: form["name"],
            code: form["code"],
            siteType: form["siteType"] || "autre",
            latitude: form["latitude"],
            longitude: form["longitude"],
            altitudeM: form["altitudeM"],
            areaM2: form["areaM2"],
            gridAccess: bool(form["gridAccess"]),
            gridDistanceKm: form["gridDistanceKm"],
            plannedPowerKw: form["plannedPowerKw"],
            dataSource: form["dataSource"],
            dataPeriod: form["dataPeriod"],
            dataQuality: form["dataQuality"],
            notes: form["notes"],
            status: form["status"],
          } as never,
        })
      }
      remover={(row) => deleteStudySite({ data: { id: row.id } })}
      emptyForm={{ status: "draft", siteType: "autre" }}
      toForm={(row) => ({
        localityId: str(row.locality_id),
        name: row.name,
        code: str(row.code),
        siteType: row.site_type,
        latitude: str(row.latitude),
        longitude: str(row.longitude),
        altitudeM: str(row.altitude_m),
        areaM2: str(row.area_m2),
        gridAccess: row.grid_access === null ? "" : String(row.grid_access),
        gridDistanceKm: str(row.grid_distance_km),
        plannedPowerKw: str(row.planned_power_kw),
        dataSource: str(row.data_source),
        dataPeriod: str(row.data_period),
        dataQuality: str(row.data_quality),
        notes: str(row.notes),
        status: row.status,
      })}
      rowId={(row) => row.id}
      rowLabel={(row) => row.name}
      searchText={(row) => `${row.name} ${row.code ?? ""} ${row.localities?.name ?? ""}`}
      fields={[
        { key: "name", label: "Nom du site", type: "text", required: true },
        { key: "code", label: "Code", type: "text" },
        { key: "localityId", label: "Localité", type: "select", options: localities.map((l) => ({ value: l.id, label: l.name })) },
        { key: "siteType", label: "Type de site", type: "select", required: true, options: SITE_TYPES },
        { key: "latitude", label: "Latitude", unit: "°", type: "number", help: "-90 à 90, WGS84" },
        { key: "longitude", label: "Longitude", unit: "°", type: "number", help: "-180 à 180, WGS84" },
        { key: "altitudeM", label: "Altitude", unit: "m", type: "number" },
        { key: "areaM2", label: "Surface disponible", unit: "m²", type: "number" },
        { key: "gridAccess", label: "Accès au réseau électrique", type: "boolean" },
        { key: "gridDistanceKm", label: "Distance au réseau", unit: "km", type: "number" },
        { key: "plannedPowerKw", label: "Puissance envisagée (intention)", unit: "kW", type: "number" },
        STATUS_FIELD,
        { key: "dataSource", label: "Source des données", type: "text" },
        { key: "dataPeriod", label: "Période / date de relevé", type: "text" },
        { key: "dataQuality", label: "Qualité", type: "text", help: "Relevé GPS terrain, carte, déclaratif…" },
        { key: "notes", label: "Notes", type: "textarea", colSpan: 2 },
      ]}
      columns={[
        { label: "Nom", render: (r) => <span className="font-medium">{r.name}</span> },
        { label: "Type", render: (r) => typeLabel(r.site_type) },
        { label: "Localité", render: (r) => text(r.localities?.name) },
        { label: "Coordonnées", render: (r) => (r.latitude !== null && r.longitude !== null ? `${numberText(r.latitude)}°, ${numberText(r.longitude)}°` : "—") },
        { label: "Surface", render: (r) => numberText(r.area_m2, "m²") },
        { label: "Réseau", render: (r) => (r.grid_access === null ? "—" : r.grid_access ? "Oui" : `Non${r.grid_distance_km !== null ? ` (${numberText(r.grid_distance_km, "km")})` : ""}`) },
        { label: "Statut", render: (r) => STATUS_LABELS[r.status] },
      ]}
    />
  );
}
