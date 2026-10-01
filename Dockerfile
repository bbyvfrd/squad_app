# syntax=docker/dockerfile:1
FROM node:24-alpine AS deps
WORKDIR /app
RUN npm install -g pnpm@10
# pnpm-workspace.yaml carries pnpm config (ignoredBuiltDependencies) — copy it so
# the container install matches local resolution.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:24-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@10
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time placeholders so the fail-fast `config` singleton can evaluate during
# `next build` (Next imports the health route's module graph — config + db client —
# when collecting routes). These are NOT runtime values: the real env is supplied at
# run time, and postgres() is lazy so the placeholder DB URL is never dialed at build.
ENV NODE_ENV=production \
    DATABASE_URL="postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder" \
    NEXT_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co" \
    NEXT_PUBLIC_SUPABASE_ANON_KEY="placeholder-anon-key"
RUN pnpm build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Pull in already-released Alpine package fixes: the Trivy gate blocks on
# fixed-upstream HIGH/CRITICAL CVEs (ignore-unfixed), and the node:24-alpine
# base lags Alpine's patch releases (e.g. openssl CVE-2026-45447).
RUN apk -U upgrade --no-cache
# The runtime only runs `node server.js`. Drop the package managers the base image
# bundles (npm/npx, corepack, yarn): unused here, and npm's own dependencies carry
# HIGH CVEs (brace-expansion, tar, undici, ip-address) that fail the image gate.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn-v* \
  && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
    /usr/local/bin/yarn /usr/local/bin/yarnpkg
# Run as an unprivileged user (Trivy DS002; standard for standalone images).
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
