CREATE TABLE public.site_weather_datasets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL,
 site_id uuid NOT NULL REFERENCES public.study_sites(id),
 locality_id uuid NOT NULL REFERENCES public.localities(id),
 name text NOT NULL,
 source text NOT NULL,
 reference text NOT NULL DEFAULT '',
 data_nature text NOT NULL DEFAULT 'imported',
 radiation_unit text NOT NULL,
 wind_height_m numeric NOT NULL,
 time_standard text NOT NULL DEFAULT 'UTC',
 period_start timestamptz NOT NULL,
 period_end timestamptz NOT NULL,
 samples jsonb NOT NULL,
 provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
 status public.solar_status NOT NULL DEFAULT 'unverified',
 notes text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.site_weather_datasets TO authenticated;
GRANT ALL ON public.site_weather_datasets TO service_role;
ALTER TABLE public.site_weather_datasets ENABLE ROW LEVEL SECURITY;
CREATE POLICY weather_read ON public.site_weather_datasets FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND app_private.can_access(owner_id));
CREATE POLICY weather_insert ON public.site_weather_datasets FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid() AND app_private.can_write_resource(owner_id) AND EXISTS (SELECT 1 FROM public.study_sites s WHERE s.id = site_id AND s.locality_id = site_weather_datasets.locality_id));
CREATE POLICY weather_update ON public.site_weather_datasets FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL AND app_private.can_write_resource(owner_id)) WITH CHECK (auth.uid() IS NOT NULL AND app_private.can_write_resource(owner_id));
CREATE INDEX site_weather_site_idx ON public.site_weather_datasets(site_id, created_at DESC);
CREATE INDEX site_weather_locality_idx ON public.site_weather_datasets(locality_id);
CREATE FUNCTION public.guard_site_weather() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE sample jsonb; prev_time timestamptz; current_time_value timestamptz; metric text; value numeric; first_time timestamptz;
BEGIN
 IF TG_OP = 'UPDATE' THEN
  IF (to_jsonb(NEW) - 'status' - 'notes' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'notes' - 'updated_at') THEN RAISE EXCEPTION 'Les données météo enregistrées sont immuables : créer une nouvelle version.'; END IF;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.study_sites WHERE id = NEW.site_id AND locality_id = NEW.locality_id) THEN RAISE EXCEPTION 'Site et localité incompatibles'; END IF;
 IF length(trim(NEW.name)) < 2 OR length(trim(NEW.source)) < 2 OR NEW.radiation_unit NOT IN ('W/m²','Wh/m²') OR NEW.time_standard <> 'UTC' OR NEW.data_nature NOT IN ('measured','imported','api','estimate','assumption') OR NEW.wind_height_m <= 0 THEN RAISE EXCEPTION 'Métadonnées météo invalides'; END IF;
 IF jsonb_typeof(NEW.samples) <> 'array' OR jsonb_array_length(NEW.samples) < 1 OR jsonb_array_length(NEW.samples) > 8784 THEN RAISE EXCEPTION 'Nombre de relevés invalide'; END IF;
 FOR sample IN SELECT * FROM jsonb_array_elements(NEW.samples) LOOP
  IF NOT (sample ?& ARRAY['timestamp','ghi','dni','dhi','temp_air','wind_speed']) THEN RAISE EXCEPTION 'Colonnes météo manquantes'; END IF;
  IF jsonb_typeof(sample->'timestamp') <> 'string' OR (sample->>'timestamp') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$' THEN RAISE EXCEPTION 'Horodatage UTC horaire invalide'; END IF;
  current_time_value := (sample->>'timestamp')::timestamptz;
  IF prev_time IS NOT NULL AND current_time_value <= prev_time THEN RAISE EXCEPTION 'Heures dupliquées ou désordonnées'; END IF;
  IF first_time IS NULL THEN first_time := current_time_value; END IF;
  prev_time := current_time_value;
  FOREACH metric IN ARRAY ARRAY['ghi','dni','dhi','temp_air','wind_speed'] LOOP
   IF jsonb_typeof(sample->metric) NOT IN ('number','null') THEN RAISE EXCEPTION 'Valeur météo non numérique'; END IF;
   IF jsonb_typeof(sample->metric) = 'number' THEN
    value := (sample->>metric)::numeric;
    IF metric <> 'temp_air' AND value < 0 THEN RAISE EXCEPTION 'Valeur négative impossible'; END IF;
    IF metric = 'temp_air' AND value < -273.15 THEN RAISE EXCEPTION 'Température impossible'; END IF;
   END IF;
  END LOOP;
 END LOOP;
 IF first_time <> NEW.period_start OR prev_time <> NEW.period_end THEN RAISE EXCEPTION 'Période incohérente'; END IF;
 IF NEW.status = 'validated' AND (jsonb_path_exists(NEW.samples, '$[*] ? (@.ghi == null || @.dni == null || @.dhi == null || @.temp_air == null || @.wind_speed == null)') OR EXISTS (SELECT 1 FROM (SELECT (x->>'timestamp')::timestamptz t, lag((x->>'timestamp')::timestamptz) OVER (ORDER BY ord) p FROM jsonb_array_elements(NEW.samples) WITH ORDINALITY AS r(x,ord)) q WHERE p IS NOT NULL AND t-p <> interval '1 hour')) THEN RAISE EXCEPTION 'Série incomplète : validation refusée'; END IF;
 NEW.updated_at := now();
 RETURN NEW;
END;
$$;
CREATE TRIGGER site_weather_guard BEFORE INSERT OR UPDATE ON public.site_weather_datasets FOR EACH ROW EXECUTE FUNCTION public.guard_site_weather();