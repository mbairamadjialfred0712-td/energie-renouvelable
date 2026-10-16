CREATE TABLE public.battery_datasheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  technology_id uuid REFERENCES public.technologies(id),
  name text NOT NULL CHECK (length(trim(name)) > 1),
  manufacturer text NOT NULL CHECK (length(trim(manufacturer)) > 0),
  product_ref text,
  chemistry text NOT NULL CHECK (chemistry IN ('lfp','nmc','lead_acid','lead_carbon','sodium_ion','other')),
  chemistry_detail text,
  application text,
  description text,
  source text NOT NULL CHECK (length(trim(source)) > 1),
  doc_url text,
  sheet_version text,
  published_on date,
  consulted_on date,
  page_ref text,
  acquisition_method text,
  status public.solar_status NOT NULL DEFAULT 'unverified',
  comments text,
  nominal_voltage_v numeric CHECK (nominal_voltage_v > 0),
  capacity_ah numeric CHECK (capacity_ah > 0),
  energy_kwh numeric CHECK (energy_kwh > 0),
  max_charge_kw numeric CHECK (max_charge_kw >= 0),
  max_discharge_kw numeric CHECK (max_discharge_kw >= 0),
  max_charge_a numeric CHECK (max_charge_a >= 0),
  max_discharge_a numeric CHECK (max_discharge_a >= 0),
  voltage_min_v numeric CHECK (voltage_min_v >= 0),
  voltage_max_v numeric CHECK (voltage_max_v >= 0),
  dod_pct numeric CHECK (dod_pct > 0 AND dod_pct <= 100),
  soc_min_pct numeric CHECK (soc_min_pct >= 0 AND soc_min_pct <= 100),
  soc_max_pct numeric CHECK (soc_max_pct >= 0 AND soc_max_pct <= 100),
  usable_kwh numeric CHECK (usable_kwh > 0),
  warranty_limits text,
  rte_pct numeric CHECK (rte_pct > 0 AND rte_pct <= 100),
  charge_eff_pct numeric CHECK (charge_eff_pct > 0 AND charge_eff_pct <= 100),
  discharge_eff_pct numeric CHECK (discharge_eff_pct > 0 AND discharge_eff_pct <= 100),
  temp_min_c numeric, temp_max_c numeric, temp_recommended_c numeric,
  cooling text, has_bms boolean, safety_notes text,
  cycles integer CHECK (cycles > 0),
  cycle_conditions text,
  calendar_years numeric CHECK (calendar_years > 0),
  eol_capacity_pct numeric CHECK (eol_capacity_pct > 0 AND eol_capacity_pct <= 100),
  degradation_pct_year numeric CHECK (degradation_pct_year >= 0 AND degradation_pct_year <= 100),
  degradation_source text,
  warranty text,
  mass_kg numeric CHECK (mass_kg > 0),
  length_mm numeric CHECK (length_mm > 0), width_mm numeric CHECK (width_mm > 0), height_mm numeric CHECK (height_mm > 0),
  ip_rating text, installation_location text, certifications text, installation_notes text,
  price numeric CHECK (price >= 0), currency text, price_date date,
  install_cost numeric CHECK (install_cost >= 0), replacement_cost numeric CHECK (replacement_cost >= 0), maintenance_cost numeric CHECK (maintenance_cost >= 0),
  cost_source text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT battery_soc_order CHECK (soc_min_pct IS NULL OR soc_max_pct IS NULL OR soc_min_pct < soc_max_pct),
  CONSTRAINT battery_temp_order CHECK (temp_min_c IS NULL OR temp_max_c IS NULL OR temp_min_c <= temp_max_c),
  CONSTRAINT battery_voltage_order CHECK (voltage_min_v IS NULL OR voltage_max_v IS NULL OR voltage_min_v <= voltage_max_v),
  CONSTRAINT battery_other_detail CHECK (chemistry <> 'other' OR length(trim(coalesce(chemistry_detail,''))) > 0),
  CONSTRAINT battery_cost_currency CHECK ((price IS NULL AND install_cost IS NULL AND replacement_cost IS NULL AND maintenance_cost IS NULL) OR length(trim(coalesce(currency,''))) > 0)
);
CREATE INDEX battery_datasheets_chem_idx ON public.battery_datasheets(chemistry);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.battery_datasheets TO authenticated;
GRANT ALL ON public.battery_datasheets TO service_role;
ALTER TABLE public.battery_datasheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY battery_read ON public.battery_datasheets FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY battery_insert ON public.battery_datasheets FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND app_private.can_write_resource(owner_id));
CREATE POLICY battery_update ON public.battery_datasheets FOR UPDATE TO authenticated USING (app_private.can_write_resource(owner_id)) WITH CHECK (app_private.can_write_resource(owner_id));
CREATE POLICY battery_delete ON public.battery_datasheets FOR DELETE TO authenticated USING (app_private.can_write_resource(owner_id));
CREATE TRIGGER battery_datasheets_updated BEFORE UPDATE ON public.battery_datasheets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.battery_datasheet_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  datasheet_id uuid NOT NULL REFERENCES public.battery_datasheets(id) ON DELETE CASCADE,
  actor_id uuid,
  action text NOT NULL,
  fields text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.battery_datasheet_history TO authenticated;
GRANT ALL ON public.battery_datasheet_history TO service_role;
ALTER TABLE public.battery_datasheet_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY battery_history_read ON public.battery_datasheet_history FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.record_battery_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE f text[] := '{}'; k text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.battery_datasheet_history(datasheet_id, actor_id, action) VALUES (NEW.id, auth.uid(), 'created');
  ELSE
    FOR k IN SELECT key FROM jsonb_each(to_jsonb(NEW)) LOOP
      IF k <> 'updated_at' AND (to_jsonb(NEW)->k) IS DISTINCT FROM (to_jsonb(OLD)->k) THEN f := f || k; END IF;
    END LOOP;
    IF array_length(f,1) > 0 THEN
      INSERT INTO public.battery_datasheet_history(datasheet_id, actor_id, action, fields) VALUES (NEW.id, auth.uid(), CASE WHEN 'status' = ANY(f) THEN 'status' ELSE 'updated' END, f);
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.record_battery_history() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER battery_datasheets_history AFTER INSERT OR UPDATE ON public.battery_datasheets FOR EACH ROW EXECUTE FUNCTION public.record_battery_history();

CREATE TABLE public.project_storage_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  datasheet_id uuid NOT NULL REFERENCES public.battery_datasheets(id) ON DELETE RESTRICT,
  owner_id uuid NOT NULL,
  module_count integer NOT NULL CHECK (module_count > 0),
  series_count integer CHECK (series_count > 0),
  parallel_count integer CHECK (parallel_count > 0),
  usable_energy_limit_kwh numeric CHECK (usable_energy_limit_kwh > 0),
  soc_min_pct numeric CHECK (soc_min_pct >= 0 AND soc_min_pct <= 100),
  soc_max_pct numeric CHECK (soc_max_pct >= 0 AND soc_max_pct <= 100),
  rte_pct numeric CHECK (rte_pct > 0 AND rte_pct <= 100),
  charge_eff_pct numeric CHECK (charge_eff_pct > 0 AND charge_eff_pct <= 100),
  discharge_eff_pct numeric CHECK (discharge_eff_pct > 0 AND discharge_eff_pct <= 100),
  reference_temp_c numeric,
  aging_assumption text,
  retained_cost numeric CHECK (retained_cost >= 0),
  currency text,
  justification text,
  status public.solar_status NOT NULL DEFAULT 'unverified',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT storage_soc_order CHECK (soc_min_pct IS NULL OR soc_max_pct IS NULL OR soc_min_pct < soc_max_pct),
  CONSTRAINT storage_series_parallel CHECK (series_count IS NULL OR parallel_count IS NULL OR series_count * parallel_count = module_count),
  CONSTRAINT storage_cost_currency CHECK (retained_cost IS NULL OR length(trim(coalesce(currency,''))) > 0)
);
CREATE INDEX project_storage_configs_project_idx ON public.project_storage_configs(project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_storage_configs TO authenticated;
GRANT ALL ON public.project_storage_configs TO service_role;
ALTER TABLE public.project_storage_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY storage_cfg_read ON public.project_storage_configs FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND app_private.can_access(owner_id));
CREATE POLICY storage_cfg_insert ON public.project_storage_configs FOR INSERT TO authenticated WITH CHECK (app_private.can_write_resource(owner_id) AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = project_storage_configs.owner_id));
CREATE POLICY storage_cfg_update ON public.project_storage_configs FOR UPDATE TO authenticated USING (app_private.can_write_resource(owner_id)) WITH CHECK (app_private.can_write_resource(owner_id) AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = project_storage_configs.owner_id));
CREATE POLICY storage_cfg_delete ON public.project_storage_configs FOR DELETE TO authenticated USING (app_private.can_write_resource(owner_id));
CREATE TRIGGER project_storage_configs_updated BEFORE UPDATE ON public.project_storage_configs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();