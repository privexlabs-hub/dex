# Setup guide

How to run DeX on your machine, where every key comes from, and how to prepare production.

- [1. Local setup](#1-local-setup)
- [2. How environment files work](#2-how-environment-files-work)
- [3. Getting production keys](#3-getting-production-keys)
- [4. Deploying to production](#4-deploying-to-production)
- [5. Testing](#5-testing)
- [6. Troubleshooting](#6-troubleshooting)

## 1. Local setup

You need no accounts or external keys to run DeX locally. Docker runs every service.

### Step 1: Install the tools

- **Node.js** 22.12 or newer. `.nvmrc` and the Docker images use 26.
- **pnpm 12**: `npm install -g pnpm@12.16.1`. Don't rely on `corepack enable`: Node 25 and newer no longer include Corepack.
- **Docker Desktop**, or Docker Engine with Compose. Make sure it's running.

### Step 2: Install dependencies

```bash
pnpm install
```

### Step 3: Create your `.env.local`

```bash
cp .env.example .env.local
node -e "const fs=require('fs'),c=require('crypto');let s=fs.readFileSync('.env.local','utf8');for(const k of ['BETTER_AUTH_SECRET','STAFF_AUTH_SECRET'])s=s.replace(new RegExp('^'+k+'=.*','m'),k+'='+c.randomBytes(48).toString('base64'));fs.writeFileSync('.env.local',s)"
```

The second command replaces the two auth secrets with random values. All the other values in the example already work locally.

### Step 4: Start the services

```bash
pnpm infra:up
```

This waits until every container is healthy, then creates the storage bucket. The last line should be:

```
[storage] bucket dex-media ready
```

| Service     | Purpose                    | From your machine                                       |
| ----------- | -------------------------- | ------------------------------------------------------- |
| Postgres 18 | Database                   | `localhost:55432`                                       |
| Redis 8     | Job queue                  | `localhost:56379`                                       |
| RustFS      | S3-compatible file storage | API `localhost:59000`, console `http://localhost:59001` |
| Mailpit     | Catches all outgoing email | Inbox `http://localhost:58025`, SMTP `localhost:51025`  |

The ports are deliberately non-standard. If another project on your machine uses 5432 or 6379, DeX neither collides with it nor connects to its database by mistake.

### Step 5: Create the database tables and first staff user

```bash
pnpm db:migrate
pnpm db:seed:dev
```

Expected output:

```
[db] migrations applied
[seed] staff super admin ready: admin@dex.localhost
```

Both commands are safe to run again.

### Step 6: Start the apps

```bash
pnpm dev
```

The first run builds the shared packages, then starts all three apps.

| App              | URL                     | Check                            |
| ---------------- | ----------------------- | -------------------------------- |
| Customer app     | `http://localhost:3000` | `curl localhost:3000/api/health` |
| Staff backoffice | `http://localhost:3100` | `curl localhost:3100/api/health` |
| Worker           | port 4000 (no UI)       | `curl localhost:4000/ready`      |

Each check should return `"ok":true`.

### Step 7: Try it

**Customer app:** open `http://localhost:3000/sign-up` and create an account. The verification email appears in Mailpit at `http://localhost:58025`. Click its link, then create an organization.

**Staff backoffice:** open `http://localhost:3100` and sign in with:

- Email: `admin@dex.localhost`
- Password: `change-me-before-anything-else!`

To use your own, set `SEED_STAFF_EMAIL` and `SEED_STAFF_PASSWORD` before running the seed.

### Day-to-day notes

- **After editing `packages/*`:** run `pnpm turbo run build --filter=./packages/*`. `pnpm dev` builds packages when it starts but doesn't watch them.
- **After editing `.env.local`:** restart `pnpm dev`.
- **Stop the services:** `pnpm infra:down`. Your data is kept.
- **Delete all local data:** run `pnpm infra:down`, then `rm -rf docker/data` and `docker volume rm dex_rustfs-data`. Repeat steps 4 and 5 afterwards.

## 2. How environment files work

All three files are at the repo root. [`.env.example`](../.env.example) explains every variable.

| File              | In git | Loaded by the apps? | Purpose                                               |
| ----------------- | ------ | ------------------- | ----------------------------------------------------- |
| `.env.example`    | Yes    | No                  | Reference with safe local defaults                    |
| `.env.local`      | No     | Yes, automatically  | Your local values                                     |
| `.env.production` | No     | **Never**           | Fill-in sheet to import into Fly or a secrets manager |

- Real environment variables always win over `.env.local`, so CI and production are unaffected by it.
- A missing `.env.local` is fine outside local development. CI and Docker set real variables instead.
- `KEY=` with no value counts as not set.
- Invalid or missing required values stop the process at startup, with a message naming the key but never its value.
- ADR-016 keeps production secrets out of files. If you fill in `.env.production`, delete that copy after importing it.

If `.env.production` is missing on your machine, copy the shape from `.env.example` and use the "Prod" values described there.

`NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_ADMIN_URL` are built into browser code when the image is built. They must be passed as Docker build args (see [section 4](#4-deploying-to-production)). Setting them only at runtime doesn't update the browser code.

## 3. Getting production keys

Do this once per environment, using separate accounts or projects for staging and production. Provider screens change, so if a label differs, follow the provider's current documentation.

### Auth secrets

`BETTER_AUTH_SECRET` and `STAFF_AUTH_SECRET`. Run this twice and use a different value for each:

```bash
openssl rand -base64 48
```

Changing a secret later signs out everyone in that realm.

### Neon (Postgres)

`DATABASE_URL` and `DATABASE_ADMIN_URL`. ADR-003 chooses Neon in `aws-eu-central-1`.

1. Create a project at [console.neon.tech](https://console.neon.tech) in the Frankfurt region, with Postgres 18. In production, disable scale-to-zero.
2. Generate a password with `openssl rand -base64 24 | tr -d '/+='`. Neon requires passwords with at least 60 bits of entropy.
3. Open the SQL Editor and run this, replacing the password and, if yours differs, the `neondb` and `neondb_owner` names. The role must exist **before** the first migration, because the migrations refer to it.

   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   CREATE EXTENSION IF NOT EXISTS pgcrypto;
   CREATE ROLE dex_app WITH LOGIN PASSWORD 'YOUR_PASSWORD' NOBYPASSRLS;
   GRANT CONNECT ON DATABASE neondb TO dex_app;
   GRANT USAGE ON SCHEMA public TO dex_app;
   ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
     GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dex_app;
   ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
     GRANT USAGE, SELECT ON SEQUENCES TO dex_app;
   ```

4. Click **Connect** and copy the two connection strings:
   - `DATABASE_URL`: role `dex_app`, **Connection pooling on**. The host contains `-pooler`.
   - `DATABASE_ADMIN_URL`: the owner role, **Connection pooling off**. Migrations need the direct connection.

Never give `DATABASE_ADMIN_URL` to a running app. The owner role bypasses Row-Level Security.

### Redis

`REDIS_URL`. ADR-006 requires a dedicated Redis but doesn't name a provider, so this choice is still open.

1. Create an instance close to your apps, with TLS and persistence if available. Copy its URL, which normally starts with `rediss://`.
2. Set `maxmemory-policy` to `noeviction`. BullMQ can't work correctly if Redis evicts keys.
3. Confirm the setting. Not every provider allows this command, in which case check its dashboard.

   ```bash
   redis-cli -u "$REDIS_URL" CONFIG GET maxmemory-policy
   ```

### Cloudflare R2 (file storage)

`S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`.

1. In the Cloudflare dashboard, open **R2 object storage** and create a bucket named `dex-prod`. Leave public access disabled.
2. On the **Overview** page, copy your Account ID. Then `S3_ENDPOINT` is `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`. EU-jurisdiction buckets use `https://<ACCOUNT_ID>.eu.r2.cloudflarestorage.com` instead.
3. Under **Account Details**, next to **API Tokens**, click **Manage** and create an Account API token. Choose **Object Read & Write** and limit it to your bucket.
4. Copy the **Access Key ID** and **Secret Access Key**. The secret is only shown once.
5. Set `S3_REGION=auto` and `S3_FORCE_PATH_STYLE=false`.

### SMTP (email)

`SMTP_URL`, `EMAIL_FROM`. Only SMTP is implemented, and any relay works. ADR-018 has not chosen one. Resend is shown here as an example:

1. Create an account at [resend.com](https://resend.com) and verify your sending domain, including its DNS records.
2. Create an API key.
3. Set the values below. If a password contains special characters, URL-encode it.

   ```
   SMTP_URL=smtps://resend:YOUR_RESEND_API_KEY@smtp.resend.com:465
   EMAIL_FROM=noreply@your-domain.com
   ```

### Grafana Cloud (optional)

`OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_HEADERS`. Leave them empty to turn telemetry off.

1. In the [Grafana Cloud portal](https://grafana.com/auth/sign-in), open your stack.
2. On the **OpenTelemetry** tile, click **Configure** and generate a token.
3. Copy the endpoint, such as `https://otlp-gateway-<REGION>.grafana.net/otlp`, and the headers value, such as `Authorization=Basic <token>`.

### Sentry

`SENTRY_DSN` is validated, but nothing sends errors to Sentry yet. Setting it has no effect today.

### Staff access settings

- `STAFF_IP_ALLOWLIST`: your office or VPN ranges, comma-separated, such as `203.0.113.0/24`.
- `STAFF_REQUIRE_MFA`: keep this `true` in production.

## 4. Deploying to production

ADR-002 targets Docker images on Fly.io in `fra`. This repo has no `fly.toml` or registry pipeline yet, so treat these as the required steps rather than a finished pipeline. See also [OPERATIONS.md](OPERATIONS.md).

> **Open gap: first staff user.** `pnpm db:seed:dev` refuses to run in production, and nothing else creates the staff roles, permissions or first super admin. Production staff sign-in won't work until that exists. Decide how to create them before launch.

1. **Migrate the database.** From a checkout, using the direct owner URL:

   ```bash
   DATABASE_ADMIN_URL='postgres://...' pnpm db:migrate
   ```

2. **Build the images** from the repo root:

   ```bash
   docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_APP_URL=https://app.your-domain.com -t dex-web .
   docker build -f apps/admin/Dockerfile --build-arg NEXT_PUBLIC_ADMIN_URL=https://admin.your-domain.com -t dex-admin .
   docker build -f apps/worker/Dockerfile -t dex-worker .
   ```

3. **Set secrets.** Give each process only what it needs:

   | Process | Needs                                                                        | Must not get                                       |
   | ------- | ---------------------------------------------------------------------------- | -------------------------------------------------- |
   | web     | core, `DATABASE_URL`, `S3_*`, `BETTER_AUTH_*`, `NEXT_PUBLIC_APP_URL`, email  | `DATABASE_ADMIN_URL`, `STAFF_AUTH_SECRET`          |
   | admin   | core, `DATABASE_URL`, `REDIS_URL`, `STAFF_*`, `NEXT_PUBLIC_ADMIN_URL`, email | `DATABASE_ADMIN_URL`, `BETTER_AUTH_SECRET`, `S3_*` |
   | worker  | core, `DATABASE_URL`, `REDIS_URL`, `S3_*`, `WORKER_*`                        | `DATABASE_ADMIN_URL`, both auth secrets            |

   "Core" means `APP_ENV`, `LOG_LEVEL` and `OTEL_*`. Set `APP_ENV=production` everywhere.

   On Fly, secrets are read from standard input as `NAME=VALUE` lines. Put each process's lines in its own temporary file, then:

   ```bash
   fly secrets import --app YOUR_APP < web.secrets
   rm web.secrets
   ```

4. **Deploy** web, admin and worker, and restrict the admin hostname with Cloudflare Access.

5. **Check** that `https://app.your-domain.com/api/health` and `https://admin.your-domain.com/api/health` return `"ok":true`, and that the worker's `/ready` reports Postgres, Redis and storage as healthy.

## 5. Testing

```bash
pnpm check                # lint, typecheck, unit tests, build
pnpm deps:check           # package boundary rules
pnpm test:integration     # real Postgres, Redis and storage. Needs step 4 and 5 above
pnpm test:e2e             # full browser journeys. Needs the apps running
```

For `pnpm test:e2e`, either run `pnpm exec playwright install chromium` once, or use your installed Chrome:

```bash
E2E_CHROME_CHANNEL=chrome pnpm test:e2e
```

Two things can make these fail even when nothing is wrong:

- **`pnpm test:e2e` right after `pnpm dev` starts.** The first auth request can take longer than the tests' 10-second wait while routes compile. Run it again, or test against a production build.
- **`pnpm test:integration` while `pnpm dev` is running.** The dev worker takes the queue test's job, so the test reports `expected { pong: true, ... } to deeply equal { echoed: 'hello' }`. Stop `pnpm dev` first.

See [TESTING.md](TESTING.md) for what each suite proves.

## 6. Troubleshooting

| What you see                                                                                 | Cause                                                                      | Fix                                                                                                                                      |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `Can't resolve '@dex/observability/otel'`, or `Cannot find module .../@dex/db/dist/index.js` | Shared packages aren't built                                               | Start with `pnpm dev`, or run `pnpm turbo run build --filter=./packages/*`. Running an app directly doesn't build them.                  |
| `Invalid environment configuration`                                                          | A required value is missing or malformed. The message names the key        | Check `.env.local` exists at the repo root and compare it with `.env.example`                                                            |
| `DATABASE_ADMIN_URL is required`                                                             | No `.env.local`                                                            | Do step 3                                                                                                                                |
| `password authentication failed`, or tables missing                                          | `.env.local` points at a different Postgres, often another project on 5432 | Use port 55432                                                                                                                           |
| `port is already allocated`                                                                  | Another program uses a DeX port                                            | Find it with `lsof -nP -iTCP:<port> -sTCP:LISTEN`, or change the left-hand port in `docker/docker-compose.yml` and `.env.local` to match |
| `pull access denied for minio/...`                                                           | An old checkout. The MinIO images no longer exist on Docker Hub            | Pull the latest code, which uses RustFS                                                                                                  |
| Postgres exits with `unused mount/volume`                                                    | An old compose file. Postgres 18 images store data elsewhere               | Pull the latest code. The mount is `/var/lib/postgresql`                                                                                 |
| Storage errors, or `/ready` shows storage failing                                            | Bucket is missing, or keys don't match the compose file                    | Run `pnpm --filter @dex/storage bucket:init`                                                                                             |
| Verification email doesn't arrive                                                            | Locally, all mail goes to Mailpit                                          | Open `http://localhost:58025`                                                                                                            |
| Browser code calls the wrong URL                                                             | `NEXT_PUBLIC_*` is fixed at build time                                     | Rebuild, passing the right `--build-arg`                                                                                                 |
| Variable changes have no effect                                                              | Env files load at startup                                                  | Restart `pnpm dev`                                                                                                                       |
| Integration tests report `skipped`                                                           | Their variables aren't available                                           | Create `.env.local`                                                                                                                      |
