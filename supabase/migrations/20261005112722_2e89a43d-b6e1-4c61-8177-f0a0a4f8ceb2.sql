DELETE FROM public.regions WHERE name = 'ZZ Région Nord' AND owner_id = 'ae0ae005-7ebb-4f06-a0a9-1613af62bd1d';
DELETE FROM public.countries WHERE id IN ('9080d034-a7fe-4bf7-bb3a-117907b52444','6a3ff016-0738-4944-9575-dd0574279913','54e542ba-7ba2-40d2-8ec6-c90267c32ae0');

ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS is_reference boolean NOT NULL DEFAULT false;
ALTER TABLE public.regions ADD COLUMN IF NOT EXISTS is_reference boolean NOT NULL DEFAULT false;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS is_reference boolean NOT NULL DEFAULT false;
ALTER TABLE public.localities ADD COLUMN IF NOT EXISTS is_reference boolean NOT NULL DEFAULT false;

GRANT SELECT ON public.countries, public.regions, public.departments, public.localities TO anon;

CREATE POLICY countries_reference_read ON public.countries FOR SELECT TO anon, authenticated USING (is_reference);
CREATE POLICY regions_reference_read ON public.regions FOR SELECT TO anon, authenticated USING (is_reference);
CREATE POLICY departments_reference_read ON public.departments FOR SELECT TO anon, authenticated USING (is_reference);
CREATE POLICY localities_reference_read ON public.localities FOR SELECT TO anon, authenticated USING (is_reference);

CREATE TABLE public.resource_pre_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES public.energy_resources(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  status public.pre_analysis_status NOT NULL DEFAULT 'running',
  model text NOT NULL,
  input_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  missing_information jsonb NOT NULL DEFAULT '[]'::jsonb,
  declared_assumptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  verification_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  scope_note text NOT NULL DEFAULT '',
  error_message text,
  gateway_run_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.resource_pre_analyses TO authenticated;
GRANT ALL ON public.resource_pre_analyses TO service_role;
ALTER TABLE public.resource_pre_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY resource_pre_analyses_select ON public.resource_pre_analyses FOR SELECT TO authenticated USING (app_private.can_access(owner_id));
CREATE POLICY resource_pre_analyses_insert ON public.resource_pre_analyses FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND requested_by = auth.uid());
CREATE POLICY resource_pre_analyses_update ON public.resource_pre_analyses FOR UPDATE TO authenticated USING (app_private.can_access(owner_id)) WITH CHECK (app_private.can_access(owner_id));
CREATE INDEX resource_pre_analyses_resource_idx ON public.resource_pre_analyses(resource_id, created_at DESC);