ALTER TABLE public.wind_resources ADD COLUMN period_start date, ADD COLUMN period_end date, ADD CONSTRAINT wind_period_order CHECK (period_end >= period_start);
ALTER TABLE public.biomass_resources ADD COLUMN period_start date, ADD COLUMN period_end date, ADD CONSTRAINT biomass_period_order CHECK (period_end >= period_start);
ALTER TABLE public.waste_resources ADD COLUMN period_start date, ADD COLUMN period_end date, ADD CONSTRAINT waste_period_order CHECK (period_end >= period_start);
CREATE TABLE public.project_solar_production (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
 owner_id uuid NOT NULL,
 requested_by uuid NOT NULL,
 resource_id uuid REFERENCES public.energy_resources(id) ON DELETE SET NULL,
 production_kwh numeric NOT NULL CHECK (production_kwh >= 0),
 input_snapshot jsonb NOT NULL,
 method text NOT NULL,
 engine_version text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.project_solar_production TO authenticated;
GRANT ALL ON public.project_solar_production TO service_role;
ALTER TABLE public.project_solar_production ENABLE ROW LEVEL SECURITY;
CREATE POLICY production_project_read ON public.project_solar_production FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id));
CREATE INDEX production_project_created ON public.project_solar_production(project_id, created_at DESC);