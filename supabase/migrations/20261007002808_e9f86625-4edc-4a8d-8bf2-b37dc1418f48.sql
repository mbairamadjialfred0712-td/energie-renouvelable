CREATE TYPE public.solar_data_nature AS ENUM ('measured','imported','api','estimate','assumption');
CREATE TYPE public.solar_status AS ENUM ('unverified','in_review','validated','rejected','archived');
ALTER TABLE public.solar_resources
  ADD COLUMN ghi_unit text NOT NULL DEFAULT 'kWh/m²/jour' CHECK (ghi_unit IN ('kWh/m²/jour','kWh/m²/an')),
  ADD COLUMN dni_unit text NOT NULL DEFAULT 'kWh/m²/jour' CHECK (dni_unit IN ('kWh/m²/jour','kWh/m²/an')),
  ADD COLUMN dhi_unit text NOT NULL DEFAULT 'kWh/m²/jour' CHECK (dhi_unit IN ('kWh/m²/jour','kWh/m²/an')),
  ADD COLUMN sunshine_unit text NOT NULL DEFAULT 'h/an' CHECK (sunshine_unit IN ('h/jour','h/an')),
  ADD COLUMN site_id uuid REFERENCES public.study_sites(id) ON DELETE SET NULL,
  ADD COLUMN data_nature public.solar_data_nature NOT NULL DEFAULT 'measured',
  ADD COLUMN acquisition_method text,
  ADD COLUMN collected_on date,
  ADD COLUMN period_start date,
  ADD COLUMN period_end date,
  ADD COLUMN solar_status public.solar_status NOT NULL DEFAULT 'unverified',
  ADD CONSTRAINT solar_period_order CHECK (period_start IS NULL OR period_end IS NULL OR period_end >= period_start),
  ADD CONSTRAINT solar_temp_order CHECK (min_temperature_c IS NULL OR max_temperature_c IS NULL OR min_temperature_c <= max_temperature_c);
CREATE INDEX IF NOT EXISTS solar_resources_site_idx ON public.solar_resources(site_id);

CREATE OR REPLACE FUNCTION app_private.can_write_resource(_owner_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_private.has_role(auth.uid(),'admin') OR (auth.uid() = _owner_id AND app_private.has_role(auth.uid(),'engineer'))
$$;
REVOKE ALL ON FUNCTION app_private.can_write_resource(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.can_write_resource(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS energy_resources_access ON public.energy_resources;
CREATE POLICY energy_resources_read ON public.energy_resources FOR SELECT TO authenticated USING (true);
CREATE POLICY energy_resources_insert ON public.energy_resources FOR INSERT TO authenticated WITH CHECK (app_private.can_write_resource(owner_id));
CREATE POLICY energy_resources_update ON public.energy_resources FOR UPDATE TO authenticated USING (app_private.can_write_resource(owner_id)) WITH CHECK (app_private.can_write_resource(owner_id));
CREATE POLICY energy_resources_delete ON public.energy_resources FOR DELETE TO authenticated USING (app_private.can_write_resource(owner_id));

DROP POLICY IF EXISTS solar_resources_access ON public.solar_resources;
CREATE POLICY solar_resources_read ON public.solar_resources FOR SELECT TO authenticated USING (true);
CREATE POLICY solar_resources_insert ON public.solar_resources FOR INSERT TO authenticated WITH CHECK (app_private.can_write_resource(owner_id));
CREATE POLICY solar_resources_update ON public.solar_resources FOR UPDATE TO authenticated USING (app_private.can_write_resource(owner_id)) WITH CHECK (app_private.can_write_resource(owner_id));
CREATE POLICY solar_resources_delete ON public.solar_resources FOR DELETE TO authenticated USING (app_private.can_write_resource(owner_id));