CREATE TYPE public.wind_data_nature AS ENUM ('measured','technical_study','imported','api','estimate','assumption');
ALTER TABLE public.wind_resources
  ADD COLUMN site_id uuid REFERENCES public.study_sites(id),
  ADD COLUMN data_nature public.wind_data_nature NOT NULL DEFAULT 'measured',
  ADD COLUMN wind_status public.solar_status NOT NULL DEFAULT 'unverified',
  ADD COLUMN acquisition_method text,
  ADD COLUMN collected_on date,
  ADD COLUMN capacity_factor_method text,
  ADD COLUMN timeseries jsonb,
  ADD COLUMN speed_distribution jsonb;
UPDATE public.wind_resources w SET wind_status = CASE e.validation_status WHEN 'validated' THEN 'validated'::public.solar_status WHEN 'rejected' THEN 'rejected'::public.solar_status ELSE 'unverified'::public.solar_status END,
  data_nature = CASE WHEN e.source ILIKE '%NASA%' OR e.reference ILIKE '%api%' THEN 'api'::public.wind_data_nature ELSE w.data_nature END
FROM public.energy_resources e WHERE e.id = w.resource_id;
ALTER TABLE public.wind_resources
  ADD CONSTRAINT wind_speed_nonneg CHECK (average_speed_ms IS NULL OR average_speed_ms >= 0) NOT VALID,
  ADD CONSTRAINT wind_max_nonneg CHECK (maximum_speed_ms IS NULL OR maximum_speed_ms >= 0) NOT VALID,
  ADD CONSTRAINT wind_height_nonneg CHECK (measurement_height_m IS NULL OR measurement_height_m >= 0) NOT VALID,
  ADD CONSTRAINT wind_direction_range CHECK (direction_deg IS NULL OR (direction_deg >= 0 AND direction_deg < 360)) NOT VALID,
  ADD CONSTRAINT wind_cf_range CHECK (capacity_factor_pct IS NULL OR (capacity_factor_pct >= 0 AND capacity_factor_pct <= 100)) NOT VALID,
  ADD CONSTRAINT wind_density_pos CHECK (air_density_kg_m3 IS NULL OR air_density_kg_m3 > 0) NOT VALID;
CREATE INDEX IF NOT EXISTS wind_resources_site_idx ON public.wind_resources(site_id);