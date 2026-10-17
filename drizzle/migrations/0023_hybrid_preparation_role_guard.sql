CREATE OR REPLACE FUNCTION public.guard_hybrid_preparation_write() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE subject uuid := auth.uid(); old_hybrid boolean := false; new_hybrid boolean := false;
BEGIN
 IF TG_OP <> 'INSERT' THEN old_hybrid := COALESCE(OLD.objectives->>'kind','') = 'hybrid_preparation'; END IF;
 IF TG_OP <> 'DELETE' THEN new_hybrid := COALESCE(NEW.objectives->>'kind','') = 'hybrid_preparation'; END IF;
 IF NOT old_hybrid AND NOT new_hybrid THEN IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF subject IS NULL OR NOT (app_private.has_role(subject,'admin') OR app_private.has_role(subject,'engineer')) THEN RAISE EXCEPTION 'Hybrid preparation requires an authenticated engineer or administrator'; END IF;
 IF TG_OP <> 'INSERT' AND OLD.owner_id <> subject AND NOT app_private.has_role(subject,'admin') THEN RAISE EXCEPTION 'Hybrid preparation owner required'; END IF;
 IF TG_OP = 'INSERT' AND NEW.owner_id <> subject THEN RAISE EXCEPTION 'Hybrid preparation must be created by its owner'; END IF;
 IF TG_OP = 'UPDATE' AND OLD.owner_id IS DISTINCT FROM NEW.owner_id THEN RAISE EXCEPTION 'Hybrid preparation owner is immutable'; END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $$;
REVOKE ALL ON FUNCTION public.guard_hybrid_preparation_write() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_hybrid_preparation_write BEFORE INSERT OR UPDATE OR DELETE ON public.scenarios FOR EACH ROW EXECUTE FUNCTION public.guard_hybrid_preparation_write();
COMMENT ON FUNCTION public.guard_hybrid_preparation_write() IS 'Restricts only versioned hybrid preparation scenario envelopes; preserves legacy scenarios and never treats JSON configuration as calculated evidence.';