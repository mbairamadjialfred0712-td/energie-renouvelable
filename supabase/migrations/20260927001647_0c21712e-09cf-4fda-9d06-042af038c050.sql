CREATE TYPE public.project_field_kind AS ENUM ('provided', 'assumption');
CREATE TYPE public.pre_analysis_status AS ENUM ('running', 'completed', 'failed');

CREATE TABLE public.project_data_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  section text NOT NULL,
  field_key text NOT NULL,
  label text NOT NULL,
  value_text text NOT NULL,
  unit text,
  field_kind public.project_field_kind NOT NULL DEFAULT 'provided',
  source text,
  data_period text,
  quality text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, field_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_data_fields TO authenticated;
GRANT ALL ON public.project_data_fields TO service_role;
ALTER TABLE public.project_data_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage project data fields" ON public.project_data_fields
FOR ALL TO authenticated
USING (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()))
WITH CHECK (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));
CREATE TRIGGER set_project_data_fields_updated_at BEFORE UPDATE ON public.project_data_fields FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.project_change_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  actor_id uuid NOT NULL DEFAULT auth.uid(),
  action text NOT NULL,
  summary text NOT NULL,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.project_change_history TO authenticated;
GRANT ALL ON public.project_change_history TO service_role;
ALTER TABLE public.project_change_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view project history" ON public.project_change_history
FOR SELECT TO authenticated
USING (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));
CREATE POLICY "Owners append project history" ON public.project_change_history
FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid() AND actor_id = auth.uid() AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));

CREATE TABLE public.project_pre_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  requested_by uuid NOT NULL DEFAULT auth.uid(),
  status public.pre_analysis_status NOT NULL DEFAULT 'running',
  model text NOT NULL,
  input_snapshot jsonb NOT NULL,
  missing_information jsonb NOT NULL DEFAULT '[]'::jsonb,
  declared_assumptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  verification_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  scope_note text NOT NULL,
  error_message text,
  gateway_run_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.project_pre_analyses TO authenticated;
GRANT ALL ON public.project_pre_analyses TO service_role;
ALTER TABLE public.project_pre_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view project analyses" ON public.project_pre_analyses
FOR SELECT TO authenticated
USING (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));
CREATE POLICY "Owners create project analyses" ON public.project_pre_analyses
FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid() AND requested_by = auth.uid() AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));
CREATE POLICY "Owners update project analyses" ON public.project_pre_analyses
FOR UPDATE TO authenticated
USING (owner_id = auth.uid() AND requested_by = auth.uid() AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()))
WITH CHECK (owner_id = auth.uid() AND requested_by = auth.uid() AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));

CREATE INDEX project_data_fields_project_idx ON public.project_data_fields(project_id, sort_order);
CREATE INDEX project_change_history_project_idx ON public.project_change_history(project_id, created_at DESC);
CREATE INDEX project_pre_analyses_project_idx ON public.project_pre_analyses(project_id, created_at DESC);