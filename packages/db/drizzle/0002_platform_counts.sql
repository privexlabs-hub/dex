-- Aggregate counts for the staff backoffice. SECURITY DEFINER runs as the
-- owner so the numbers cover every tenant, while the application role still
-- cannot read tenant rows directly (RLS stays in force for row access).
CREATE OR REPLACE FUNCTION platform_counts()
RETURNS TABLE (
  users bigint,
  new_users_7d bigint,
  organizations bigint,
  workspaces bigint,
  projects bigint,
  staff_users bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, staff
STABLE
AS $$
  SELECT
    (SELECT count(*) FROM public."user"),
    (SELECT count(*) FROM public."user" WHERE created_at > now() - interval '7 days'),
    (SELECT count(*) FROM public.organization),
    (SELECT count(*) FROM public.workspace),
    (SELECT count(*) FROM public.project),
    (SELECT count(*) FROM staff."user");
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION platform_counts() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION platform_counts() TO dex_app;
