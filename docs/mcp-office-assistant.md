# Loutfi Office MCP App — implementation plan

This document defines the first integration boundary between ChatGPT and the existing office platform.

## Current slice

The shared server-side MCP tool contract lives in `src/lib/mcp/office-tools.ts`.

It intentionally reuses the existing:
- Prisma/PostgreSQL data access
- branch scoping in `src/lib/branch-access.ts`
- office senior-management checks
- existing `tasks`, `task_assignments`, `locations`, and `case_records` data

The first tool set is:
- `get_upcoming_sessions`
- `search_cases`
- `get_tasks`
- `get_branches`
- `create_task`
- `create_session`

No database schema change is required by this slice.

## Security boundary

The tool layer never trusts the model to decide access. Every operation receives a resolved `SessionUser` and re-checks branch access before reading or writing data.

The final ChatGPT connection must use MCP OAuth 2.1 for private office data and write actions. A shared secret or a hard-coded office account must not be used as the production identity model.

## Next integration step

Add a stable HTTPS `/mcp` endpoint using the official MCP TypeScript SDK and connect its authenticated request identity to `SessionUser`.

Then:
1. expose the six tools through MCP;
2. add OAuth 2.1 protected-resource and authorization-server metadata;
3. test with MCP Inspector;
4. connect the private plugin in ChatGPT Developer Mode;
5. add optional MCP Apps UI for sessions/tasks.

No Vercel deployment is part of this change.
