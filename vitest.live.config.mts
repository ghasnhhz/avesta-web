import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vitest/config';

// The live check is deliberately outside `npm test`: the suite must stay
// fixture-only so it never depends on upstream being up.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'server-only': fileURLToPath(new URL('./src/test/server-only-stub.ts', import.meta.url))
    }
  },
  test: {environment: 'node', include: ['scripts/**/*.live.test.ts']}
});
