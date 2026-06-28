#!/usr/bin/env bash
set -euo pipefail

# Load local env (live Stripe Buy Button values, etc.) so they can be passed
# into the Docker build, which excludes .env from its context.
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

echo "==> Bumping patch version"
npm version patch --no-git-tag-version

echo "==> Building (local validation)"
npm run build

PROJECT="lab18-net"
SERVICE="${CLOUD_RUN_SERVICE:-storycraft}"
REGION="${CLOUD_RUN_REGION:-us-central1}"
IMAGE="gcr.io/${PROJECT}/${SERVICE}"

echo "==> Building Docker image: ${IMAGE}"
docker build --platform linux/amd64 \
  --build-arg STRIPE_PUBLISHABLE_KEY="${STRIPE_PUBLISHABLE_KEY:-}" \
  --build-arg STRIPE_BUY_BUTTON_ID="${STRIPE_BUY_BUTTON_ID:-}" \
  -t "${IMAGE}" .

echo "==> Pushing to GCR"
docker push "${IMAGE}"

echo "==> Deploying to Cloud Run (project=${PROJECT}, region=${REGION})"
gcloud run deploy "${SERVICE}" \
  --image="${IMAGE}" \
  --project="${PROJECT}" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --port=3000 \
  --memory=512Mi \
  --min-instances=0 \
  --max-instances=5 \
  --set-env-vars="NODE_ENV=production"

echo "==> Deploy complete"
gcloud run services describe "${SERVICE}" \
  --project="${PROJECT}" \
  --region="${REGION}" \
  --format="value(status.url)"
