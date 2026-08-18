import {PrismaClient} from '@/generated/prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';

// Prisma 7 has no built-in connection layer — every client needs a driver
// adapter. DATABASE_URL points at Neon's pooler, which is what keeps serverless
// invocations from exhausting connections.
function createClient() {
  return new PrismaClient({
    adapter: new PrismaPg({connectionString: process.env.DATABASE_URL})
  });
}

// Hot reload in dev otherwise opens a new pool on every file save.
const globalForPrisma = globalThis as unknown as {prisma?: PrismaClient};

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
