ALTER TABLE public.energy_demands
  ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.study_sites(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS consumer_category text NOT NULL DEFAULT 'autre',
  ADD COLUMN IF NOT EXISTS consumer_detail text,
  ADD COLUMN IF NOT EXISTS consumer_name text,
  ADD COLUMN IF NOT EXISTS users_count integer CHECK (users_count IS NULL OR users_count >= 0),
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_end date,
  ADD COLUMN IF NOT EXISTS measurements jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS measured_peak_kw numeric CHECK (measured_peak_kw IS NULL OR measured_peak_kw >= 0),
  ADD COLUMN IF NOT EXISTS daily_profile jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS weekday_variation text,
  ADD COLUMN IF NOT EXISTS seasonal_variation text,
  ADD COLUMN IF NOT EXISTS has_history boolean,
  ADD COLUMN IF NOT EXISTS criticality text,
  ADD COLUMN IF NOT EXISTS supply jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS acquisition_method text,
  ADD COLUMN IF NOT EXISTS data_time_basis text,
  ADD COLUMN IF NOT EXISTS collected_by text,
  ADD COLUMN IF NOT EXISTS comments text,
  ADD COLUMN IF NOT EXISTS demand_status public.solar_status NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.energy_demands ADD CONSTRAINT energy_demands_period_order CHECK (period_start IS NULL OR period_end IS NULL OR period_end >= period_start);
ALTER TABLE public.energy_demands ADD CONSTRAINT energy_demands_growth_check CHECK (growth_rate_pct IS NULL OR (growth_rate_pct > -100 AND growth_rate_pct <= 1000));
CREATE INDEX IF NOT EXISTS energy_demands_locality_idx ON public.energy_demands(locality_id);
CREATE INDEX IF NOT EXISTS energy_demands_site_idx ON public.energy_demands(site_id);
COMMENT ON COLUMN public.energy_demands.validation_status IS 'DEPRECATED: replaced by demand_status';

CREATE TABLE public.energy_demand_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id uuid NOT NULL REFERENCES public.energy_demands(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  category text,
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit_power numeric NOT NULL CHECK (unit_power >= 0),
  power_unit text NOT NULL CHECK (power_unit IN ('W','kW')),
  hours_per_day numeric NOT NULL CHECK (hours_per_day >= 0 AND hours_per_day <= 24),
  days_per_week numeric NOT NULL CHECK (days_per_week >= 0 AND days_per_week <= 7),
  usage_factor numeric CHECK (usage_factor IS NULL OR (usage_factor > 0 AND usage_factor <= 1)),
  usage_factor_definition text,
  usage_factor_source text,
  priority text NOT NULL DEFAULT 'importante' CHECK (priority IN ('critique','importante','flexible')),
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT equipment_factor_documented CHECK (usage_factor IS NULL OR (coalesce(trim(usage_factor_definition),'') <> '' AND coalesce(trim(usage_factor_source),'') <> ''))
);
CREATE INDEX energy_demand_equipment_demand_idx ON public.energy_demand_equipment(demand_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.energy_demand_equipment TO authenticated;
GRANT ALL ON public.energy_demand_equipment TO service_role;
ALTER TABLE public.energy_demand_equipment ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.energy_demand_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id uuid NOT NULL REFERENCES public.energy_demands(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  actor_id uuid,
  action text NOT NULL,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.energy_demand_history TO authenticated;
GRANT ALL ON public.energy_demand_history TO service_role;
ALTER TABLE public.energy_demand_history ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION app_private.can_write_demand(_owner_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (app_private.has_role(auth.uid(),'admin') OR (auth.uid() = _owner_id AND (app_private.has_role(auth.uid(),'engineer') OR app_private.has_role(auth.uid(),'analyst'))))
$$;
CREATE OR REPLACE FUNCTION app_private.can_validate_demand()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_private.has_role(auth.uid(),'admin') OR app_private.has_role(auth.uid(),'engineer')
$$;
GRANT EXECUTE ON FUNCTION app_private.can_write_demand(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.can_validate_demand() TO authenticated;

DROP POLICY IF EXISTS energy_demands_access ON public.energy_demands;
CREATE POLICY demand_read ON public.energy_demands FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND app_private.can_access(owner_id));
CREATE POLICY demand_insert ON public.energy_demands FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND app_private.can_write_demand(owner_id));
CREATE POLICY demand_update ON public.energy_demands FOR UPDATE TO authenticated USING (app_private.can_write_demand(owner_id)) WITH CHECK (app_private.can_write_demand(owner_id));
CREATE POLICY demand_delete ON public.energy_demands FOR DELETE TO authenticated USING (app_private.can_write_demand(owner_id));

CREATE POLICY equipment_read ON public.energy_demand_equipment FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND app_private.can_access(owner_id));
CREATE POLICY equipment_insert ON public.energy_demand_equipment FOR INSERT TO authenticated WITH CHECK (app_private.can_write_demand(owner_id) AND EXISTS (SELECT 1 FROM public.energy_demands d WHERE d.id = demand_id AND d.owner_id = energy_demand_equipment.owner_id));
CREATE POLICY equipment_update ON public.energy_demand_equipment FOR UPDATE TO authenticated USING (app_private.can_write_demand(owner_id)) WITH CHECK (app_private.can_write_demand(owner_id));
CREATE POLICY equipment_delete ON public.energy_demand_equipment FOR DELETE TO authenticated USING (app_private.can_write_demand(owner_id));
CREATE POLICY demand_history_read ON public.energy_demand_history FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND app_private.can_access(owner_id));

CREATE OR REPLACE FUNCTION public.guard_demand_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := coalesce(NEW.created_by, auth.uid());
    IF NEW.demand_status IN ('validated','rejected') AND NOT app_private.can_validate_demand() THEN
      RAISE EXCEPTION 'Seuls les administrateurs et ingénieurs peuvent valider ou rejeter une demande.';
    END IF;
  ELSIF NEW.demand_status IS DISTINCT FROM OLD.demand_status AND NEW.demand_status IN ('validated','rejected') AND NOT app_private.can_validate_demand() THEN
    RAISE EXCEPTION 'Seuls les administrateurs et ingénieurs peuvent valider ou rejeter une demande.';
  END IF;
  IF NEW.consumer_category = 'autre' AND coalesce(trim(NEW.consumer_detail),'') = '' THEN
    RAISE EXCEPTION 'Précisez le type de consommateur pour la catégorie Autre.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER energy_demands_guard BEFORE INSERT OR UPDATE ON public.energy_demands FOR EACH ROW EXECUTE FUNCTION public.guard_demand_status();

CREATE OR REPLACE FUNCTION public.record_demand_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE diff jsonb := '{}'::jsonb; k text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.energy_demand_history(demand_id, owner_id, actor_id, action, changes) VALUES (NEW.id, NEW.owner_id, auth.uid(), 'created', jsonb_build_object('name', NEW.name));
  ELSE
    FOR k IN SELECT key FROM jsonb_each(to_jsonb(NEW)) LOOP
      IF k NOT IN ('updated_at') AND (to_jsonb(NEW)->k) IS DISTINCT FROM (to_jsonb(OLD)->k) THEN
        diff := diff || jsonb_build_object(k, jsonb_build_object('before', to_jsonb(OLD)->k, 'after', to_jsonb(NEW)->k));
      END IF;
    END LOOP;
    IF diff <> '{}'::jsonb THEN
      INSERT INTO public.energy_demand_history(demand_id, owner_id, actor_id, action, changes) VALUES (NEW.id, NEW.owner_id, auth.uid(), CASE WHEN diff ? 'demand_status' THEN 'status' ELSE 'updated' END, diff);
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER energy_demands_history AFTER INSERT OR UPDATE ON public.energy_demands FOR EACH ROW EXECUTE FUNCTION public.record_demand_history();
REVOKE EXECUTE ON FUNCTION public.record_demand_history() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_demand_status() FROM PUBLIC, anon, authenticated;