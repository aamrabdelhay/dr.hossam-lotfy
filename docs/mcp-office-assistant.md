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


## Current transport status

The `/mcp` endpoint now authenticates tool calls with an OAuth 2.1-style authorization-code + PKCE flow (S256). Protected-resource and authorization-server discovery metadata are implemented, and access/refresh tokens are stored only as SHA-256 hashes in dedicated SQL tables.

The existing office login/session cookie remains the user-authentication boundary. OAuth authorization preserves that account and the existing branch/RBAC checks. Ordinary lawyers cannot directly create tasks/sessions through MCP; those writes are routed through the existing office approval workflow. Login preserves the OAuth return URL so the ChatGPT linking flow can continue after authentication.

The migration `prisma/migrations/20261003000100_mcp_oauth/migration.sql` must be applied before the MCP connection is used against a database that does not already contain these tables.

No Vercel deployment was requested or performed by this implementation.
