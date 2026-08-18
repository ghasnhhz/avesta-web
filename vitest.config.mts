import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // server-only throws on import outside a server bundle. Its whole job is a
      // build-time guard, so under test it is stubbed out.
      'server-only': fileURLToPath(new URL('./src/test/server-only-stub.ts', import.meta.url))
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
});
