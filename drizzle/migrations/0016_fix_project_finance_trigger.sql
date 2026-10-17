CREATE OR REPLACE FUNCTION public.log_project_finance_assumptions() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.project_finance_assumption_history (assumption_id, project_id, owner_id, action, snapshot, changed_by)
  VALUES (NEW.id, NEW.project_id, NEW.owner_id, CASE WHEN TG_OP = 'INSERT' THEN 'created' ELSE 'updated' END, to_jsonb(NEW), auth.uid());
  NEW.updated_at := now();
  RETURN NEW;
END $$;