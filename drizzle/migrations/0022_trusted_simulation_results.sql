-- Preserve existing rows; calculated results and status are written by trusted server only.
revoke insert, update, delete on public.simulations from anon, authenticated;
revoke insert, update, delete on public.simulation_results from anon, authenticated;
grant select on public.simulations, public.simulation_results to authenticated;
grant all on public.simulations, public.simulation_results to service_role;
-- Existing owner/admin SELECT RLS remains effective; no historical row is modified.