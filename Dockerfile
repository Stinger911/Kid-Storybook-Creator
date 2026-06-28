FROM node:20-slim AS builder
WORKDIR /app

# Public, client-side Stripe Buy Button values. .env is excluded from the build
# context (.dockerignore), so the frontend build reads them from these args/env
# instead — otherwise the bundle ships with an empty key and the button breaks.
ARG STRIPE_PUBLISHABLE_KEY=""
ARG STRIPE_BUY_BUTTON_ID=""
ENV STRIPE_PUBLISHABLE_KEY=$STRIPE_PUBLISHABLE_KEY
ENV STRIPE_BUY_BUTTON_ID=$STRIPE_BUY_BUTTON_ID

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
