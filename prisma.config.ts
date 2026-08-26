import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://lhl:lhl@127.0.0.1:5432/lhlawfirm?schema=public',
    shadowDatabaseUrl:
      process.env.SHADOW_DATABASE_URL || 'postgresql://lhl:lhl@127.0.0.1:5432/lhlawfirm_shadow?schema=public',
  },
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
});
