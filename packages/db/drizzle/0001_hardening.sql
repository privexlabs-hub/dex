-- Hardening applied after the base schema (hand-written; see docs/DATABASE.md).
-- Requires the application role `dex_app` to exist (created out of band:
-- docker/postgres/init locally, Neon console/API in shared environments).

-- 1. Application role privileges. The app role is NOT the owner, so RLS applies.
GRANT USAGE ON SCHEMA public, staff TO dex_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO dex_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA staff TO dex_app;--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public, staff TO dex_app;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA staff GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dex_app;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA staff GRANT USAGE, SELECT ON SEQUENCES TO dex_app;--> statement-breakpoint

-- 2. Audit log is append-only for every role, including the owner.
REVOKE UPDATE, DELETE, TRUNCATE ON audit_event FROM PUBLIC;--> statement-breakpoint
REVOKE UPDATE, DELETE, TRUNCATE ON audit_event FROM dex_app;--> statement-breakpoint
CREATE OR REPLACE FUNCTION audit_event_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_event is append-only (% blocked)', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;--> statement-breakpoint
CREATE TRIGGER audit_event_no_update
  BEFORE UPDATE OR DELETE OR TRUNCATE ON audit_event
  FOR EACH STATEMENT EXECUTE FUNCTION audit_event_immutable();--> statement-breakpoint

-- 3. Keep updated_at honest even for raw SQL writers.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER workspace_set_updated_at BEFORE UPDATE ON workspace FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER project_set_updated_at BEFORE UPDATE ON project FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER feature_flag_set_updated_at BEFORE UPDATE ON feature_flag FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER feature_flag_rule_set_updated_at BEFORE UPDATE ON feature_flag_rule FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER staff_role_set_updated_at BEFORE UPDATE ON staff.role FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER content_access_grant_set_updated_at BEFORE UPDATE ON staff.content_access_grant FOR EACH ROW EXECUTE FUNCTION set_updated_at();
