#!/usr/bin/env bash
# Production-safe smoke tests. No credentials are hard-coded in this file.
# Usage: npm run smoke -- https://dr-hossam-lotfy-hw88.vercel.app
# Optional: SMOKE_ADMIN_ACCESS_CODE is supplied securely by the operator to test successful admin login.

set -u -o pipefail

BASE_URL="${1:-${BASE_URL:-http://localhost:3000}}"
BASE_URL="${BASE_URL%/}"
CONNECT_TIMEOUT="${SMOKE_CONNECT_TIMEOUT:-10}"
MAX_TIME="${SMOKE_MAX_TIME:-30}"

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: npm run smoke -- [BASE_URL]"
  exit 0
fi
if ! command -v curl >/dev/null 2>&1; then echo "curl is required" >&2; exit 2; fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
passed=0
failed=0
last_body=""
last_headers=""
last_status=""

pass() { printf '  ✓ %s\n' "$1"; passed=$((passed + 1)); }
fail() { printf '  ✗ %s\n' "$1" >&2; failed=$((failed + 1)); }

request() {
  local label="$1" method="$2" path="$3" expected_status="$4"
  shift 4
  local key
  key="$(printf '%s' "${method}-${path}" | tr -c '[:alnum:]' '_')"
  last_body="$TMP_DIR/${key}.body"
  last_headers="$TMP_DIR/${key}.headers"
  if ! last_status="$(curl --silent --show-error --globoff \
    --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" \
    --request "$method" --dump-header "$last_headers" --output "$last_body" \
    --write-out '%{http_code}' "$@" "${BASE_URL}${path}")"; then
    fail "$label — network error"
    return 1
  fi
  if [[ "$last_status" == "$expected_status" ]]; then pass "$label — HTTP $last_status"; return 0; fi
  fail "$label — expected HTTP $expected_status, got $last_status"
  [[ ! -s "$last_body" ]] || printf '    response: %s\n' "$(head -c 250 "$last_body" | tr '\n' ' ')" >&2
  return 1
}
body_contains() {
  if grep -Fq -- "$2" "$last_body"; then pass "$1"; else fail "$1 — expected content missing"; fi
}
header_matches() {
  if grep -Eqi -- "$2" "$last_headers"; then pass "$1"; else fail "$1 — expected header missing"; fi
}

printf '\nSmoke test: %s\n\n' "$BASE_URL"

request 'Health endpoint' GET '/api/health' 200 || true
body_contains 'Health reports ok' '"status":"ok"'
header_matches 'Health is not cached' '^cache-control:.*no-store'

request 'Lawyers page' GET '/lawyers' 200 || true
header_matches 'Content-Security-Policy exists' '^content-security-policy:'
header_matches 'X-Frame-Options is SAMEORIGIN' '^x-frame-options:[[:space:]]*SAMEORIGIN'
header_matches 'X-Content-Type-Options is nosniff' '^x-content-type-options:[[:space:]]*nosniff'
header_matches 'Referrer-Policy exists' '^referrer-policy:'
header_matches 'Permissions-Policy exists' '^permissions-policy:'
header_matches 'Strict-Transport-Security exists' '^strict-transport-security:'

request 'robots.txt' GET '/robots.txt' 200 || true
body_contains 'robots contains sitemap' 'Sitemap:'
body_contains 'robots points to tested domain' "${BASE_URL}/sitemap.xml"

request 'sitemap.xml' GET '/sitemap.xml' 200 || true
location_links="$(grep -o '/locations/' "$last_body" 2>/dev/null | wc -l | tr -d ' ')"
if [[ "$location_links" =~ ^[0-9]+$ ]] && (( location_links >= 149 )); then pass "Sitemap location links: $location_links"; else fail "Sitemap has only $location_links location links"; fi
if grep -Eo '<loc>https?://' "$last_body" >/dev/null; then pass 'Sitemap URLs are absolute'; else fail 'Sitemap has no absolute URLs'; fi

request 'Locations page' GET '/locations' 200 || true
body_contains 'Locations has upcoming activities section' 'أنشطة قادمة'
body_contains 'Locations has lawyer-guide filters' 'بحث وتصفية دليل المحامي'
request 'Locations API' GET '/api/locations' 200 || true
body_contains 'Locations API contains list' '"locations"'

request 'Home page' GET '/' 200 || true
request 'Sessions page' GET '/sessions' 200 || true
request 'Calendar page' GET '/calendar' 200 || true
request 'Auth page' GET '/auth' 200 || true
body_contains 'Auth page has sign-in option' 'تسجيل دخول'
body_contains 'Auth page has first registration option' 'تسجيل أول مرة'
body_contains 'Auth page has admin entry option' 'دخول الإدارة'

request 'Wrong admin code is rejected' POST '/api/auth/admin' 401 --header 'Content-Type: application/json' --data '{"code":"definitely-wrong"}' || true
if [[ -n "${SMOKE_ADMIN_ACCESS_CODE:-}" ]]; then
  request 'Configured admin code works' POST '/api/auth/admin' 200 --header 'Content-Type: application/json' --data "{\"code\":\"$SMOKE_ADMIN_ACCESS_CODE\"}" || true
else
  printf '  - SKIP successful admin login (set SMOKE_ADMIN_ACCESS_CODE securely to run this check)\n'
fi
request 'Invalid lawyer login is rejected' POST '/api/auth/lawyer' 401 --header 'Content-Type: application/json' --data '{"name":"Unknown Test User","email":"no-such-user@example.invalid"}' || true

request 'Search API requires sign-in (English)' GET '/api/search?q=tax' 401 || true
request 'Search API requires sign-in (Arabic)' GET '/api/search?q=%D9%85%D8%AD%D9%83%D9%85%D8%A9' 401 || true
request 'Cron endpoint rejects unauthenticated requests' GET '/api/cron/email-reminders' 401 || true

# /admin may rewrite to the public shell, but must never return the private admin view to guests.
request 'Admin route guest shell' GET '/admin' 200 || true
if grep -Fq 'منطقة الإدارة' "$last_body" || grep -Fq 'إدارة الفروع' "$last_body"; then
  fail 'Admin route leaked admin-only content to a guest'
else
  pass 'Guest does not receive admin-only page content'
fi
request 'Guest cannot create a location' POST '/api/locations' 403 --data '' || true
request 'Guest cannot read user records' GET '/api/users' 403 || true

printf '\n────────────────────────────────────────\n'
printf 'Result: %d passed, %d failed\n' "$passed" "$failed"
if (( failed > 0 )); then exit 1; fi
printf 'All available smoke checks passed.\n'
