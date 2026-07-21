#!/usr/bin/env bash
set -Eeuo pipefail
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; cd "$project_dir"
[ -f .env ] || { echo 'Missing .env; copy .env.example and supply real secrets.' >&2; exit 1; }; set -a; . ./.env; set +a
[ "${#JWT_SECRET}" -ge 32 ] || { echo 'JWT_SECRET must contain at least 32 characters.' >&2; exit 1; }
for d in backend/node_modules frontend/node_modules; do [ -d "$d" ] || { echo "Missing $d; prepare dependencies per OPERATIONS.md." >&2; exit 1; }; done
for port in "${BACKEND_PORT:-4000}" "${FRONTEND_PORT:-3000}"; do if lsof -ti ":$port" >/dev/null 2>&1; then echo "Port $port is occupied; refusing to terminate another process." >&2; exit 1; fi; done
pids=(); cleanup(){ for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done; }; trap cleanup EXIT INT TERM
(cd backend && npm run dev) & pids+=("$!"); (cd frontend && npm run dev) & pids+=("$!"); wait
