INSERT INTO public.user_roles (user_id, role)
VALUES ('ae0ae005-7ebb-4f06-a0a9-1613af62bd1d', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'viewer'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id)
ON CONFLICT (user_id, role) DO NOTHING;