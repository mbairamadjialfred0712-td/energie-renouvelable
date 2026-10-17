import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { WorkspacePage } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { deleteDatasheet, getDatasheet, getStorageAccess, setDatasheetStatus } from "@/lib/storage.functions";
import { APPLICATIONS, CHEMISTRIES, FIELDS, GROUPS, METHODS, costPerKwh, nominalCapacity, energyCheck, sheetWarnings, usableEstimate } from "@/features/storage/battery-model";
import { BatteryForm } from "@/features/storage/battery-form";
import { StatusBadge, val } from "@/features/storage/battery-ui";

const META = "Fiche technique d’une batterie : caractéristiques nominales du fabricant, contrôles de cohérence, sources et historique.";
export const Route = createFileRoute("/_authenticated/technologies/storage/$id")({
  head: () => ({ meta: [{ title: "Fiche batterie — Énergie Renouvelable" }, { name: "description", content: META }, { property: "og:title", content: "Fiche batterie — Énergie Renouvelable" }, { property: "og:description", content: META }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Detail,
});

function Detail() {
  const { id } = Route.useParams(); const navigate = useNavigate(); const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["battery-sheet", id], queryFn: () => getDatasheet({ data: { id } }) });
  const { data: access } = useQuery({ queryKey: ["storage-access"], queryFn: () => getStorageAccess() });
  const del = useServerFn(deleteDatasheet);
  const setStatus = useServerFn(setDatasheetStatus);
  const [editing, setEditing] = useState(false); const [msg, setMsg] = useState<string | null>(null);
  const changeStatus = async (status: string) => { setMsg(null); try { await setStatus({ data: { id, status: status as never } }); qc.invalidateQueries(); } catch (e) { setMsg((e as Error).message); } };
  if (isLoading) return <WorkspacePage eyebrow="Technologies / Stockage" title="Fiche" description="Chargement…"><span /></WorkspacePage>;
  if (!data) return <WorkspacePage eyebrow="Technologies / Stockage" title="Fiche introuvable" description="Cette fiche n’existe pas."><Link to="/technologies/storage" className="text-primary">Retour</Link></WorkspacePage>;
  const s = data.item;
  const canEdit = !!access && (access.isAdmin || (access.canWrite && s.owner_id === access.userId));
  const nominal = nominalCapacity(s);
  const check = energyCheck(s), usable = usableEstimate(s), costs = costPerKwh(s), warnings = sheetWarnings(s);
  if (editing) return <WorkspacePage eyebrow="Technologies / Stockage" title={`Modifier — ${s.name}`} description="Les modifications sont conservées dans l’historique."><BatteryForm row={s} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); qc.invalidateQueries(); }} /></WorkspacePage>;
  return <WorkspacePage eyebrow="Technologies / Stockage" title={s.name} description={`${s.manufacturer} · ${s.chemistry === "other" ? `Autre — ${s.chemistry_detail}` : CHEMISTRIES[s.chemistry]}${s.application ? ` · ${APPLICATIONS[s.application as keyof typeof APPLICATIONS]}` : ""}`}
    action={canEdit ? <div className="flex gap-2"><Button variant="outline" onClick={() => setEditing(true)}><Pencil />Modifier</Button><Button variant="ghost" aria-label="Supprimer" onClick={async () => { if (!confirm("Supprimer cette fiche ?")) return; try { await del({ data: { id } }); qc.invalidateQueries(); navigate({ to: "/technologies/storage" }); } catch (e) { setMsg((e as Error).message); } }}><Trash2 /></Button></div> : null}>
    <div className="flex flex-wrap items-center gap-2"><StatusBadge status={s.status} /><span className="text-xs text-muted-foreground">Source : {s.source}{s.acquisition_method ? ` · ${METHODS[s.acquisition_method as keyof typeof METHODS]}` : ""}</span>{!canEdit && <span className="text-xs text-muted-foreground">· Consultation seule</span>}</div>
    {canEdit && <div className="mt-3 flex flex-wrap gap-2">
      {s.status !== "validated" && s.status !== "archived" && <Button size="sm" variant="outline" onClick={() => changeStatus("validated")}>Valider la fiche</Button>}
      {s.status !== "rejected" && s.status !== "archived" && <Button size="sm" variant="outline" onClick={() => changeStatus("rejected")}>Rejeter</Button>}
      {s.status !== "in_review" && s.status !== "archived" && <Button size="sm" variant="ghost" onClick={() => changeStatus("in_review")}>Passer à examiner</Button>}
      {s.status !== "archived" && <Button size="sm" variant="ghost" onClick={() => changeStatus("archived")}>Archiver</Button>}
      {s.status === "archived" && <Button size="sm" variant="ghost" onClick={() => changeStatus("in_review")}>Désarchiver</Button>}
    </div>}
    {msg && <p role="alert" className="mt-2 text-sm text-destructive">{msg}</p>}
    {s.status !== "validated" && <p className="mt-2 text-xs text-muted-foreground">Fiche non validée : les valeurs ne sont pas des caractéristiques officiellement confirmées.</p>}
    <section className="mt-6"><h2 className="font-semibold">Niveau A — capacité énergétique</h2><p className="mt-2 text-sm">{nominal ? <>Énergie nominale retenue : <b>{val(nominal.kwh, "kWh")}</b> · {nominal.formula} · source : {s.source}</> : "Énergie nominale indisponible : énergie documentée ou tension et capacité cohérentes requises."}</p><p className="mt-1 text-xs text-muted-foreground">Capacité utilisable côté batterie, sans rendement de décharge appliqué. Énergie réellement délivrée distincte et dépendante de la charge.</p></section>
    <section className="mt-4 grid gap-3 lg:grid-cols-3">
      <div className="border border-border bg-background p-4 text-sm"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">Contrôle énergie (indicatif)</p>{check ? <p className="mt-2">V × Ah ÷ 1 000 = <b>{val(check.computed, "kWh")}</b> · déclaré {val(check.declared, "kWh")} · écart {check.gapPct.toFixed(1)} %</p> : <p className="mt-2 text-muted-foreground">Tension, capacité et énergie nécessaires.</p>}<p className="mt-1 text-xs text-muted-foreground">La valeur fabricant n’est jamais remplacée.</p></div>
      <div className="border border-border bg-background p-4 text-sm"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">Énergie utilisable</p>{s.usable_kwh != null ? <p className="mt-2">Valeur saisie/documentée : <b>{val(s.usable_kwh, "kWh")}</b></p> : usable ? <p className="mt-2">Estimée : <b>{val(usable.kwh, "kWh")}</b><br /><span className="text-xs text-muted-foreground">{usable.formula}</span></p> : <p className="mt-2 text-muted-foreground">Non déclarée ; DoD ou énergie manquants. Aucune hypothèse de 100 %.</p>}</div>
      <div className="border border-border bg-background p-4 text-sm"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">Coût par kWh</p>{costs.length ? costs.map((c) => <p key={c.label} className="mt-2">{val(c.value, c.label)}</p>) : <p className="mt-2 text-muted-foreground">Prix, devise ou énergie manquants : non calculé.</p>}<p className="mt-1 text-xs text-muted-foreground">Sans conversion de devise.</p></div>
    </section>
    {warnings.length > 0 && <ul className="mt-4 list-disc space-y-1 border border-border bg-muted/40 p-3 pl-7 text-sm">{warnings.map((w) => <li key={w}>Alerte : {w}</li>)}</ul>}
    {GROUPS.map((gname) => { const fs = FIELDS.filter((f) => f.group === gname); return <section key={gname} className="mt-6"><h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{gname}</h2>
      <dl className="mt-2 grid gap-x-6 gap-y-2 border border-border bg-background p-4 text-sm sm:grid-cols-2">{fs.map((f) => <div key={f.key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-2"><dt className="text-muted-foreground">{f.label}{f.unit ? ` (${f.unit})` : ""}</dt><dd className="break-words">{f.kind === "url" && s[f.key] ? <a href={String(s[f.key])} target="_blank" rel="noreferrer" className="text-primary hover:underline">{String(s[f.key])}</a> : val(s[f.key], "")}</dd></div>)}</dl></section>; })}
    <section className="mt-6 space-y-2"><h2 className="font-semibold">Niveau B — autonomie estimée</h2><p className="text-sm text-muted-foreground">Indisponible dans cette fiche : aucune demande moyenne de projet et aucun rendement de décharge retenu liés à ce calcul. Une capacité seule ne garantit pas une autonomie.</p><h2 className="font-semibold">Niveau C — simulation chronologique</h2><Button asChild variant="outline"><Link to="/simulations/new">Ouvrir les simulations</Link></Button></section>
    <p className="mt-6 text-xs text-muted-foreground">Aucune courbe de charge, décharge ou dégradation n’est affichée : elles nécessitent des données mesurées ou un modèle validé.</p>
    <section className="mt-6"><h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Historique</h2>
      <ul className="mt-2 divide-y divide-border border border-border bg-background text-sm">{data.history.map((h) => <li key={h.id} className="px-4 py-2"><span className="text-muted-foreground">{new Date(h.created_at).toLocaleString("fr-FR")}</span> · {h.action === "created" ? "Création" : h.action === "status" ? "Changement de statut" : "Modification"}{h.fields.length ? <span className="text-muted-foreground"> — {h.fields.join(", ")}</span> : null}</li>)}</ul></section>
  </WorkspacePage>;
}
