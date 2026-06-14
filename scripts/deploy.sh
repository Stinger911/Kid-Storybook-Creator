#!/usr/bin/env bash
set -euo pipefail

PROJECT="lab18-net"
SERVICE="${CLOUD_RUN_SERVICE:-storycraft}"
REGION="${CLOUD_RUN_REGION:-us-central1}"
IMAGE="gcr.io/${PROJECT}/${SERVICE}"

echo "==> Building Docker image: ${IMAGE}"
docker build --platform linux/amd64 -t "${IMAGE}" .

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
