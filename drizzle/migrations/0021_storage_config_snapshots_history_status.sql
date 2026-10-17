ALTER TABLE public.project_storage_configs ADD COLUMN snapshot jsonb;
ALTER TABLE public.project_storage_configs ADD COLUMN snapshot_at timestamptz;
COMMENT ON COLUMN public.project_storage_configs.snapshot IS 'Instantané figé des caractéristiques de la fiche batterie utilisées par cette configuration, constitué à l''enregistrement ou lors d''une actualisation explicite et tracée. NULL = configuration historique sans instantané : ne jamais fabriquer de valeurs.';
COMMENT ON COLUMN public.project_storage_configs.snapshot_at IS 'Date et heure de constitution de l''instantané.';

ALTER TABLE public.battery_datasheet_history ADD COLUMN changes jsonb;
COMMENT ON COLUMN public.battery_datasheet_history.changes IS 'Valeurs avant/après par champ modifié ({champ: {"old":..., "new":...}}). NULL pour les entrées antérieures à l''enrichissement : limite connue de l''historique ancien, ne pas reconstituer.';

CREATE OR REPLACE FUNCTION public.record_battery_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE f text[] := '{}'; ch jsonb := '{}'::jsonb; k text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.battery_datasheet_history(datasheet_id, actor_id, action) VALUES (NEW.id, auth.uid(), 'created');
  ELSE
    FOR k IN SELECT key FROM jsonb_each(to_jsonb(NEW)) LOOP
      IF k <> 'updated_at' AND (to_jsonb(NEW)->k) IS DISTINCT FROM (to_jsonb(OLD)->k) THEN
        f := f || k;
        ch := ch || jsonb_build_object(k, jsonb_build_object('old', to_jsonb(OLD)->k, 'new', to_jsonb(NEW)->k));
      END IF;
    END LOOP;
    IF array_length(f,1) > 0 THEN
      INSERT INTO public.battery_datasheet_history(datasheet_id, actor_id, action, fields, changes) VALUES (NEW.id, auth.uid(), CASE WHEN 'status' = ANY(f) THEN 'status' ELSE 'updated' END, f, ch);
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.record_battery_history() FROM PUBLIC, anon, authenticated;

CREATE TABLE public.project_storage_config_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid NOT NULL REFERENCES public.project_storage_configs(id) ON DELETE CASCADE,
  actor_id uuid,
  action text NOT NULL,
  changes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX storage_config_history_config_idx ON public.project_storage_config_history(config_id);
GRANT SELECT ON public.project_storage_config_history TO authenticated;
GRANT ALL ON public.project_storage_config_history TO service_role;
ALTER TABLE public.project_storage_config_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY storage_config_history_read ON public.project_storage_config_history FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.project_storage_configs c WHERE c.id = config_id AND app_private.can_access(c.owner_id)));

CREATE OR REPLACE FUNCTION public.record_storage_config_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ch jsonb := '{}'::jsonb; k text; act text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.project_storage_config_history(config_id, actor_id, action) VALUES (NEW.id, auth.uid(), 'created');
    RETURN NEW;
  END IF;
  FOR k IN SELECT key FROM jsonb_each(to_jsonb(NEW)) LOOP
    IF k IN ('updated_at') THEN CONTINUE; END IF;
    IF (to_jsonb(NEW)->k) IS DISTINCT FROM (to_jsonb(OLD)->k) THEN
      IF k = 'snapshot' THEN
        ch := ch || jsonb_build_object('snapshot', jsonb_build_object('old', to_jsonb(OLD)->'snapshot_at', 'new', to_jsonb(NEW)->'snapshot_at'));
      ELSE
        ch := ch || jsonb_build_object(k, jsonb_build_object('old', to_jsonb(OLD)->k, 'new', to_jsonb(NEW)->k));
      END IF;
    END IF;
  END LOOP;
  IF ch <> '{}'::jsonb THEN
    act := CASE WHEN ch ? 'snapshot' THEN 'snapshot_refresh' WHEN ch ? 'status' THEN 'status' ELSE 'updated' END;
    INSERT INTO public.project_storage_config_history(config_id, actor_id, action, changes) VALUES (NEW.id, auth.uid(), act, ch);
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.record_storage_config_history() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER project_storage_configs_history AFTER INSERT OR UPDATE ON public.project_storage_configs FOR EACH ROW EXECUTE FUNCTION public.record_storage_config_history();

CREATE OR REPLACE FUNCTION public.guard_storage_config_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('validated','rejected') THEN
      RAISE EXCEPTION 'Une nouvelle configuration démarre au statut « Non vérifié » : la validation passe par l''action dédiée.';
    END IF;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT app_private.can_validate_demand() THEN
      RAISE EXCEPTION 'Seuls les administrateurs et ingénieurs peuvent changer le statut d''une configuration de stockage.';
    END IF;
    IF OLD.status IN ('validated','rejected') AND NEW.status = 'unverified' THEN
      RAISE EXCEPTION 'Une configuration validée ou rejetée ne peut pas redevenir « Non vérifié » : utilisez « À examiner » ou « Archivé ».';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.guard_storage_config_status() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER project_storage_configs_status_guard BEFORE INSERT OR UPDATE ON public.project_storage_configs FOR EACH ROW EXECUTE FUNCTION public.guard_storage_config_status();