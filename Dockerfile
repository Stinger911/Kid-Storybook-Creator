FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-slim AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/firebase-applet-config.json ./
COPY --from=builder /app/firebase-blueprint.json ./

EXPOSE 3000
CMD ["node", "dist/server.cjs"]
