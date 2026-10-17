import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { HybridWorkspace } from "@/features/hybrid/hybrid-workspace";
import { getHybridWorkspace } from "@/lib/hybrid.functions";
const options = queryOptions({ queryKey: ["hybrid-workspace"], queryFn: () => getHybridWorkspace() });
export const Route = createFileRoute("/_authenticated/scenarios")({
  head: () => ({ meta: [{ title: "Systèmes hybrides — Énergie Renouvelable" }, { name: "description", content: "Configuration des systèmes hybrides et comparaison des résultats individuels traçables." }, { property: "og:title", content: "Systèmes hybrides — Énergie Renouvelable" }, { property: "og:description", content: "Préparation sans simulation hybride fictive ni conversion énergétique implicite." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(options),
  component: Page,
});
function Page() { const { data } = useSuspenseQuery(options); return <HybridWorkspace data={data} />; }
