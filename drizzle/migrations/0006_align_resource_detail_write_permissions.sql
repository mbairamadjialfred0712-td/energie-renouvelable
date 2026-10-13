DROP POLICY wind_resources_access ON public.wind_resources;
DROP POLICY biomass_resources_access ON public.biomass_resources;
CREATE POLICY wind_engineer_insert ON public.wind_resources FOR INSERT TO authenticated WITH CHECK(app_private.can_write_resource(owner_id));
CREATE POLICY wind_engineer_update ON public.wind_resources FOR UPDATE TO authenticated USING(app_private.can_write_resource(owner_id)) WITH CHECK(app_private.can_write_resource(owner_id));
CREATE POLICY wind_engineer_delete ON public.wind_resources FOR DELETE TO authenticated USING(app_private.can_write_resource(owner_id));
CREATE POLICY biomass_engineer_insert ON public.biomass_resources FOR INSERT TO authenticated WITH CHECK(app_private.can_write_resource(owner_id));
CREATE POLICY biomass_engineer_update ON public.biomass_resources FOR UPDATE TO authenticated USING(app_private.can_write_resource(owner_id)) WITH CHECK(app_private.can_write_resource(owner_id));
CREATE POLICY biomass_engineer_delete ON public.biomass_resources FOR DELETE TO authenticated USING(app_private.can_write_resource(owner_id));