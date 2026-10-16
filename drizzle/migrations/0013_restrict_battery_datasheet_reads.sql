DROP POLICY IF EXISTS battery_read ON public.battery_datasheets;
CREATE POLICY battery_read ON public.battery_datasheets FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL AND app_private.can_access(owner_id));
DROP POLICY IF EXISTS battery_history_read ON public.battery_datasheet_history;
CREATE POLICY battery_history_read ON public.battery_datasheet_history FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.battery_datasheets d WHERE d.id = datasheet_id AND app_private.can_access(d.owner_id)));