import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDemandAccess, getLocalityDemands } from "@/lib/demand.functions";
import { DemandStatusBadge, categoryText, periodText } from "./demand-ui";

export function LocalityDemands({ id }: { id: string }) {
  const { data: rows = [] } = useQuery({ queryKey: ["locality-demands", id], queryFn: () => getLocalityDemands({ data: { localityId: id } }) });
  const { data: access } = useQuery({ queryKey: ["demand-access"], queryFn: () => getDemandAccess() });
  return <section className="mt-8 space-y-4">
    <div className="flex items-center justify-between gap-2"><h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Demandes énergétiques ({rows.length})</h2>
      {access?.canWrite && <Button asChild size="sm" variant="outline"><Link to="/demand/new" search={{ locality: id }}><Plus />Demande</Link></Button>}</div>
    {!rows.length ? <p className="text-sm text-muted-foreground">Aucune demande énergétique enregistrée pour cette localité.</p> :
      <ul className="divide-y divide-border border border-border bg-background text-sm">{rows.map((d) => <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-2"><Link to="/demand/$id" params={{ id: d.id }} className="min-w-0 break-words text-primary hover:underline">{d.name} · {categoryText(d)} · {periodText(d)}{d.site_name ? ` · Site : ${d.site_name}` : ""}</Link><DemandStatusBadge status={d.status} /></li>)}</ul>}
  </section>;
}
