CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA app_private;
ALTER FUNCTION public.can_access(uuid) SET SCHEMA app_private;
ALTER FUNCTION public.initialize_user_profile(text) SET SCHEMA app_private;

REVOKE ALL ON FUNCTION app_private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_private.can_access(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_private.initialize_user_profile(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.can_access(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.initialize_user_profile(text) TO service_role;