CREATE TYPE public.biomass_data_nature AS ENUM ('measured','technical_study','inventory','pdf','spreadsheet','api','estimate','assumption');
ALTER TABLE public.biomass_resources
  ADD COLUMN site_id uuid REFERENCES public.study_sites(id) ON DELETE SET NULL,
  ADD COLUMN biomass_type_detail text,
  ADD COLUMN quantity_unit text NOT NULL DEFAULT 't/an',
  ADD COLUMN availability_period text,
  ADD COLUMN availability_levels jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN seasonal_availability jsonb,
  ADD COLUMN constraints text,
  ADD COLUMN lhv_basis text,
  ADD COLUMN lhv_method text,
  ADD COLUMN energy_potential_source text,
  ADD COLUMN data_nature public.biomass_data_nature NOT NULL DEFAULT 'measured',
  ADD COLUMN biomass_status public.solar_status NOT NULL DEFAULT 'unverified',
  ADD COLUMN acquisition_method text,
  ADD COLUMN collected_on date;
ALTER TABLE public.biomass_resources
  ADD CONSTRAINT biomass_lhv_basis_values CHECK (lhv_basis IS NULL OR lhv_basis IN ('as_received','dry')),
  ADD CONSTRAINT biomass_lhv_basis_required CHECK (calorific_value_mj_kg IS NULL OR lhv_basis IS NOT NULL),
  ADD CONSTRAINT biomass_potential_sourced CHECK (energy_potential_mwh IS NULL OR length(trim(coalesce(energy_potential_source,''))) >= 2),
  ADD CONSTRAINT biomass_unit_values CHECK (quantity_unit IN ('t/an','t (matière sèche)/an','m³/an','t/mois'));
CREATE INDEX IF NOT EXISTS biomass_resources_site_idx ON public.biomass_resources(site_id);

CREATE OR REPLACE FUNCTION public.estimate_project_energy(_project_id uuid, _resource_id uuid, _settings_id uuid, _power_kw numeric, _assumptions text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
  IF NOT FOUND OR w.wind_status<>'validated' THEN RAISE EXCEPTION 'Le jeu éolien doit être validé.'; END IF;
  IF w.capacity_factor_pct IS NULL OR w.capacity_factor_pct<=0 OR w.capacity_factor_pct>100 THEN RAISE EXCEPTION 'Facteur de charge brut documenté requis ; la vitesse moyenne seule ne suffit pas.'; END IF;
  IF _power_kw IS NULL OR _power_kw<=0 OR _power_kw>1000000000 THEN RAISE EXCEPTION 'Puissance positive requise.'; END IF;
  start_date:=w.period_start; end_date:=w.period_end;
  energy:=_power_kw*((end_date-start_date+1)*24)*w.capacity_factor_pct/100*t.efficiency;
  formula:='E = P (kW) × heures de la période × FC brut / 100 × rendement net'; version:='wind-annual-estimate/1.0';
  inputs:=inputs||jsonb_build_object('power_kw',_power_kw,'capacity_factor_pct',w.capacity_factor_pct,'measurement_height_m',w.measurement_height_m,'average_speed_ms',w.average_speed_ms,'limitations','Facteur de charge déclaré brut avant pertes nettes ; aucune conversion de vitesse en énergie, courbe de puissance, extrapolation de hauteur ou simulation horaire. Durée de vie documentaire, pas de multiplication annuelle. Rendement de conversion non appliqué car inclus dans le facteur de charge.');
 ELSIF r.resource_type='biomass' THEN
  SELECT * INTO b FROM public.biomass_resources WHERE resource_id=r.id FOR SHARE;
  IF NOT FOUND OR b.biomass_status<>'validated' THEN RAISE EXCEPTION 'Le jeu biomasse doit être validé.'; END IF;
  IF b.quantity_unit<>'t/an' THEN RAISE EXCEPTION 'Quantité en tonnes de matière reçue par an requise.'; END IF;
  IF b.lhv_basis IS DISTINCT FROM 'as_received' THEN RAISE EXCEPTION 'PCI sur matière telle que reçue requis (aucune conversion depuis la matière sèche).'; END IF;
  IF b.annual_quantity_t IS NULL OR b.annual_quantity_t<=0 OR b.calorific_value_mj_kg IS NULL OR b.calorific_value_mj_kg<=0 OR b.exploitable_fraction_pct IS NULL OR b.exploitable_fraction_pct<=0 OR b.exploitable_fraction_pct>100 THEN RAISE EXCEPTION 'Quantité annuelle, PCI sur matière reçue et fraction exploitable documentés requis.'; END IF;
  start_date:=b.period_start; end_date:=b.period_end;
  energy:=b.annual_quantity_t*1000*b.calorific_value_mj_kg/3.6*b.exploitable_fraction_pct/100*t.efficiency*t.conversion_efficiency;
  formula:='E = quantité (t/an) × 1000 × PCI reçu (MJ/kg) / 3,6 × fraction exploitable / 100 × rendement net × rendement électrique'; version:='biomass-annual-estimate/1.0';
  inputs:=inputs||jsonb_build_object('annual_quantity_t',b.annual_quantity_t,'calorific_value_mj_kg',b.calorific_value_mj_kg,'lhv_basis',b.lhv_basis,'exploitable_fraction_pct',b.exploitable_fraction_pct,'moisture_pct',b.moisture_pct,'biomass_type',b.biomass_type,'limitations','PCI et tonnage sur la même base de matière reçue ; humidité non corrigée automatiquement. Aucune déduction du stock forestier ou des récoltes en combustible disponible. Sans logistique, saisonnalité, émissions ou durabilité. Durée de vie documentaire uniquement.');
 ELSE RAISE EXCEPTION 'Technologie incompatible.'; END IF;
 IF start_date IS NULL OR end_date IS NULL OR end_date<>(start_date+interval '1 year'-interval '1 day')::date THEN RAISE EXCEPTION 'Une année complète est obligatoire.'; END IF;
 inputs:=inputs||jsonb_build_object('period_start',start_date,'period_end',end_date,'hours',(end_date-start_date+1)*24,'unit','kWh/an');
 INSERT INTO public.project_energy_production(project_id,owner_id,requested_by,resource_id,technology,production_kwh,input_snapshot,method,engine_version) VALUES(p.id,p.owner_id,actor,r.id,r.resource_type,energy,inputs,formula,version) RETURNING id INTO result_id;
 RETURN result_id;
END; $function$;