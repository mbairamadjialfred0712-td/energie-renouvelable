-- User-approved audience: owner and administrators only.
ALTER POLICY energy_resources_read ON public.energy_resources USING ((SELECT auth.uid()) = owner_id OR app_private.has_role((SELECT auth.uid()), 'admin'::public.app_role));
ALTER POLICY solar_resources_read ON public.solar_resources USING ((SELECT auth.uid()) = owner_id OR app_private.has_role((SELECT auth.uid()), 'admin'::public.app_role));
ALTER POLICY wind_shared_read ON public.wind_resources USING ((SELECT auth.uid()) = owner_id OR app_private.has_role((SELECT auth.uid()), 'admin'::public.app_role));
ALTER POLICY biomass_shared_read ON public.biomass_resources USING ((SELECT auth.uid()) = owner_id OR app_private.has_role((SELECT auth.uid()), 'admin'::public.app_role));