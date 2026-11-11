CREATE TABLE public.population_import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  trigger text NOT NULL CHECK (trigger IN ('schedule','manual')),
  triggered_by uuid,
  status text NOT NULL CHECK (status IN ('running','success','failed')),
  source text NOT NULL DEFAULT 'Banque mondiale — SP.POP.TOTL',
  source_last_updated text,
  countries_total integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  unchanged_count integer NOT NULL DEFAULT 0,
  kept_other_source_count integer NOT NULL DEFAULT 0,
  missing_countries jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text
);
GRANT SELECT ON public.population_import_runs TO authenticated;
GRANT ALL ON public.population_import_runs TO service_role;
ALTER TABLE public.population_import_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read import runs" ON public.population_import_runs FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TABLE public.country_population_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.population_import_runs(id) ON DELETE CASCADE,
  country_id uuid NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('updated','unchanged','kept_other_source','missing')),
  previous_population bigint,
  previous_year integer,
  previous_source text,
  previous_method text,
  observed_population bigint,
  observed_year integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX country_population_history_country_idx ON public.country_population_history(country_id, created_at DESC);
GRANT SELECT ON public.country_population_history TO authenticated;
GRANT ALL ON public.country_population_history TO service_role;
ALTER TABLE public.country_population_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read population history" ON public.country_population_history FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);