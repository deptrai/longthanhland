# bdsai.vn — apps/api Dockerfile (Story 1.3, AC6)
# Multi-stage build NestJS 11 → dist → runtime image nhỏ.
# Build context = bdsai/ (chứa yarn.lock + workspace + packages/shared).
#   docker build -f apps/api/Dockerfile -t bdsai-api:test bdsai/
#
# AD-8: KHÔNG bake secret vào layer. Env (DATABASE_URL, SUPABASE_*) truyền runtime
# qua `docker run -e ...`. Dockerfile chỉ set NODE_ENV (không nhạy cảm).

# ---- Builder: install deps + build shared + api ----
FROM node:22-alpine AS builder

WORKDIR /app

# Enable yarn 4.9.2 qua corepack.
RUN corepack enable

# Copy nguyên workspace (đã lọc qua .dockerignore).
COPY . .

# Frozen lockfile — fail nếu lockfile lệch.
RUN yarn install --immutable

# Turborepo build CHỈ @bdsai/api (+ dependency @bdsai/shared) — không build web
# (M3: trước đây `yarn build` build cả 3 package, lãng phí thời gian + layer).
# Cú pháp `--filter=@bdsai/api...` bao gồm api + upstream deps (shared).
RUN yarn turbo build --filter=@bdsai/api...

# ---- Runner: runtime image nhỏ, prod deps only ----
FROM node:22-alpine AS runner

WORKDIR /app

RUN corepack enable

# Copy workspace manifests + lockfile để `yarn workspaces focus` cài prod deps.
COPY package.json yarn.lock .yarnrc.yml ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/

# Cài chỉ production dependencies cho @bdsai/api (+ workspace dep @bdsai/shared).
RUN yarn workspaces focus @bdsai/api --production

# Copy build artifacts từ builder (dist đã build sẵn).
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/apps/api/dist apps/api/dist

# Runtime env (không nhạy cảm — secret truyền lúc docker run).
ENV NODE_ENV=production
# API_PORT default 3101 (override qua env). Supabase env truyền runtime.
ENV API_PORT=3101

WORKDIR /app/apps/api

EXPOSE 3101

# Healthcheck gọi GET /health/supabase (endpoint có từ Story 1.2).
# 200 = db/auth/storage up; 503 = degraded → container unhealthy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3101/health/supabase || exit 1

CMD ["node", "dist/main.js"]
