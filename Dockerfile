FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/static/content-packs ./static/content-packs
COPY --from=builder /app/src/lib/server/db/migrations ./migrations
RUN npm ci --omit=dev

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

RUN mkdir -p /data && chown appuser:appgroup /data

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=/data/openpentacle.db
ENV AUTH_TRUST_HOST=true

EXPOSE 3000
VOLUME ["/data"]

USER appuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
