DROP POLICY IF EXISTS equipment_update ON public.energy_demand_equipment;
CREATE POLICY equipment_update ON public.energy_demand_equipment
FOR UPDATE TO authenticated
USING (app_private.can_write_demand(owner_id))
WITH CHECK (
  app_private.can_write_demand(owner_id)
  AND EXISTS (
    SELECT 1 FROM public.energy_demands d
    WHERE d.id = energy_demand_equipment.demand_id
      AND d.owner_id = energy_demand_equipment.owner_id
  )
);