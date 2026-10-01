
-- COUNTRIES
ALTER TABLE public.countries
  ADD COLUMN IF NOT EXISTS iso2 text,
  ADD COLUMN IF NOT EXISTS iso3 text,
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.countries
  DROP CONSTRAINT IF EXISTS countries_lat_check,
  DROP CONSTRAINT IF EXISTS countries_lon_check;
ALTER TABLE public.countries
  ADD CONSTRAINT countries_lat_check CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  ADD CONSTRAINT countries_lon_check CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

ALTER TABLE public.regions ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS description text;

-- LOCALITY TYPE
DO $$ BEGIN
  CREATE TYPE public.locality_type AS ENUM ('urbain','periurbain','rural','village','zone_industrielle','autre');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.localities
  ADD COLUMN IF NOT EXISTS locality_type public.locality_type,
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.localities
  DROP CONSTRAINT IF EXISTS localities_lat_check,
  DROP CONSTRAINT IF EXISTS localities_lon_check,
  DROP CONSTRAINT IF EXISTS localities_population_check,
  DROP CONSTRAINT IF EXISTS localities_demand_check;
ALTER TABLE public.localities
  ADD CONSTRAINT localities_lat_check CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  ADD CONSTRAINT localities_lon_check CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
  ADD CONSTRAINT localities_population_check CHECK (population IS NULL OR population >= 0),
  ADD CONSTRAINT localities_demand_check CHECK (annual_demand_kwh IS NULL OR annual_demand_kwh >= 0);

-- STUDY SITES
DO $$ BEGIN
  CREATE TYPE public.study_site_type AS ENUM ('centrale','micro_reseau','site_isole','site_agricole','site_industriel','autre');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.study_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  locality_id uuid REFERENCES public.localities(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text,
  site_type public.study_site_type NOT NULL DEFAULT 'autre',
  latitude numeric,
  longitude numeric,
  altitude_m numeric,
  area_m2 numeric,
  grid_access boolean,
  grid_distance_km numeric,
  planned_power_kw numeric,
  data_source text,
  data_period text,
  data_quality text,
  notes text,
  status public.record_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT study_sites_lat_check CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  CONSTRAINT study_sites_lon_check CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
  CONSTRAINT study_sites_power_check CHECK (planned_power_kw IS NULL OR planned_power_kw >= 0)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_sites TO authenticated;
GRANT ALL ON public.study_sites TO service_role;

ALTER TABLE public.study_sites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS study_sites_access ON public.study_sites;
CREATE POLICY study_sites_access ON public.study_sites
  FOR ALL TO authenticated
  USING (app_private.can_access(owner_id))
  WITH CHECK (app_private.can_access(owner_id));

DROP TRIGGER IF EXISTS study_sites_updated_at ON public.study_sites;
CREATE TRIGGER study_sites_updated_at BEFORE UPDATE ON public.study_sites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS study_sites_owner_idx ON public.study_sites(owner_id);
CREATE INDEX IF NOT EXISTS study_sites_locality_idx ON public.study_sites(locality_id);

-- GRANTS for territorial tables (app access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.countries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.regions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.localities TO authenticated;
GRANT ALL ON public.countries TO service_role;
GRANT ALL ON public.regions TO service_role;
GRANT ALL ON public.departments TO service_role;
GRANT ALL ON public.localities TO service_role;
