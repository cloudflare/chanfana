import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Ensure this test runner uses a Node.js environment
    environment: 'node',
    // Specify the test files for this configuration
    include: ['**/cli.test.ts'],
    // Optional: give this test suite a name for clearer output
    name: 'node-cli',
    // Ensure that global setup/teardown from other configs are not inherited if not needed
    // globals: false, // Or configure as needed
  },
});
