FROM node:20-alpine AS base
RUN npm install -g pnpm@10

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ packages/
COPY apps/api/ apps/api/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @delivery/database db:generate
RUN pnpm --filter @delivery/api build

FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm@10
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
EXPOSE 3333
CMD ["node", "apps/api/dist/index.js"]
