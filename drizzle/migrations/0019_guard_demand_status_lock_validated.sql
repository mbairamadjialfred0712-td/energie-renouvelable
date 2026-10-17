CREATE OR REPLACE FUNCTION public.guard_demand_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := coalesce(NEW.created_by, auth.uid());
    IF NEW.demand_status IN ('validated','rejected') AND NOT app_private.can_validate_demand() THEN
      RAISE EXCEPTION 'Seuls les administrateurs et ingénieurs peuvent valider ou rejeter une demande.';
    END IF;
  ELSIF NEW.demand_status IS DISTINCT FROM OLD.demand_status THEN
    IF NEW.demand_status IN ('validated','rejected') AND NOT app_private.can_validate_demand() THEN
      RAISE EXCEPTION 'Seuls les administrateurs et ingénieurs peuvent valider ou rejeter une demande.';
    END IF;
    IF OLD.demand_status IN ('validated','rejected') AND NOT app_private.can_validate_demand() THEN
      RAISE EXCEPTION 'Seuls les administrateurs et ingénieurs peuvent modifier le statut d’une demande validée ou rejetée.';
    END IF;
  END IF;
  IF NEW.consumer_category = 'autre' AND coalesce(trim(NEW.consumer_detail),'') = '' THEN
    RAISE EXCEPTION 'Précisez le type de consommateur pour la catégorie Autre.';
  END IF;
  RETURN NEW;
END
$function$;