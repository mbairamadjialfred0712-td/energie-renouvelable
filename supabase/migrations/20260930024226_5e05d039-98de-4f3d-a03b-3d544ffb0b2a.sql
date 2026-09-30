CREATE OR REPLACE FUNCTION app_private.can_access(_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() = _owner_id OR app_private.has_role(auth.uid(), 'admin'::public.app_role)
$$;

REVOKE ALL ON FUNCTION app_private.can_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.can_access(uuid) TO authenticated, service_role;