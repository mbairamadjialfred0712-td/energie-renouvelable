REVOKE INSERT ON public.project_solar_production FROM authenticated;
CREATE OR REPLACE FUNCTION public.estimate_project_solar(_project_id uuid, _resource_id uuid, _power_kwp numeric, _performance_ratio numeric, _assumptions text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.projects; r public.energy_resources; s public.solar_resources; result_id uuid; actor uuid := auth.uid(); admin_access boolean;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Connexion requise.'; END IF;
 SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = actor AND role = 'admin') INTO admin_access;
 IF NOT admin_access AND NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = actor AND role = 'engineer') THEN RAISE EXCEPTION 'Rôle ingénieur ou administrateur requis.'; END IF;
 SELECT * INTO p FROM public.projects WHERE id = _project_id AND (owner_id = actor OR admin_access);
 IF NOT FOUND THEN RAISE EXCEPTION 'Projet inaccessible.'; END IF;
 SELECT * INTO r FROM public.energy_resources WHERE id = _resource_id AND resource_type = 'solar' AND (owner_id = actor OR admin_access) FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Ressource inaccessible.'; END IF;
 SELECT * INTO s FROM public.solar_resources WHERE resource_id = r.id FOR SHARE;
 IF NOT FOUND OR s.solar_status <> 'validated' OR r.validation_status <> 'validated' THEN RAISE EXCEPTION 'Un jeu solaire validé est obligatoire.'; END IF;
 IF p.locality_id IS NOT NULL AND p.locality_id <> r.locality_id THEN RAISE EXCEPTION 'Le jeu ne correspond pas à la localité du projet.'; END IF;
 IF s.period_start IS NULL OR s.period_end IS NULL OR s.period_end <> (s.period_start + interval '1 year' - interval '1 day')::date THEN RAISE EXCEPTION 'Une période annuelle complète est obligatoire.'; END IF;
 IF s.annual_irradiation_kwh_m2 IS NULL OR s.annual_irradiation_kwh_m2 <= 0 THEN RAISE EXCEPTION 'Une irradiation annuelle positive en kWh/m²/an est obligatoire.'; END IF;
 IF _power_kwp IS NULL OR _power_kwp <= 0 OR _power_kwp > 1000000000 OR _performance_ratio IS NULL OR _performance_ratio <= 0 OR _performance_ratio > 1 OR length(trim(coalesce(_assumptions,''))) < 10 THEN RAISE EXCEPTION 'Puissance, ratio et justification explicites obligatoires.'; END IF;
 INSERT INTO public.project_solar_production(project_id,owner_id,requested_by,resource_id,production_kwh,input_snapshot,method,engine_version)
 VALUES(p.id,p.owner_id,actor,r.id,_power_kwp*s.annual_irradiation_kwh_m2*_performance_ratio,jsonb_build_object('resource_id',r.id,'locality_id',r.locality_id,'site_id',s.site_id,'source',r.source,'reference',r.reference,'quality',r.quality,'resource_notes',r.notes,'data_nature',s.data_nature,'solar_status',s.solar_status,'annual_irradiation',s.annual_irradiation_kwh_m2,'irradiation_unit','kWh/m²/an','period_start',s.period_start,'period_end',s.period_end,'power_kwp',_power_kwp,'performance_ratio',_performance_ratio,'parameter_nature','Hypothèses techniques déclarées','assumptions',_assumptions,'limitations','Estimation annuelle sans transposition sur plan incliné, ombrage, profil horaire, stockage ou dégradation. Ne remplace pas une étude de productible.'),'E = P_STC × H / G_STC × PR ; G_STC = 1 kW/m²','pv-annual-estimate/1.0') RETURNING id INTO result_id;
 RETURN result_id;
END; $$;
REVOKE ALL ON FUNCTION public.estimate_project_solar(uuid,uuid,numeric,numeric,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.estimate_project_solar(uuid,uuid,numeric,numeric,text) TO authenticated;