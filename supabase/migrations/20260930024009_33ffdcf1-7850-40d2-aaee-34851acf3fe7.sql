GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_data_fields TO authenticated;
GRANT ALL ON public.project_data_fields TO service_role;

GRANT SELECT, INSERT ON public.project_change_history TO authenticated;
GRANT ALL ON public.project_change_history TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.project_pre_analyses TO authenticated;
GRANT ALL ON public.project_pre_analyses TO service_role;