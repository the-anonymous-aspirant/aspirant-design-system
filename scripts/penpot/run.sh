#!/usr/bin/env bash
# Run the Penpot component-builder harness inside the Penpot backend container.
#
# Usage:
#   scripts/penpot/run.sh          # build + persist components
#   DRY=1 scripts/penpot/run.sh    # build + validate only, no DB write
#
# Requires: the self-hosted Penpot stack running on this host (isa), and the DB
# password in ~/penpot/.env (PENPOT_DB_PASSWORD). Reads the target file id from
# $FILE_ID, defaulting to the `system_3-mockups` file baked into the harness.
set -euo pipefail

BACKEND="${PENPOT_BACKEND_CONTAINER:-penpot-penpot-backend-1}"
ENV_FILE="${PENPOT_ENV_FILE:-$HOME/penpot/.env}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PW="$(grep PENPOT_DB_PASSWORD "$ENV_FILE" | cut -d= -f2)"
if [[ -z "$PW" ]]; then
  echo "error: PENPOT_DB_PASSWORD not found in $ENV_FILE" >&2
  exit 1
fi

docker cp "$SCRIPT_DIR/build_components.clj" "$BACKEND:/tmp/build_components.clj"
docker exec \
  -e PENPOT_DATABASE_PASSWORD="$PW" \
  -e DRY="${DRY:-}" \
  -e FILE_ID="${FILE_ID:-}" \
  "$BACKEND" \
  bash -c 'cd /opt/penpot/backend && java -cp penpot.jar clojure.main /tmp/build_components.clj'
