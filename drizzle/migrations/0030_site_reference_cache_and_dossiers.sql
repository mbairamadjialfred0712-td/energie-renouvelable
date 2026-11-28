REVOKE INSERT ON public.provider_requests FROM authenticated;
ALTER TABLE public.provider_requests ADD COLUMN completed_at timestamptz;
CREATE TABLE public.provider_rate_limits (provider text PRIMARY KEY, last_started_at timestamptz NOT NULL DEFAULT '-infinity', day date NOT NULL DEFAULT current_date, day_count integer NOT NULL DEFAULT 0);
GRANT ALL ON public.provider_rate_limits TO service_role;
ALTER TABLE public.provider_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.site_reference_dossiers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL, name text NOT NULL,
 geography jsonb NOT NULL, pvgis_request_id uuid REFERENCES public.provider_requests(id), nasa_request_id uuid REFERENCES public.provider_requests(id),
 site_id uuid REFERENCES public.study_sites(id), weather_dataset_id uuid REFERENCES public.site_weather_datasets(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_reference_dossiers TO authenticated;
GRANT ALL ON public.site_reference_dossiers TO service_role;
ALTER TABLE public.site_reference_dossiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_reference_dossiers_read ON public.site_reference_dossiers FOR SELECT TO authenticated USING (owner_id = (select auth.uid()));
CREATE INDEX site_reference_dossiers_owner_idx ON public.site_reference_dossiers(owner_id,created_at DESC);
CREATE INDEX site_reference_dossiers_pvgis_idx ON public.site_reference_dossiers(pvgis_request_id);
CREATE INDEX site_reference_dossiers_nasa_idx ON public.site_reference_dossiers(nasa_request_id);
CREATE INDEX site_reference_dossiers_site_idx ON public.site_reference_dossiers(site_id);
CREATE INDEX site_reference_dossiers_weather_idx ON public.site_reference_dossiers(weather_dataset_id);
CREATE FUNCTION public.claim_site_provider(_owner uuid,_provider text,_version text,_key text,_type text,_params jsonb,_url text,_ttl_seconds integer) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE r public.provider_requests; lim public.provider_rate_limits; delay_seconds numeric; now_at timestamptz:=clock_timestamp();
BEGIN
 IF _owner IS NULL OR _provider NOT IN ('pvgis','nasa','nominatim') OR _ttl_seconds < 60 OR _ttl_seconds > 2592000 THEN RAISE EXCEPTION 'Invalid provider request'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('site_provider:'||_provider,0));
 SELECT * INTO r FROM public.provider_requests WHERE owner_id=_owner AND cache_key=_key ORDER BY created_at DESC LIMIT 1;
 IF FOUND AND r.status='ok' AND r.completed_at > now_at - make_interval(secs=>_ttl_seconds) THEN RETURN jsonb_build_object('state','cache','id',r.id); END IF;
 IF FOUND AND r.status='running' AND r.created_at > now_at-interval '2 minutes' THEN RETURN jsonb_build_object('state','busy','id',r.id); END IF;
 IF FOUND AND r.status='error' AND r.completed_at > now_at-interval '5 minutes' THEN RETURN jsonb_build_object('state','failed','id',r.id); END IF;
 INSERT INTO public.provider_rate_limits(provider) VALUES(_provider) ON CONFLICT DO NOTHING;
 SELECT * INTO lim FROM public.provider_rate_limits WHERE provider=_provider FOR UPDATE;
 IF lim.day <> (now_at AT TIME ZONE 'UTC')::date THEN lim.day_count:=0; END IF;
 delay_seconds:=CASE WHEN _provider='nominatim' THEN 1.1 ELSE 2 END;
 IF lim.last_started_at > now_at-make_interval(secs=>delay_seconds::double precision) THEN RETURN jsonb_build_object('state','throttled'); END IF;
 IF lim.day_count >= 200 OR (SELECT count(*) FROM public.provider_requests WHERE owner_id=_owner AND provider=_provider AND created_at >= date_trunc('day',now_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') >= 20 THEN RETURN jsonb_build_object('state','quota'); END IF;
 UPDATE public.provider_rate_limits SET last_started_at=now_at,day=(now_at AT TIME ZONE 'UTC')::date,day_count=lim.day_count+1 WHERE provider=_provider;
 INSERT INTO public.provider_requests(owner_id,provider,adapter_version,cache_key,data_type,params,request_url,status) VALUES(_owner,_provider,_version,_key,_type,_params,_url,'running') RETURNING * INTO r;
 RETURN jsonb_build_object('state','claimed','id',r.id);
END $$;
REVOKE ALL ON FUNCTION public.claim_site_provider(uuid,text,text,text,text,jsonb,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_site_provider(uuid,text,text,text,text,jsonb,text,integer) TO service_role;