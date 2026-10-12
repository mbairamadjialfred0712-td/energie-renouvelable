<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project architecture

- Use Lovable Assets pointers for uploaded application imagery; this keeps source media out of the repository while preserving stable imports.
- Keep project pre-analysis prompts and model calls in server-only modules; this protects the AI instructions and prevents client-side secret exposure.
- Render solar temporal charts through the shared SolarEvolution view and browser-safe solar-evolution-data selector, using only dated recorded observations grouped by locality and unit; this prevents inferred trends, unit conversions and divergent detail/list behavior.
- Render other resource temporal charts through ResourceEvolution and its raw observation selector; structured periods prevent inferred dates and fixed metric units prevent mixed-unit series.
- Persist project PV estimates through the authenticated estimate_project_solar RPC, which rechecks roles, ownership and solar validation under resource locks and atomically logs history; this prevents forged results and validation races.
- Keep the annual PV formula in the versioned pure solar-pv-engine contract aligned with the authoritative database RPC; IA only reviews saved snapshots and never calculates production.
