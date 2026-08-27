#!/usr/bin/env bash
# Lightweight production/local smoke test. It intentionally uses only curl,
# grep and standard shell tools so it can run in CI, on a developer laptop or
# against the public Vercel URL.
#
# Usage:
#   npm run smoke
#   npm run smoke -- https://dr-hossam-lotfy-hw88-aamrabdelhays-projects.vercel.app
#   BASE_URL=https://example.com npm run smoke

set -u -o pipefail

BASE_URL="${1:-${BASE_URL:-http://localhost:3000}}"
BASE_URL="${BASE_URL%/}"
CONNECT_TIMEOUT="${SMOKE_CONNECT_TIMEOUT:-10}"
MAX_TIME="${SMOKE_MAX_TIME:-30}"

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  sed -n '2,11p' "$0"
  exit 0
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required to run the smoke test." >&2
  exit 2
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

passed=0
failed=0
last_body=""
last_headers=""
last_status=""

pass() {
  printf '  \033[32m✓\033[0m %s\n' "$1"
  passed=$((passed + 1))
}

fail() {
  printf '  \033[31m✗\033[0m %s\n' "$1" >&2
  failed=$((failed + 1))
}

request() {
  local label="$1"
  local method="$2"
  local path="$3"
  local expected_status="$4"
  shift 4

  local key
  key="$(printf '%s' "${method}-${path}" | tr -c '[:alnum:]' '_')"
  last_body="$TMP_DIR/${key}.body"
  last_headers="$TMP_DIR/${key}.headers"

  if ! last_status="$(curl --silent --show-error --globoff \
    --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" \
    --request "$method" --dump-header "$last_headers" --output "$last_body" \
    --write-out '%{http_code}' "$@" "${BASE_URL}${path}")"; then
    fail "$label — تعذّر الوصول إلى ${BASE_URL}${path}"
    return 1
  fi

  if [[ "$last_status" == "$expected_status" ]]; then
    pass "$label — HTTP $last_status"
    return 0
  fi

  fail "$label — المتوقع HTTP $expected_status، وصل HTTP $last_status"
  if [[ -s "$last_body" ]]; then
    printf '    response: %s\n' "$(head -c 300 "$last_body" | tr '\n' ' ')" >&2
  fi
  return 1
}

body_contains() {
  local label="$1"
  local needle="$2"
  if grep -Fq -- "$needle" "$last_body"; then
    pass "$label"
  else
    fail "$label — لم يُعثر على: $needle"
  fi
}

header_matches() {
  local label="$1"
  local expression="$2"
  if grep -Eqi -- "$expression" "$last_headers"; then
    pass "$label"
  else
    fail "$label — الهيدر غير موجود أو قيمته مختلفة"
  fi
}

printf '\nSmoke test: %s\n\n' "$BASE_URL"

request 'تشخيص الخدمة' GET '/api/health' 200 || true
body_contains 'health.status = ok' '"status":"ok"'
header_matches 'health is not cached' '^cache-control:.*no-store'

request 'صفحة عامة (المحامون)' GET '/lawyers' 200 || true
header_matches 'Content-Security-Policy' '^content-security-policy:'
header_matches 'X-Frame-Options: DENY' '^x-frame-options:[[:space:]]*DENY'
header_matches 'X-Content-Type-Options: nosniff' '^x-content-type-options:[[:space:]]*nosniff'
header_matches 'Referrer-Policy' '^referrer-policy:'
header_matches 'Permissions-Policy' '^permissions-policy:'
header_matches 'Strict-Transport-Security' '^strict-transport-security:'

request 'robots.txt' GET '/robots.txt' 200 || true
body_contains 'robots يحتوي Sitemap' 'Sitemap:'
if [[ "$BASE_URL" =~ ^https?://(localhost|127\.0\.0\.1)(:|/|$) ]]; then
  pass 'robots يستخدم رابط Sitemap قانونياً (قد يكون الدومين الإنتاجي في البيئة المحلية)'
else
  body_contains 'robots يشير إلى الدومين المختبَر' "${BASE_URL}/sitemap.xml"
fi

request 'sitemap.xml' GET '/sitemap.xml' 200 || true
location_links="$(grep -o '/locations/' "$last_body" 2>/dev/null | wc -l | tr -d ' ')"
if [[ "$location_links" =~ ^[0-9]+$ ]] && (( location_links >= 134 )); then
  pass "sitemap يحتوي على 134 رابط مكان أو أكثر ($location_links)"
else
  fail "sitemap يحتوي على $location_links روابط مكان؛ المتوقع 134 على الأقل"
fi

request 'دليل الأماكن' GET '/locations' 200 || true
body_contains 'قسم الأنشطة القادمة' 'أنشطة قادمة'
body_contains 'فلاتر الأماكن' 'تصفية الأماكن'

request 'قائمة الأماكن العامة' GET '/api/locations' 200 || true
body_contains 'الأماكن العامة تُرجع قائمة' '"locations"'

request 'الصفحة الداخلية (الرئيسية) تُحوّل للدخول' GET '/' 307 || true
request 'صفحة الجلسات تُحوّل للدخول' GET '/sessions' 307 || true
request 'صفحة التقويم تُحوّل للدخول' GET '/calendar' 307 || true
header_matches 'وجهة تحويل الصفحات الداخلية' '^location:.*\/admin\/login'

request 'البحث محمي خلف تسجيل الدخول (إنجليزي)' GET '/api/search?q=tax' 401 || true
request 'البحث محمي خلف تسجيل الدخول (عربي)' GET '/api/search?q=%D9%85%D8%AD%D9%83%D9%85%D8%A9' 401 || true

request 'إدارة الزائر تُحوّل للدخول' GET '/admin' 307 || true
header_matches 'وجهة تحويل الإدارة' '^location:.*\/admin\/login'

request 'منع إضافة مكان للزائر' POST '/api/locations' 403 --data '' || true
request 'منع قائمة المستخدمين للزائر' GET '/api/users' 403 || true

printf '\n%s\n' '────────────────────────────────────────'
printf 'النتيجة: %d ناجح، %d فاشل\n' "$passed" "$failed"

if (( failed > 0 )); then
  printf 'راجع /api/health أولاً عند فشل الصحة أو صفحات البيانات.\n' >&2
  exit 1
fi

printf 'كل اختبارات الـ smoke الأساسية نجحت.\n'
