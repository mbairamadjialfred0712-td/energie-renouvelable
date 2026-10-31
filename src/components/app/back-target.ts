export const backTargets = [
  ["/resources/solar", "/resources", "Ressources"], ["/resources/wind", "/resources", "Ressources"], ["/resources/biomass", "/resources", "Ressources"], ["/resources/waste", "/resources", "Ressources"],
  ["/technologies/storage", "/technologies", "Technologies"], ["/simulations", "/dashboard", "Tableau de bord"],
  ["/geography/weather", "/geography", "Territoires"], ["/geography/localities", "/geography", "Territoires"],
  ["/projects", "/dashboard", "Tableau de bord"], ["/demand", "/dashboard", "Tableau de bord"],
] as const;
export function backTarget(path: string) {
  const clean = path.replace(/\/$/, "");
  for (const [prefix, parent, label] of backTargets) {
    if (clean === prefix) return { to: parent, label };
    if (clean.startsWith(`${prefix}/`)) return { to: prefix, label: prefix.startsWith("/resources") ? "Liste des ressources" : prefix === "/technologies/storage" ? "Bibliothèque des batteries" : prefix === "/simulations" ? "Simulations" : "Liste" };
  }
  return { to: "/dashboard" as const, label: "Tableau de bord" };
}