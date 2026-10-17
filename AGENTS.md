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

- Keep site weather datasets immutable except status and notes, with hourly UTC samples, explicit native radiation units and source provenance; separate them from energy resources and reject incomplete series for validation so imports never silently change scientific inputs.

- Use Lovable Assets pointers for uploaded application imagery; this keeps source media out of the repository while preserving stable imports.
- Keep project pre-analysis prompts and model calls in server-only modules; this protects the AI instructions and prevents client-side secret exposure.
- Render solar temporal charts through the shared SolarEvolution view and browser-safe solar-evolution-data selector, using only dated recorded observations grouped by locality and unit; this prevents inferred trends, unit conversions and divergent detail/list behavior.
- Render other resource temporal charts through ResourceEvolution and its raw observation selector; structured periods prevent inferred dates and fixed metric units prevent mixed-unit series.
- Persist project PV estimates through the authenticated estimate_project_solar RPC, which rechecks roles, ownership and solar validation under resource locks and atomically logs history; this prevents forged results and validation races.
- Keep the annual PV formula in the versioned pure solar-pv-engine contract aligned with the authoritative database RPC; IA only reviews saved snapshots and never calculates production.
- Store shared technical settings as immutable versions and snapshot the selected version through authorized calculation RPCs; historical estimates must not change when settings change.
- Keep legacy annual wind/biomass estimates aligned with their RPC; isolate biomass primary energy from electricity and require explicit availability/conversion boundaries to prevent implicit conversions.
- Assign or revoke only the engineer role through the admin-checked set_tester_engineer RPC with atomic audit history; this protects administrators and prevents privilege escalation.
- Keep undated biomass forest-stock references separate from annual fuel resources, retaining native coordinates when the source omits its coordinate reference system; this prevents invented dates, map positions and energy availability.
- Require a non-null authenticated subject for shared catalogue SELECT policies; catalogue sharing must not allow subjectless authenticated-role requests.
- Gate biomass project estimates on biomass_status validated, t/an quantity and as-received PCI in the RPC; dry-basis or non-annual data must never be converted silently.
- Compute demand estimates only in the pure demand-engine contract (weekly-days convention, explicit 30-day month) and keep measured consumption in its own field; inventory estimates must never replace or be shown as measurements.
- Keep manufacturer values separate from justified project settings; ordinary same-sheet saves preserve snapshots, including legacy nulls, preventing historical input drift.
- Route all scientific engine calls through the server-only engine.functions client (shared key + forwarded user token, contract mirrored in engine-contract.ts and python-engine schemas); the browser never calls FastAPI and absent engines show an unconfigured state, never simulated results.
- Keep engine HTTP transport in dynamically imported server-only modules and validate response identity, completeness and persistence before reporting success; revoke browser writes to simulations/results and use privileged persistence only after user-RLS role/access checks to prevent fabricated or unrelated PV outputs.
- Run hourly PV only through the Python engine's PVWatts v8 wrapper (official NREL PySAM, no in-house PV equations), persisting the full request in simulations.parameters and outputs in simulation_results; this keeps results reproducible, versioned and never partially saved.
- Run Python batteries with server-selected validated snapshots and same-project completed PV; usable_energy_kwh means reference capacity before SOC reduction. Verify all balances before persistence to prevent double reductions and forged inputs.
- Compute LCOE only in the pure finance-engine contract; project finance assumptions persist versioned (history trigger) and a linked completed simulation's stored annual production overrides any manual year-1 value, never the reverse.
- Keep CSP isolated with prescribed signed balances, unavailable outputs and server-selected validated DNI; preserve conversion/provenance to avoid fabricated dispatch or PV-rule reuse.
- Keep wind A/B/C isolated with documented curves in request snapshots and server-selected validated hourly weather; check response integrity before existing authenticated persistence so kinetic flux never becomes electricity.
- Isolate engine role checks and series reads in engine-access.server for testable user access.
- Hybrid preparation reuses versioned scenarios JSON and retains revisions; compare trusted individual simulations without summing or copying results. Chronological dispatch remains unavailable until validated.
