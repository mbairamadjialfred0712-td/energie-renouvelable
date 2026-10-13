-- Shared catalogues remain available to every signed-in application user.
-- An authenticated database role without a verified subject must not read them.
ALTER POLICY biomass_reference_read ON public.biomass_reference_observations USING ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY technologies_read ON public.technologies USING ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY technical_settings_read ON public.technical_settings USING ((SELECT auth.uid()) IS NOT NULL);