# syntax=docker/dockerfile:1
FROM node:22-alpine AS deps
WORKDIR /app
RUN npm install -g pnpm@10
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS builder
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

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
