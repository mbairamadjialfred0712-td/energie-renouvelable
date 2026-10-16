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
- Store shared technical settings as immutable versions and snapshot the selected version through authorized calculation RPCs; historical estimates must not change when settings change.
- Calculate wind from documented gross capacity factor and biomass from as-received mass and PCI in the annual-energy-engine contract aligned with the authoritative RPC; neither mean wind speed nor forest stock establishes annual electrical production.
- Assign or revoke only the engineer role through the admin-checked set_tester_engineer RPC with atomic audit history; this protects administrators and prevents privilege escalation.
- Keep undated biomass forest-stock references separate from annual fuel resources, retaining native coordinates when the source omits its coordinate reference system; this prevents invented dates, map positions and energy availability.
- Require a non-null authenticated subject for shared catalogue SELECT policies; catalogue sharing must not allow subjectless authenticated-role requests.
- Gate biomass project estimates on biomass_status validated, t/an quantity and as-received PCI in the RPC; dry-basis or non-annual data must never be converted silently.
- Compute demand estimates only in the pure demand-engine contract (weekly-days convention, explicit 30-day month) and keep measured consumption in its own field; inventory estimates must never replace or be shown as measurements.
