CREATE TABLE public.technical_settings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), technology text NOT NULL CHECK (technology IN ('solar','wind','biomass')), efficiency numeric NOT NULL CHECK (efficiency > 0 AND efficiency <= 1), conversion_efficiency numeric NOT NULL CHECK (conversion_efficiency > 0 AND conversion_efficiency <= 1), lifetime_years integer NOT NULL CHECK (lifetime_years BETWEEN 1 AND 100), justification text NOT NULL CHECK (length(trim(justification)) >= 10), created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.technical_settings TO authenticated;
GRANT ALL ON public.technical_settings TO service_role;
ALTER TABLE public.technical_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY technical_settings_read ON public.technical_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY technical_settings_admin_insert ON public.technical_settings FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='admin'));
ALTER TABLE public.project_solar_production ADD COLUMN settings_snapshot jsonb;
CREATE TABLE public.project_energy_production (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL REFERENCES public.projects(id), owner_id uuid NOT NULL, requested_by uuid NOT NULL, resource_id uuid NOT NULL REFERENCES public.energy_resources(id), technology text NOT NULL CHECK (technology IN ('wind','biomass')), production_kwh numeric NOT NULL, input_snapshot jsonb NOT NULL, method text NOT NULL, engine_version text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.project_energy_production TO authenticated;
GRANT ALL ON public.project_energy_production TO service_role;
ALTER TABLE public.project_energy_production ENABLE ROW LEVEL SECURITY;
CREATE POLICY energy_production_project_read ON public.project_energy_production FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id=project_id));
CREATE TRIGGER energy_production_history AFTER INSERT ON public.project_energy_production FOR EACH ROW EXECUTE FUNCTION public.record_solar_production_history();
CREATE POLICY wind_shared_read ON public.wind_resources FOR SELECT TO authenticated USING (true);
CREATE POLICY biomass_shared_read ON public.biomass_resources FOR SELECT TO authenticated USING (true);
CREATE TABLE public.role_change_history (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid NOT NULL, target_id uuid NOT NULL, engineer_enabled boolean NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.role_change_history TO authenticated;
GRANT ALL ON public.role_change_history TO service_role;
ALTER TABLE public.role_change_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY role_history_admin_read ON public.role_change_history FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='admin'));
CREATE OR REPLACE FUNCTION public.set_tester_engineer(_target_id uuid, _enabled boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='admin') THEN RAISE EXCEPTION 'Administration requise.'; END IF;
 IF _target_id=auth.uid() OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_target_id AND role='admin') THEN RAISE EXCEPTION 'Un compte administrateur ne peut pas être modifié ici.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=_target_id) THEN RAISE EXCEPTION 'Compte introuvable.'; END IF;
 IF _enabled THEN INSERT INTO public.user_roles(user_id,role) VALUES(_target_id,'engineer') ON CONFLICT(user_id,role) DO NOTHING;
 ELSE DELETE FROM public.user_roles WHERE user_id=_target_id AND role='engineer'; END IF;
 INSERT INTO public.role_change_history(actor_id,target_id,engineer_enabled) VALUES(auth.uid(),_target_id,_enabled);
END; $$;
REVOKE ALL ON FUNCTION public.set_tester_engineer(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_tester_engineer(uuid,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.estimate_project_energy(_project_id uuid,_resource_id uuid,_settings_id uuid,_power_kw numeric,_assumptions text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.projects; r public.energy_resources; t public.technical_settings; w public.wind_resources; b public.biomass_resources; result_id uuid; actor uuid:=auth.uid(); admin_access boolean; energy numeric; start_date date; end_date date; inputs jsonb; formula text; version text;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Connexion requise.'; END IF;
 SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=actor AND role='admin') INTO admin_access;
 IF NOT admin_access AND NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=actor AND role='engineer') THEN RAISE EXCEPTION 'Rôle Ingénieur requis.'; END IF;
 SELECT * INTO p FROM public.projects WHERE id=_project_id AND (owner_id=actor OR admin_access);
 IF NOT FOUND THEN RAISE EXCEPTION 'Projet inaccessible.'; END IF;
 SELECT * INTO r FROM public.energy_resources WHERE id=_resource_id AND (owner_id=actor OR admin_access OR EXISTS(SELECT 1 FROM public.wind_resources WHERE resource_id=_resource_id) OR EXISTS(SELECT 1 FROM public.biomass_resources WHERE resource_id=_resource_id)) FOR SHARE;
 IF NOT FOUND OR r.validation_status<>'validated' THEN RAISE EXCEPTION 'Un jeu validé est obligatoire.'; END IF;
 IF p.locality_id IS NOT NULL AND p.locality_id<>r.locality_id THEN RAISE EXCEPTION 'Localité incompatible.'; END IF;
 SELECT * INTO t FROM public.technical_settings WHERE id=_settings_id AND technology=r.resource_type;
 IF NOT FOUND THEN RAISE EXCEPTION 'Paramètres techniques compatibles requis.'; END IF;
 IF t.id<>(SELECT id FROM public.technical_settings WHERE technology=r.resource_type ORDER BY created_at DESC,id DESC LIMIT 1) THEN RAISE EXCEPTION 'Les paramètres ont changé. Rechargez la fiche.'; END IF;
 IF length(trim(coalesce(_assumptions,'')))<10 OR length(_assumptions)>4000 THEN RAISE EXCEPTION 'Justification explicite requise.'; END IF;
 inputs:=jsonb_build_object('resource_id',r.id,'locality_id',r.locality_id,'source',r.source,'reference',r.reference,'quality',r.quality,'resource_notes',r.notes,'validation_status',r.validation_status,'technical_settings',to_jsonb(t),'assumptions',_assumptions);
 IF r.resource_type='wind' THEN
  SELECT * INTO w FROM public.wind_resources WHERE resource_id=r.id FOR SHARE;
  IF NOT FOUND OR w.capacity_factor_pct IS NULL OR w.capacity_factor_pct<=0 OR w.capacity_factor_pct>100 THEN RAISE EXCEPTION 'Facteur de charge brut documenté requis ; la vitesse moyenne seule ne suffit pas.'; END IF;
  IF _power_kw IS NULL OR _power_kw<=0 OR _power_kw>1000000000 THEN RAISE EXCEPTION 'Puissance positive requise.'; END IF;
  start_date:=w.period_start; end_date:=w.period_end;
  energy:=_power_kw*((end_date-start_date+1)*24)*w.capacity_factor_pct/100*t.efficiency;
  formula:='E = P (kW) × heures de la période × FC brut / 100 × rendement net'; version:='wind-annual-estimate/1.0';
  inputs:=inputs||jsonb_build_object('power_kw',_power_kw,'capacity_factor_pct',w.capacity_factor_pct,'measurement_height_m',w.measurement_height_m,'average_speed_ms',w.average_speed_ms,'limitations','Facteur de charge déclaré brut avant pertes nettes ; aucune conversion de vitesse en énergie, courbe de puissance, extrapolation de hauteur ou simulation horaire. Durée de vie documentaire, pas de multiplication annuelle. Rendement de conversion non appliqué car inclus dans le facteur de charge.');
 ELSIF r.resource_type='biomass' THEN
  SELECT * INTO b FROM public.biomass_resources WHERE resource_id=r.id FOR SHARE;
  IF NOT FOUND OR b.annual_quantity_t IS NULL OR b.annual_quantity_t<=0 OR b.calorific_value_mj_kg IS NULL OR b.calorific_value_mj_kg<=0 OR b.exploitable_fraction_pct IS NULL OR b.exploitable_fraction_pct<=0 OR b.exploitable_fraction_pct>100 THEN RAISE EXCEPTION 'Quantité annuelle, PCI sur matière reçue et fraction exploitable documentés requis.'; END IF;
  start_date:=b.period_start; end_date:=b.period_end;
  energy:=b.annual_quantity_t*1000*b.calorific_value_mj_kg/3.6*b.exploitable_fraction_pct/100*t.efficiency*t.conversion_efficiency;
  formula:='E = quantité (t/an) × 1000 × PCI reçu (MJ/kg) / 3,6 × fraction exploitable / 100 × rendement net × rendement électrique'; version:='biomass-annual-estimate/1.0';
  inputs:=inputs||jsonb_build_object('annual_quantity_t',b.annual_quantity_t,'calorific_value_mj_kg',b.calorific_value_mj_kg,'exploitable_fraction_pct',b.exploitable_fraction_pct,'moisture_pct',b.moisture_pct,'biomass_type',b.biomass_type,'limitations','PCI et tonnage sur la même base de matière reçue ; humidité non corrigée automatiquement. Aucune déduction du stock forestier ou des récoltes en combustible disponible. Sans logistique, saisonnalité, émissions ou durabilité. Durée de vie documentaire uniquement.');
 ELSE RAISE EXCEPTION 'Technologie incompatible.'; END IF;
 IF start_date IS NULL OR end_date IS NULL OR end_date<>(start_date+interval '1 year'-interval '1 day')::date THEN RAISE EXCEPTION 'Une année complète est obligatoire.'; END IF;
 inputs:=inputs||jsonb_build_object('period_start',start_date,'period_end',end_date,'hours',(end_date-start_date+1)*24,'unit','kWh/an');
 INSERT INTO public.project_energy_production(project_id,owner_id,requested_by,resource_id,technology,production_kwh,input_snapshot,method,engine_version) VALUES(p.id,p.owner_id,actor,r.id,r.resource_type,energy,inputs,formula,version) RETURNING id INTO result_id;
 RETURN result_id;
END; $$;
REVOKE ALL ON FUNCTION public.estimate_project_energy(uuid,uuid,uuid,numeric,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.estimate_project_energy(uuid,uuid,uuid,numeric,text) TO authenticated;