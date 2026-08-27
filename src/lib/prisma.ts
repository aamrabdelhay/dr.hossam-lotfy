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

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    // Allow build to succeed without DB (layout has fail-soft), but throw clear error at runtime
    // Health endpoint uses direct pg Client and handles missing DATABASE_URL gracefully
    console.warn('[prisma] DATABASE_URL is not set — Prisma client will fail at runtime');
  }
  const adapter = new PrismaPg({ connectionString: url ?? '' });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
