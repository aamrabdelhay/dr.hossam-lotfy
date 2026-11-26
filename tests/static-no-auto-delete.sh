#!/usr/bin/env bash
# Static guard: nothing in src may delete stored files or file rows automatically.
set -u; cd "$(dirname "$0")/.."; f=0
chk(){ if eval "$2"; then echo "FAIL $1"; f=1; else echo "PASS $1"; fi; }
chk "file-deletion.ts has no storage delete imports" "grep -nE 'DeleteObjectCommand|@vercel/blob' src/lib/file-deletion.ts"
chk "file-deletion.ts never deletes case/client file rows" "grep -nE 'DELETE FROM \"(case_files|client_files|office_archive)\"' src/lib/file-deletion.ts"
chk "no purgeExpiredApprovedFiles anywhere" "grep -rn purgeExpiredApprovedFiles src --include=*.ts --include=*.tsx"
chk "no cron route deletes files" "grep -nE 'DeleteObjectCommand|DELETE FROM \"(case_files|client_files)\"' src/app/api/cron/*/route.ts"
chk "UI does not announce automatic deletion" "grep -n 'تُحذف النسخة المخزنة' src/components/admin/file-deletion-requests.tsx"
exit $f
