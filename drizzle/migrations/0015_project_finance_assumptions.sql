CREATE TABLE public.project_finance_assumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  capex NUMERIC NOT NULL CHECK (capex > 0),
  annual_opex NUMERIC NOT NULL DEFAULT 0 CHECK (annual_opex >= 0),
  lifetime_years INTEGER NOT NULL CHECK (lifetime_years BETWEEN 1 AND 100),
  discount_rate_pct NUMERIC NOT NULL CHECK (discount_rate_pct > -100),
  degradation_pct_per_year NUMERIC NOT NULL DEFAULT 0 CHECK (degradation_pct_per_year BETWEEN 0 AND 100),
  year_one_production_kwh NUMERIC CHECK (year_one_production_kwh IS NULL OR year_one_production_kwh > 0),
  production_simulation_id UUID REFERENCES public.simulations(id) ON DELETE SET NULL,
  replacements JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT project_finance_assumptions_project_key UNIQUE (project_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_finance_assumptions TO authenticated;
GRANT ALL ON public.project_finance_assumptions TO service_role;
ALTER TABLE public.project_finance_assumptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY project_finance_select ON public.project_finance_assumptions FOR SELECT TO authenticated USING (app_private.can_access(owner_id));
CREATE POLICY project_finance_insert ON public.project_finance_assumptions FOR INSERT TO authenticated WITH CHECK (app_private.can_write_resource(owner_id));
CREATE POLICY project_finance_update ON public.project_finance_assumptions FOR UPDATE TO authenticated USING (app_private.can_access(owner_id)) WITH CHECK (app_private.can_write_resource(owner_id));
CREATE POLICY project_finance_delete ON public.project_finance_assumptions FOR DELETE TO authenticated USING (app_private.can_write_resource(owner_id));
CREATE TABLE public.project_finance_assumption_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assumption_id UUID NOT NULL REFERENCES public.project_finance_assumptions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created','updated')),
  snapshot JSONB NOT NULL,
  changed_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.project_finance_assumption_history TO authenticated;
GRANT ALL ON public.project_finance_assumption_history TO service_role;
ALTER TABLE public.project_finance_assumption_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY project_finance_history_select ON public.project_finance_assumption_history FOR SELECT TO authenticated USING (app_private.can_access(owner_id));
CREATE OR REPLACE FUNCTION public.log_project_finance_assumptions() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.project_finance_assumption_history (assumption_id, project_id, owner_id, action, snapshot, changed_by)
  VALUES (NEW.id, NEW.project_id, NEW.owner_id, TG_OP = 'INSERT' AND 'created' OR 'updated', to_jsonb(NEW), auth.uid());
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_project_finance_assumptions BEFORE INSERT OR UPDATE ON public.project_finance_assumptions FOR EACH ROW EXECUTE FUNCTION public.log_project_finance_assumptions();