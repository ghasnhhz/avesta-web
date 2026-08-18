import {config as loadEnv} from 'dotenv';
import {defineConfig} from 'prisma/config';

// Next.js reads .env.local; the Prisma CLI does not, so load it here.
loadEnv({path: '.env.local'});

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {path: 'prisma/migrations'},
  // Migrations must run over Neon's direct (unpooled) connection. The pooled
  // DATABASE_URL is what the app uses at runtime.
  datasource: {url: process.env.DIRECT_URL}
});
