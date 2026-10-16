import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { WorkspacePage } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { getLocalitySolar, getSolarAccess } from "@/lib/solar.functions";
import { SolarComparison } from "@/features/resources/solar/solar-compare";
import { StatusBadge, fmt, periodText } from "@/features/resources/solar/solar-ui";
import { getLocalityWind } from "@/lib/wind.functions";
import { WindComparison, WindStatusBadge } from "@/features/resources/wind/wind-ui";
import { LocalityDemands } from "@/features/demand/locality-demands";
import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { weatherListOptions } from "@/features/weather/weather-ui";
import { getLocalityBiomass } from "@/lib/biomass.functions";
import { BiomassComparison, BiomassStatusBadge, fmt as bfmt, periodText as bperiod, typeText } from "@/features/resources/biomass/biomass-ui";

export const Route = createFileRoute("/_authenticated/geography/localities/$id")({
  head: () => ({ meta: [{ title: "Fiche localité — Énergie Renouvelable" }, { name: "description", content: "Fiche d’une localité : situation, coordonnées, sites d’étude et ressources solaires enregistrées." }, { property: "og:title", content: "Fiche localité — Énergie Renouvelable" }, { property: "og:description", content: "Localité, sites d’étude et ressources solaires tracées." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: LocalityDetail,
});

function LocalityDetail() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({ queryKey: ["locality-solar", id], queryFn: () => getLocalitySolar({ data: { localityId: id } }) });
  const { data: access } = useQuery({ queryKey: ["solar-access"], queryFn: () => getSolarAccess() });
  const { data: wind } = useQuery({ queryKey: ["locality-wind", id], queryFn: () => getLocalityWind({ data: { localityId: id } }) });
  if (isLoading) return <WorkspacePage eyebrow="Territoires / Localité" title="Chargement…" description=""><span /></WorkspacePage>;
  const l: any = data?.locality;
  if (!l) return <WorkspacePage eyebrow="Territoires / Localité" title="Localité introuvable" description=""><Link to="/geography/localities" className="text-primary">← Retour</Link></WorkspacePage>;
  const ds = data!.datasets;
  const lastValidated = ds.find((d) => d.status === "validated");
  const path = [l.departments?.regions?.countries?.name, l.departments?.regions?.name, l.departments?.name].filter(Boolean).join(" / ");
  return (
    <WorkspacePage eyebrow="Territoires / Localité" title={l.name} description={path || "Rattachement non renseigné"}
      action={access?.canWrite ? <Button asChild><Link to="/resources/solar/new" search={{ locality: id }}><Plus />Données solaires</Link></Button> : null}>
      <div className="grid gap-4 sm:grid-cols-4">
        {[["Coordonnées", l.latitude !== null ? `${fmt(Number(l.latitude))}°, ${fmt(Number(l.longitude))}°` : "—"], ["Altitude", fmt(l.altitude_m === null ? null : Number(l.altitude_m), "m")], ["Population", fmt(l.population === null ? null : Number(l.population), "hab.")], ["Sites d’étude", String(data!.sites.length)]].map(([k, v]) => (
          <div key={k} className="border border-border bg-background p-4"><p className="text-xs text-muted-foreground">{k}</p><p className="mt-1 font-semibold">{v}</p></div>))}
      </div>
      <section className="mt-8 space-y-4">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Ressources solaires ({ds.length} jeu{ds.length > 1 ? "x" : ""})</h2>
        {ds.length === 0 ? <p className="text-sm text-muted-foreground">Aucune donnée solaire enregistrée pour cette localité.</p> : (
          <>
            <div className="border border-border bg-background p-4 text-sm">
              <p className="font-medium">Dernier jeu validé</p>
              {lastValidated ? <p className="mt-1">GHI {fmt(lastValidated.ghi, lastValidated.ghiUnit)} · DNI {fmt(lastValidated.dni, lastValidated.dniUnit)} · Source : {lastValidated.source} · Période : {periodText(lastValidated)} — <Link to="/resources/solar/$id" params={{ id: lastValidated.id }} className="text-primary hover:underline">détails</Link></p>
                : <p className="mt-1 text-muted-foreground">Aucun jeu validé pour l’instant.</p>}
            </div>
            <ul className="divide-y divide-border border border-border bg-background text-sm">
              {ds.map((d) => <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-2"><Link to="/resources/solar/$id" params={{ id: d.id }} className="text-primary hover:underline">{periodText(d)} — {d.source}</Link><StatusBadge status={d.status} /></li>)}
            </ul>
            <SolarComparison rows={[...ds].reverse()} />
          </>
        )}
      </section>
      <section className="mt-8 space-y-4">
        <div className="flex items-center justify-between gap-2"><h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Ressources éoliennes ({wind?.length ?? 0} jeu{(wind?.length ?? 0) > 1 ? "x" : ""})</h2>
          {access?.canWrite && <Button asChild size="sm" variant="outline"><Link to="/resources/wind/new" search={{ locality: id }}><Plus />Données de vent</Link></Button>}</div>
        {!wind?.length ? <p className="text-sm text-muted-foreground">Aucune donnée éolienne enregistrée pour cette localité.</p> : (
          <>
            <ul className="divide-y divide-border border border-border bg-background text-sm">
              {wind.map((w) => <li key={w.id} className="flex items-center justify-between gap-3 px-4 py-2"><Link to="/resources/wind/$id" params={{ id: w.id }} className="min-w-0 break-words text-primary hover:underline">{fmt(w.avg, "m/s")} à {fmt(w.height, "m")} · {w.period_start || w.period_end ? `${w.period_start ?? "?"} → ${w.period_end ?? "?"}` : w.period ?? "—"} — {w.source}{w.site_name ? ` · Site : ${w.site_name}` : ""}</Link><WindStatusBadge status={w.status} /></li>)}
            </ul>
            <WindComparison rows={[...wind].reverse()} />
          </>
        )}
      </section>
      <LocalityBiomass id={id} canWrite={!!access?.canWrite} />
      <LocalityDemands id={id} />
      <Suspense fallback={<p className="mt-6 text-sm text-muted-foreground">Chargement météo…</p>}><LocalityWeather id={id} /></Suspense>
    </WorkspacePage>
  );
}

function LocalityWeather({ id }: { id: string }) {
  const { data } = useSuspenseQuery(weatherListOptions);
  const rows = data.filter((r) => r.locality_id === id);
  return <section className="mt-8 space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Fiches météo des sites ({rows.length})</h2><Button asChild size="sm" variant="outline"><Link to="/geography/weather" search={{locality:id}}>Voir les fiches météo</Link></Button></div>{!rows.length ? <p className="text-sm text-muted-foreground">Aucune fiche météo enregistrée pour les sites de cette localité.</p> : <ul className="divide-y divide-border border border-border text-sm">{rows.map((r)=><li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3"><Link to="/geography/weather/$id" params={{id:r.id}} className="text-primary hover:underline">{r.name} · {r.study_sites?.name}</Link><StatusBadge status={r.status}/></li>)}</ul>}</section>;
}

function LocalityBiomass({ id, canWrite }: { id: string; canWrite: boolean }) {
  const { data: bio } = useQuery({ queryKey: ["locality-biomass", id], queryFn: () => getLocalityBiomass({ data: { localityId: id } }) });
  const rows = bio ?? [];
  const last = rows.find((b) => b.status === "validated");
  return (
    <>
      <section className="mt-8 space-y-4">
        <div className="flex items-center justify-between gap-2"><h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Ressources biomasse ({rows.length} jeu{rows.length > 1 ? "x" : ""})</h2>
          {canWrite && <Button asChild size="sm" variant="outline"><Link to="/resources/biomass/new" search={{ locality: id }}><Plus />Données biomasse</Link></Button>}</div>
        {!rows.length ? <p className="text-sm text-muted-foreground">Aucune donnée de biomasse enregistrée pour cette localité.</p> : (
          <>
            <div className="border border-border bg-background p-4 text-sm"><p className="font-medium">Dernier jeu validé</p>
              {last ? <p className="mt-1">{typeText(last)} · {bfmt(last.quantity, last.unit)} · Source : {last.source} — <Link to="/resources/biomass/$id" params={{ id: last.id }} className="text-primary hover:underline">détails</Link></p> : <p className="mt-1 text-muted-foreground">Aucun jeu validé pour l’instant.</p>}</div>
            <ul className="divide-y divide-border border border-border bg-background text-sm">
              {rows.map((b) => <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-2"><Link to="/resources/biomass/$id" params={{ id: b.id }} className="min-w-0 break-words text-primary hover:underline">{typeText(b)} · {bfmt(b.quantity, b.unit)} · {bperiod(b)} — {b.source}{b.site_name ? ` · Site : ${b.site_name}` : ""}</Link><BiomassStatusBadge status={b.status} /></li>)}
            </ul>
            <BiomassComparison rows={[...rows].reverse()} />
          </>
        )}
      </section>
    </>
  );
}
