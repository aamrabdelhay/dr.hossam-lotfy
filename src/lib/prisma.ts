import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '@/generated/prisma/client';

export { Prisma };
export type {
  Task,
  TaskAssignment,
  Lawyer,
  Location,
  CaseRecord,
  Comment,
  User,
  Notification,
  ActivityLog,
  TaskStatus,
  LocationType,
  LawyerTitle,
} from '@/generated/prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function normalizeDatabaseUrl(raw: string | undefined): string {
  if (!raw) throw new Error('DATABASE_URL is required');
  // pg-connection-string is changing the meaning of `require` in a future
  // major release. Make the stronger TLS mode explicit for hosted Postgres.
  return raw.includes('sslmode=')
    ? raw.replace(/([?&]sslmode=)(?:prefer|require|verify-ca)(?=&|$)/, '$1verify-full')
    : raw.includes('?')
      ? `${raw}&sslmode=verify-full`
      : `${raw}?sslmode=verify-full`;
}

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: normalizeDatabaseUrl(process.env.DATABASE_URL) });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
