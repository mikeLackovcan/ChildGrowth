#!/usr/bin/env bash
set -euo pipefail

app_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo_dir="$(cd "$app_dir/.." && pwd)"
cd "$app_dir"

if command -v maestro >/dev/null 2>&1; then
  maestro_bin="$(command -v maestro)"
elif [[ -x "$repo_dir/.tools/maestro/bin/maestro" ]]; then
  maestro_bin="$repo_dir/.tools/maestro/bin/maestro"
else
  echo "Maestro is missing. Install the free CLI from https://docs.maestro.dev/get-started/installing-maestro" >&2
  exit 1
fi

if [[ -d "$repo_dir/.tools/java/Contents/Home" ]]; then
  export JAVA_HOME="$repo_dir/.tools/java/Contents/Home"
  export PATH="$JAVA_HOME/bin:$PATH"
  export JAVA_TOOL_OPTIONS="-Duser.home=$repo_dir/.tools/home"
fi

export MAESTRO_CLI_NO_ANALYTICS=1
export MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true

npm run build:web
node scripts/serve-visual-export.cjs >.maestro/visual-server.log 2>&1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT

for _ in {1..30}; do
  if curl --silent --fail http://127.0.0.1:8082/ >/dev/null; then break; fi
  sleep 0.2
done
curl --silent --fail http://127.0.0.1:8082/ >/dev/null

run_size() {
  local name="$1"
  local dimensions="$2"
  mkdir -p ".maestro/artifacts/$name"
  "$maestro_bin" test \
    -p web \
    --headless \
    --screen-size "$dimensions" \
    -e "SCREEN=$name" \
    --format JUNIT \
    --output ".maestro/artifacts/$name/results.xml" \
    --test-output-dir ".maestro/artifacts/$name" \
    .maestro/visual-smoke.yaml \
    .maestro/parent-auth.yaml
}

run_size small 360x640
run_size phone 412x915
run_size tablet 768x1024

echo "Visual tests passed. Artifacts: $app_dir/.maestro/artifacts"
