# syntax=docker/dockerfile:1.7
FROM node:26-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends libatomic1 ca-certificates && rm -rf /var/lib/apt/lists/* && npm install -g pnpm@12.16.1
WORKDIR /repo

FROM base AS build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter @dex/admin...
# Inlined into the browser bundle at build time, so it must be a build arg.
ARG NEXT_PUBLIC_ADMIN_URL
RUN pnpm --filter @dex/admin... build

FROM base AS runtime
ENV NODE_ENV=production PORT=3100 HOSTNAME=0.0.0.0
USER node
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/admin/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=build --chown=node:node /repo/apps/admin/public ./apps/admin/public
EXPOSE 3100
CMD ["node", "apps/admin/server.js"]
