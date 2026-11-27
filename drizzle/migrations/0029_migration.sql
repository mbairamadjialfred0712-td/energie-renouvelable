CREATE TABLE public.provider_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  provider text NOT NULL,
  adapter_version text NOT NULL,
  cache_key text NOT NULL,
  data_type text NOT NULL,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_url text,
  status text NOT NULL,
  error text,
  payload jsonb,
  retrieved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.provider_requests TO authenticated;
GRANT ALL ON public.provider_requests TO service_role;
ALTER TABLE public.provider_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY provider_requests_read ON public.provider_requests FOR SELECT TO authenticated USING (owner_id = (select auth.uid()));
CREATE POLICY provider_requests_insert ON public.provider_requests FOR INSERT TO authenticated WITH CHECK (owner_id = (select auth.uid()) AND status IN ('ok','error'));
CREATE INDEX provider_requests_owner_key_idx ON public.provider_requests (owner_id, cache_key, retrieved_at DESC);
CREATE INDEX provider_requests_owner_time_idx ON public.provider_requests (owner_id, provider, retrieved_at DESC);