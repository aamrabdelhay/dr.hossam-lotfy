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
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
