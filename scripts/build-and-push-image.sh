#!/usr/bin/env bash
# Build and push the Histoire image to GHCR (system_3 #2218).
#
# Local-build lane by design — this repo uses no GitHub Actions. Same
# shape as aspirant-browser's script: REGISTRY=ghcr.io, push :latest
# plus the current commit SHA.
#
# Run from the repo root before pushing to main. The pre-push hook in
# scripts/git-hooks/pre-push wires this in automatically (skip with
# `git push --no-verify` for emergencies).

set -euo pipefail

REGISTRY="ghcr.io"
IMAGE_NAME="the-anonymous-aspirant/aspirant-histoire"
DOCKERFILE="Dockerfile.histoire"

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

if ! command -v gh >/dev/null 2>&1; then
  echo "build-and-push-image.sh: 'gh' CLI not found on PATH. Install GitHub CLI and authenticate." >&2
  exit 1
fi

token="$(gh auth token 2>/dev/null || true)"
if [ -z "$token" ]; then
  echo "build-and-push-image.sh: no GitHub token from 'gh auth token'. Run 'gh auth login' first." >&2
  exit 1
fi

gh_user="$(gh api user --jq .login 2>/dev/null || true)"
if [ -z "$gh_user" ]; then
  echo "build-and-push-image.sh: could not resolve GitHub login via 'gh api user'." >&2
  exit 1
fi

# Pushes to ghcr.io need the write:packages scope. Detect missing scope
# up front so the operator doesn't sit through a multi-minute docker
# build before the push fails with a confusing 'expected scopes' error.
scopes="$(gh auth status 2>&1 | sed -n 's/.*Token scopes: //p' | head -n 1)"
if ! printf '%s' "$scopes" | grep -q "write:packages"; then
  echo "build-and-push-image.sh: 'gh' token is missing the write:packages scope." >&2
  echo "  Current scopes: ${scopes:-<empty>}" >&2
  echo "  Run once: gh auth refresh -s write:packages,read:packages" >&2
  exit 1
fi

sha="$(git rev-parse --short HEAD)"

echo "build-and-push-image.sh: logging into $REGISTRY as $gh_user"
echo "$token" | docker login "$REGISTRY" -u "$gh_user" --password-stdin

echo "build-and-push-image.sh: building $REGISTRY/$IMAGE_NAME:latest (sha $sha) from $DOCKERFILE"
docker build \
  -f "$DOCKERFILE" \
  -t "$REGISTRY/$IMAGE_NAME:latest" \
  -t "$REGISTRY/$IMAGE_NAME:sha-$sha" \
  .

echo "build-and-push-image.sh: pushing $REGISTRY/$IMAGE_NAME:latest"
docker push "$REGISTRY/$IMAGE_NAME:latest"

echo "build-and-push-image.sh: pushing $REGISTRY/$IMAGE_NAME:sha-$sha"
docker push "$REGISTRY/$IMAGE_NAME:sha-$sha"

echo "build-and-push-image.sh: done"
