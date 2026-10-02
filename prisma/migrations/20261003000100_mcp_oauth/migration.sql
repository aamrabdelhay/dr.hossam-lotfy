CREATE TABLE IF NOT EXISTS "mcp_oauth_codes" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "codeHash" TEXT NOT NULL UNIQUE,
  "authSessionId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "redirectUri" TEXT NOT NULL,
  "codeChallenge" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mcp_oauth_codes_authSessionId_fkey" FOREIGN KEY ("authSessionId") REFERENCES "auth_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "mcp_oauth_codes_expiresAt_idx" ON "mcp_oauth_codes"("expiresAt");

CREATE TABLE IF NOT EXISTS "mcp_oauth_tokens" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "accessTokenHash" TEXT NOT NULL UNIQUE,
  "refreshTokenHash" TEXT NOT NULL UNIQUE,
  "authSessionId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "refreshExpiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mcp_oauth_tokens_authSessionId_fkey" FOREIGN KEY ("authSessionId") REFERENCES "auth_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "mcp_oauth_tokens_expiresAt_idx" ON "mcp_oauth_tokens"("expiresAt");
