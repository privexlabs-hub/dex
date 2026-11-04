-- Development only. Creates the non-owner application role so Row-Level
-- Security is exercised locally exactly as in production (ADR-003, SECURITY.md).
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dex_app') THEN
    CREATE ROLE dex_app LOGIN PASSWORD 'dex_app_dev' NOBYPASSRLS;
  END IF;
END
$$;

GRANT CONNECT ON DATABASE dex TO dex_app;
GRANT USAGE ON SCHEMA public TO dex_app;
ALTER DEFAULT PRIVILEGES FOR ROLE dex_admin IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dex_app;
ALTER DEFAULT PRIVILEGES FOR ROLE dex_admin IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO dex_app;
