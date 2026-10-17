CREATE OR REPLACE FUNCTION public.guard_battery_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('validated','rejected') THEN
      RAISE EXCEPTION 'Une nouvelle fiche batterie démarre au statut « Non vérifié » : la validation passe par l''action dédiée.';
    END IF;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT app_private.can_validate_demand() THEN
      RAISE EXCEPTION 'Seuls les administrateurs et ingénieurs peuvent changer le statut d''une fiche batterie.';
    END IF;
    IF OLD.status IN ('validated','rejected') AND NEW.status = 'unverified' THEN
      RAISE EXCEPTION 'Une fiche validée ou rejetée ne peut pas redevenir « Non vérifié » : utilisez « À examiner » ou « Archivé ».';
    END IF;
  END IF;
  RETURN NEW;
END
$function$;
CREATE TRIGGER battery_datasheets_status_guard BEFORE INSERT OR UPDATE ON public.battery_datasheets FOR EACH ROW EXECUTE FUNCTION public.guard_battery_status();
REVOKE EXECUTE ON FUNCTION public.guard_battery_status() FROM PUBLIC, anon, authenticated;