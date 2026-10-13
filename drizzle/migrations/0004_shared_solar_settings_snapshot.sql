CREATE OR REPLACE FUNCTION public.estimate_project_solar_configured(_project_id uuid,_resource_id uuid,_settings_id uuid,_power_kwp numeric,_assumptions text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t public.technical_settings; result_id uuid;
BEGIN
 SELECT * INTO t FROM public.technical_settings WHERE id=_settings_id AND technology='solar';
 IF NOT FOUND THEN RAISE EXCEPTION 'Paramètres solaires requis.'; END IF;
 IF t.id<>(SELECT id FROM public.technical_settings WHERE technology='solar' ORDER BY created_at DESC,id DESC LIMIT 1) THEN RAISE EXCEPTION 'Les paramètres ont changé. Rechargez la fiche.'; END IF;
 result_id:=public.estimate_project_solar(_project_id,_resource_id,_power_kwp,t.efficiency*t.conversion_efficiency,_assumptions);
 UPDATE public.project_solar_production SET settings_snapshot=to_jsonb(t),input_snapshot=input_snapshot||jsonb_build_object('technical_settings',to_jsonb(t)) WHERE id=result_id;
 RETURN result_id;
END; $$;
REVOKE ALL ON FUNCTION public.estimate_project_solar_configured(uuid,uuid,uuid,numeric,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.estimate_project_solar_configured(uuid,uuid,uuid,numeric,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.record_energy_production_history() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN INSERT INTO public.project_change_history(project_id,owner_id,actor_id,action,summary,changes) VALUES(NEW.project_id,NEW.owner_id,NEW.requested_by,'Estimation '||NEW.technology,'Estimation annuelle indicative enregistrée avec sources et paramètres partagés.',jsonb_build_object('production_id',NEW.id,'production_kwh',NEW.production_kwh,'unit','kWh/an','engine_version',NEW.engine_version)); RETURN NEW; END; $$;
DROP TRIGGER energy_production_history ON public.project_energy_production;
CREATE TRIGGER energy_production_history AFTER INSERT ON public.project_energy_production FOR EACH ROW EXECUTE FUNCTION public.record_energy_production_history();