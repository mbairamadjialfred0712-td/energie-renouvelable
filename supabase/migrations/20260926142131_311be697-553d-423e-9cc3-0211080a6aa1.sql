CREATE TYPE public.app_role AS ENUM ('admin', 'engineer', 'analyst', 'viewer');
CREATE TYPE public.record_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE public.simulation_status AS ENUM ('draft', 'queued', 'running', 'completed', 'failed');
CREATE TYPE public.project_status AS ENUM ('draft', 'preliminary_study', 'feasibility', 'design', 'financing', 'procurement', 'implementation', 'completed');
CREATE TYPE public.validation_status AS ENUM ('pending', 'validated', 'rejected');

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 120),
  avatar_url text,
  organization text,
  job_title text,
  phone text,
  locale text NOT NULL DEFAULT 'fr',
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_own_select ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY profiles_own_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY profiles_own_update ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_roles_own_select ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.initialize_user_profile(_display_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  INSERT INTO public.profiles (id, display_name) VALUES (auth.uid(), trim(_display_name)) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'viewer') ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION public.initialize_user_profile(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_access(_owner_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() = _owner_id OR public.has_role(auth.uid(), 'admin')
$$;
GRANT EXECUTE ON FUNCTION public.can_access(uuid) TO authenticated;

CREATE TABLE public.countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL, code text NOT NULL CHECK (char_length(code) BETWEEN 2 AND 3), status public.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(owner_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.countries TO authenticated; GRANT ALL ON public.countries TO service_role;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY countries_access ON public.countries FOR ALL TO authenticated USING (public.can_access(owner_id)) WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER countries_updated_at BEFORE UPDATE ON public.countries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL DEFAULT auth.uid(), country_id uuid NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  name text NOT NULL, code text, status public.record_status NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.regions TO authenticated; GRANT ALL ON public.regions TO service_role;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY regions_access ON public.regions FOR ALL TO authenticated USING (public.can_access(owner_id)) WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX regions_country_idx ON public.regions(country_id); CREATE TRIGGER regions_updated_at BEFORE UPDATE ON public.regions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL DEFAULT auth.uid(), region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  name text NOT NULL, code text, status public.record_status NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated; GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY departments_access ON public.departments FOR ALL TO authenticated USING (public.can_access(owner_id)) WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX departments_region_idx ON public.departments(region_id); CREATE TRIGGER departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.localities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL DEFAULT auth.uid(), department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  name text NOT NULL, code text, latitude numeric(9,6) CHECK (latitude BETWEEN -90 AND 90), longitude numeric(9,6) CHECK (longitude BETWEEN -180 AND 180),
  altitude_m numeric, population bigint CHECK (population IS NULL OR population >= 0), grid_access boolean, annual_demand_kwh numeric CHECK (annual_demand_kwh IS NULL OR annual_demand_kwh >= 0),
  data_source text, data_period text, data_quality text, status public.record_status NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.localities TO authenticated; GRANT ALL ON public.localities TO service_role;
ALTER TABLE public.localities ENABLE ROW LEVEL SECURITY;
CREATE POLICY localities_access ON public.localities FOR ALL TO authenticated USING (public.can_access(owner_id)) WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX localities_department_idx ON public.localities(department_id); CREATE TRIGGER localities_updated_at BEFORE UPDATE ON public.localities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.energy_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL DEFAULT auth.uid(), locality_id uuid NOT NULL REFERENCES public.localities(id) ON DELETE CASCADE,
  resource_type text NOT NULL CHECK (resource_type IN ('solar','wind','biomass','waste')), potential_level text, source text NOT NULL, period text, reference text, quality text,
  validation_status public.validation_status NOT NULL DEFAULT 'pending', notes text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.energy_resources TO authenticated; GRANT ALL ON public.energy_resources TO service_role;
ALTER TABLE public.energy_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY energy_resources_access ON public.energy_resources FOR ALL TO authenticated USING (public.can_access(owner_id)) WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX energy_resources_locality_idx ON public.energy_resources(locality_id); CREATE TRIGGER energy_resources_updated_at BEFORE UPDATE ON public.energy_resources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.solar_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL DEFAULT auth.uid(), resource_id uuid NOT NULL UNIQUE REFERENCES public.energy_resources(id) ON DELETE CASCADE,
  ghi_kwh_m2_day numeric CHECK (ghi_kwh_m2_day IS NULL OR ghi_kwh_m2_day >= 0), dni_kwh_m2_day numeric CHECK (dni_kwh_m2_day IS NULL OR dni_kwh_m2_day >= 0), dhi_kwh_m2_day numeric CHECK (dhi_kwh_m2_day IS NULL OR dhi_kwh_m2_day >= 0),
  annual_irradiation_kwh_m2 numeric CHECK (annual_irradiation_kwh_m2 IS NULL OR annual_irradiation_kwh_m2 >= 0), avg_temperature_c numeric, min_temperature_c numeric, max_temperature_c numeric, sunshine_hours numeric CHECK (sunshine_hours IS NULL OR sunshine_hours >= 0),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solar_resources TO authenticated; GRANT ALL ON public.solar_resources TO service_role;
ALTER TABLE public.solar_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY solar_resources_access ON public.solar_resources FOR ALL TO authenticated USING (public.can_access(owner_id)) WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER solar_resources_updated_at BEFORE UPDATE ON public.solar_resources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.wind_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL DEFAULT auth.uid(), resource_id uuid NOT NULL UNIQUE REFERENCES public.energy_resources(id) ON DELETE CASCADE,
  average_speed_ms numeric CHECK (average_speed_ms IS NULL OR average_speed_ms >= 0), maximum_speed_ms numeric CHECK (maximum_speed_ms IS NULL OR maximum_speed_ms >= 0), measurement_height_m numeric CHECK (measurement_height_m IS NULL OR measurement_height_m > 0), direction_deg numeric CHECK (direction_deg IS NULL OR direction_deg BETWEEN 0 AND 360), capacity_factor_pct numeric CHECK (capacity_factor_pct IS NULL OR capacity_factor_pct BETWEEN 0 AND 100), air_density_kg_m3 numeric,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wind_resources TO authenticated; GRANT ALL ON public.wind_resources TO service_role;
ALTER TABLE public.wind_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY wind_resources_access ON public.wind_resources FOR ALL TO authenticated USING (public.can_access(owner_id)) WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER wind_resources_updated_at BEFORE UPDATE ON public.wind_resources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.biomass_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL DEFAULT auth.uid(), resource_id uuid NOT NULL UNIQUE REFERENCES public.energy_resources(id) ON DELETE CASCADE,
  biomass_type text NOT NULL, annual_quantity_t numeric CHECK (annual_quantity_t IS NULL OR annual_quantity_t >= 0), moisture_pct numeric CHECK (moisture_pct IS NULL OR moisture_pct BETWEEN 0 AND 100), calorific_value_mj_kg numeric CHECK (calorific_value_mj_kg IS NULL OR calorific_value_mj_kg >= 0), energy_potential_mwh numeric CHECK (energy_potential_mwh IS NULL OR energy_potential_mwh >= 0), exploitable_fraction_pct numeric CHECK (exploitable_fraction_pct IS NULL OR exploitable_fraction_pct BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biomass_resources TO authenticated; GRANT ALL ON public.biomass_resources TO service_role;
ALTER TABLE public.biomass_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY biomass_resources_access ON public.biomass_resources FOR ALL TO authenticated USING (public.can_access(owner_id)) WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER biomass_resources_updated_at BEFORE UPDATE ON public.biomass_resources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.waste_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL DEFAULT auth.uid(), resource_id uuid NOT NULL UNIQUE REFERENCES public.energy_resources(id) ON DELETE CASCADE,
  waste_type text NOT NULL, annual_quantity_t numeric CHECK (annual_quantity_t IS NULL OR annual_quantity_t >= 0), moisture_pct numeric CHECK (moisture_pct IS NULL OR moisture_pct BETWEEN 0 AND 100), calorific_value_mj_kg numeric CHECK (calorific_value_mj_kg IS NULL OR calorific_value_mj_kg >= 0), energy_potential_mwh numeric CHECK (energy_potential_mwh IS NULL OR energy_potential_mwh >= 0), recovery_method text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waste_resources TO authenticated; GRANT ALL ON public.waste_resources TO service_role;
ALTER TABLE public.waste_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY waste_resources_access ON public.waste_resources FOR ALL TO authenticated USING (public.can_access(owner_id)) WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER waste_resources_updated_at BEFORE UPDATE ON public.waste_resources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.energy_demands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL DEFAULT auth.uid(), locality_id uuid NOT NULL REFERENCES public.localities(id) ON DELETE CASCADE,
  name text NOT NULL, annual_demand_kwh numeric CHECK (annual_demand_kwh IS NULL OR annual_demand_kwh >= 0), daily_demand_kwh numeric CHECK (daily_demand_kwh IS NULL OR daily_demand_kwh >= 0), peak_power_kw numeric CHECK (peak_power_kw IS NULL OR peak_power_kw >= 0), demand_profile jsonb, sector text NOT NULL, study_year integer CHECK (study_year BETWEEN 1900 AND 2200), growth_rate_pct numeric, source text, assumptions text, validation_status public.validation_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.energy_demands TO authenticated; GRANT ALL ON public.energy_demands TO service_role;
ALTER TABLE public.energy_demands ENABLE ROW LEVEL SECURITY;
CREATE POLICY energy_demands_access ON public.energy_demands FOR ALL TO authenticated USING (public.can_access(owner_id)) WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX energy_demands_locality_idx ON public.energy_demands(locality_id); CREATE TRIGGER energy_demands_updated_at BEFORE UPDATE ON public.energy_demands FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.technologies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE CHECK (code IN ('PV','WIND','BIOMASS','CSP','BATTERY')), name text NOT NULL, category text NOT NULL, description text NOT NULL, active boolean NOT NULL DEFAULT true, configurable_parameters jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.technologies TO authenticated; GRANT ALL ON public.technologies TO service_role;
ALTER TABLE public.technologies ENABLE ROW LEVEL SECURITY;
CREATE POLICY technologies_read ON public.technologies FOR SELECT TO authenticated USING (true);
CREATE TRIGGER technologies_updated_at BEFORE UPDATE ON public.technologies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.technologies (code,name,category,description,configurable_parameters) VALUES
('PV','Photovoltaïque','production','Structure prête pour un futur moteur photovoltaïque validé','{}'),
('WIND','Éolien','production','Structure prête pour un futur moteur éolien validé','{}'),
('BIOMASS','Biomasse','production pilotable','Structure prête pour un futur moteur biomasse validé','{}'),
('CSP','Solaire thermique CSP','production et chaleur','Structure prête pour un futur moteur CSP validé','{}'),
('BATTERY','Batterie','stockage','Structure prête pour un futur moteur de stockage validé','{}');

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL DEFAULT auth.uid(), locality_id uuid REFERENCES public.localities(id) ON DELETE SET NULL,
  name text NOT NULL, description text, status public.project_status NOT NULL DEFAULT 'draft', start_date date, target_date date, metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated; GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY projects_access ON public.projects FOR ALL TO authenticated USING (public.can_access(owner_id)) WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX projects_locality_idx ON public.projects(locality_id); CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL DEFAULT auth.uid(), project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL, locality_id uuid REFERENCES public.localities(id) ON DELETE SET NULL, demand_id uuid REFERENCES public.energy_demands(id) ON DELETE SET NULL,
  name text NOT NULL, description text, period_start date, period_end date, objective text, parameters jsonb NOT NULL DEFAULT '{}'::jsonb, assumptions jsonb NOT NULL DEFAULT '[]'::jsonb, status public.simulation_status NOT NULL DEFAULT 'draft', engine_version text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK (period_end IS NULL OR period_start IS NULL OR period_end >= period_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.simulations TO authenticated; GRANT ALL ON public.simulations TO service_role;
ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY simulations_access ON public.simulations FOR ALL TO authenticated USING (public.can_access(owner_id)) WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX simulations_project_idx ON public.simulations(project_id); CREATE TRIGGER simulations_updated_at BEFORE UPDATE ON public.simulations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.simulation_technologies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL DEFAULT auth.uid(), simulation_id uuid NOT NULL REFERENCES public.simulations(id) ON DELETE CASCADE, technology_id uuid NOT NULL REFERENCES public.technologies(id), installed_power_kw numeric CHECK (installed_power_kw IS NULL OR installed_power_kw >= 0), capacity_kwh numeric CHECK (capacity_kwh IS NULL OR capacity_kwh >= 0), parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(simulation_id, technology_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.simulation_technologies TO authenticated; GRANT ALL ON public.simulation_technologies TO service_role;
ALTER TABLE public.simulation_technologies ENABLE ROW LEVEL SECURITY;
CREATE POLICY simulation_technologies_access ON public.simulation_technologies FOR ALL TO authenticated USING (public.can_access(owner_id)) WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER simulation_technologies_updated_at BEFORE UPDATE ON public.simulation_technologies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.simulation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL DEFAULT auth.uid(), simulation_id uuid NOT NULL REFERENCES public.simulations(id) ON DELETE CASCADE,
  result_type text NOT NULL, value numeric, unit text NOT NULL, timeseries jsonb, calculation_method text NOT NULL, input_snapshot jsonb NOT NULL, assumptions_snapshot jsonb NOT NULL, source_references jsonb NOT NULL DEFAULT '[]'::jsonb, calculated_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.simulation_results TO authenticated; GRANT ALL ON public.simulation_results TO service_role;
ALTER TABLE public.simulation_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY simulation_results_access ON public.simulation_results FOR ALL TO authenticated USING (public.can_access(owner_id)) WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX simulation_results_simulation_idx ON public.simulation_results(simulation_id);

CREATE TABLE public.scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL DEFAULT auth.uid(), simulation_id uuid REFERENCES public.simulations(id) ON DELETE CASCADE,
  name text NOT NULL, description text, technologies jsonb NOT NULL DEFAULT '[]'::jsonb, powers jsonb NOT NULL DEFAULT '{}'::jsonb, battery_config jsonb, assumptions jsonb NOT NULL DEFAULT '[]'::jsonb, objectives jsonb NOT NULL DEFAULT '[]'::jsonb, constraints jsonb NOT NULL DEFAULT '[]'::jsonb, archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scenarios TO authenticated; GRANT ALL ON public.scenarios TO service_role;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY scenarios_access ON public.scenarios FOR ALL TO authenticated USING (public.can_access(owner_id)) WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX scenarios_simulation_idx ON public.scenarios(simulation_id); CREATE TRIGGER scenarios_updated_at BEFORE UPDATE ON public.scenarios FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.scenario_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL DEFAULT auth.uid(), scenario_id uuid NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  indicator text NOT NULL, value numeric, unit text NOT NULL, method text NOT NULL, input_snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scenario_results TO authenticated; GRANT ALL ON public.scenario_results TO service_role;
ALTER TABLE public.scenario_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY scenario_results_access ON public.scenario_results FOR ALL TO authenticated USING (public.can_access(owner_id)) WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.financial_assumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL DEFAULT auth.uid(), project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE, scenario_id uuid REFERENCES public.scenarios(id) ON DELETE CASCADE,
  currency text NOT NULL DEFAULT 'EUR', capex numeric CHECK (capex IS NULL OR capex >= 0), annual_opex numeric CHECK (annual_opex IS NULL OR annual_opex >= 0), lifetime_years integer CHECK (lifetime_years IS NULL OR lifetime_years > 0), maintenance_cost numeric, replacement_cost numeric, electricity_tariff numeric, inflation_pct numeric, discount_rate_pct numeric, assumptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_assumptions TO authenticated; GRANT ALL ON public.financial_assumptions TO service_role;
ALTER TABLE public.financial_assumptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY financial_assumptions_access ON public.financial_assumptions FOR ALL TO authenticated USING (public.can_access(owner_id)) WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER financial_assumptions_updated_at BEFORE UPDATE ON public.financial_assumptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.financial_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL DEFAULT auth.uid(), assumption_id uuid NOT NULL REFERENCES public.financial_assumptions(id) ON DELETE CASCADE,
  metric text NOT NULL CHECK (metric IN ('LCOE','NPV','IRR','PAYBACK','CASH_FLOW')), value numeric, unit text NOT NULL, method text NOT NULL, input_snapshot jsonb NOT NULL, calculated_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_results TO authenticated; GRANT ALL ON public.financial_results TO service_role;
ALTER TABLE public.financial_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY financial_results_access ON public.financial_results FOR ALL TO authenticated USING (public.can_access(owner_id)) WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.imported_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL DEFAULT auth.uid(), project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  file_name text NOT NULL, storage_path text NOT NULL, mime_type text NOT NULL CHECK (mime_type IN ('application/pdf','text/csv','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')), size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 20971520), workflow_step text NOT NULL DEFAULT 'extraction' CHECK (workflow_step IN ('extraction','identification','normalization','validation','saved','failed')), extracted_data jsonb, corrected_data jsonb, validation_status public.validation_status NOT NULL DEFAULT 'pending', error_message text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.imported_files TO authenticated; GRANT ALL ON public.imported_files TO service_role;
ALTER TABLE public.imported_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY imported_files_access ON public.imported_files FOR ALL TO authenticated USING (public.can_access(owner_id)) WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER imported_files_updated_at BEFORE UPDATE ON public.imported_files FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL DEFAULT auth.uid(), project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL, status public.record_status NOT NULL DEFAULT 'draft', sections jsonb NOT NULL DEFAULT '[]'::jsonb, source_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb, generated_file_path text, generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated; GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY reports_access ON public.reports FOR ALL TO authenticated USING (public.can_access(owner_id)) WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER reports_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY storage_project_imports_select ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'project-imports' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY storage_project_imports_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'project-imports' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY storage_project_imports_update ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'project-imports' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'project-imports' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY storage_project_imports_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'project-imports' AND (storage.foldername(name))[1] = auth.uid()::text);