import { createFileRoute } from "@tanstack/react-router";
import logoAsset from "@/assets/energie-renouvelable-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Énergie Renouvelable — Ingénierie et planification énergétique" },
      {
        name: "description",
        content:
          "Plateforme professionnelle d’analyse, de simulation et de planification des systèmes énergétiques renouvelables.",
      },
      {
        property: "og:title",
        content: "Énergie Renouvelable — Ingénierie et planification énergétique",
      },
      {
        property: "og:description",
        content:
          "Analyse, simulation et planification professionnelle des systèmes énergétiques renouvelables.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-16">
      <div className="brand-grid absolute inset-0" aria-hidden="true" />
      <div className="relative flex w-full max-w-4xl flex-col items-center text-center">
        <img
          src={logoAsset.url}
          alt="Énergie Renouvelable"
          className="h-auto w-full max-w-3xl object-contain"
        />
        <div className="mt-8 h-px w-24 bg-brand-line" aria-hidden="true" />
        <p className="mt-6 max-w-2xl text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground sm:text-base">
          Analyse · Simulation · Planification énergétique
        </p>
      </div>
    </main>
  );
}
