# Production database backup and restore runbook

This project uses PostgreSQL on Neon. The application deployment cannot enable or verify Neon scheduled snapshots from inside Vercel: that setting belongs to the Neon project/branch and depends on the subscribed Neon plan.

## Required production setup

1. Open the Neon Console and select the exact production project and primary branch used by the Vercel Production `DATABASE_URL`.
2. Confirm the project plan supports scheduled snapshots. Neon documents the backup-schedule API as paid-plan only: https://api-docs.neon.tech/reference/setsnapshotschedule
3. Configure a daily automatic snapshot for the production branch, with a retention period that meets the firm's legal and operational requirements.
4. Keep a separate recovery branch available; do not use a preview/staging database as the only backup.
5. Record the project, branch, schedule, snapshot retention, and responsible administrator in the firm's infrastructure register. Never paste database URLs, passwords, or API keys into this repository.

## Restore procedure

1. Freeze writes to the application and notify the office administrator.
2. In Neon, restore the selected snapshot to a **new branch first**. Do not immediately replace the production branch.
3. Validate schema/migrations, record counts, client/case relationships, and a sample of private-file metadata against the restored branch.
4. Verify application connectivity using a temporary controlled environment configured with the restored branch.
5. Only after approval, finalize the restore or switch the production connection. Keep the pre-restore branch until post-restore validation is complete.

Neon documents snapshot restoration to a new branch and optional finalization here: https://api-docs.neon.tech/reference/restoresnapshot

## Verification checklist

- [ ] A daily snapshot schedule is visible on the actual production branch.
- [ ] A recent snapshot is present and within the required recovery-point objective.
- [ ] A restore drill has succeeded on a separate branch.
- [ ] The restored branch passes application health checks and representative read/write checks.
- [ ] The person responsible and the last successful drill date are recorded.

**Current state:** this repository contains the operational runbook only. The Neon schedule and a restore drill are not marked complete until verified in the Neon Console for the production branch.
