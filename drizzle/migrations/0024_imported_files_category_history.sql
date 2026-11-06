ALTER TABLE public.imported_files ADD COLUMN category text NOT NULL DEFAULT 'autre';
ALTER TABLE public.imported_files ADD COLUMN locality_id uuid NULL REFERENCES public.localities(id);
ALTER TABLE public.imported_files ADD CONSTRAINT imported_files_category_check CHECK (category IN ('solaire','eolien','biomasse','dechets','demande','photovoltaïque','batterie','csp','hybride','financier','faisabilite','rapport_simulation','rapport_technique','autre'));

CREATE TABLE public.imported_file_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES public.imported_files(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  actor_id uuid,
  action text NOT NULL,
  changes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.imported_file_history TO authenticated;
GRANT ALL ON public.imported_file_history TO service_role;
ALTER TABLE public.imported_file_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY imported_file_history_select ON public.imported_file_history FOR SELECT TO authenticated USING (app_private.can_access(owner_id));

CREATE OR REPLACE FUNCTION public.record_imported_file_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE diff jsonb := '{}'::jsonb; k text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.imported_file_history(file_id, owner_id, actor_id, action, changes) VALUES (NEW.id, NEW.owner_id, auth.uid(), 'created', jsonb_build_object('file_name', NEW.file_name, 'category', NEW.category));
  ELSE
    FOR k IN SELECT key FROM jsonb_each(to_jsonb(NEW)) LOOP
      IF k NOT IN ('updated_at') AND (to_jsonb(NEW)->k) IS DISTINCT FROM (to_jsonb(OLD)->k) THEN
        diff := diff || jsonb_build_object(k, jsonb_build_object('before', to_jsonb(OLD)->k, 'after', to_jsonb(NEW)->k));
      END IF;
    END LOOP;
    IF diff <> '{}'::jsonb THEN
      INSERT INTO public.imported_file_history(file_id, owner_id, actor_id, action, changes) VALUES (NEW.id, NEW.owner_id, auth.uid(), CASE WHEN diff ? 'validation_status' THEN 'status' ELSE 'updated' END, diff);
    END IF;
  END IF;
  RETURN NEW;
END
$function$;

CREATE TRIGGER imported_files_history AFTER INSERT OR UPDATE ON public.imported_files FOR EACH ROW EXECUTE FUNCTION public.record_imported_file_history();