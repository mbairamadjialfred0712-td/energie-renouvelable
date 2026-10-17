DROP TRIGGER trg_project_finance_assumptions ON public.project_finance_assumptions;
CREATE OR REPLACE FUNCTION public.log_project_finance_assumptions() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.project_finance_assumption_history (assumption_id, project_id, owner_id, action, snapshot, changed_by)
  VALUES (NEW.id, NEW.project_id, NEW.owner_id, CASE WHEN TG_OP = 'INSERT' THEN 'created' ELSE 'updated' END, to_jsonb(NEW), auth.uid());
  RETURN NULL;
END $$;
CREATE OR REPLACE FUNCTION public.touch_project_finance_assumptions() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_project_finance_touch BEFORE UPDATE ON public.project_finance_assumptions FOR EACH ROW EXECUTE FUNCTION public.touch_project_finance_assumptions();
CREATE TRIGGER trg_project_finance_log AFTER INSERT OR UPDATE ON public.project_finance_assumptions FOR EACH ROW EXECUTE FUNCTION public.log_project_finance_assumptions();