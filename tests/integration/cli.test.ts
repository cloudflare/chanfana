import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to get __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..', '..'); // Adjust if test file is nested deeper
const tempTestDir = path.join(projectRoot, 'temp_test_output');
const compiledWorkerPath = path.join(tempTestDir, 'example-worker.mjs');
const outputSchemaPath = path.join(tempTestDir, 'schema.json');
const exampleWorkerSrcPath = path.resolve(projectRoot, 'tests', 'example-worker.ts');
const cliScriptPath = path.resolve(projectRoot, 'dist', 'extract-schema.js');

describe('CLI schema extraction', () => {
  beforeAll(async () => {
    // 1. Ensure dist/extract-schema.js exists (main build should have created it)
    try {
      await fs.access(cliScriptPath);
    } catch (e) {
      console.warn(`WARN: ${cliScriptPath} not found. Attempting to build...`);
      try {
        execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });
      } catch (buildError) {
        console.error('FATAL: Build failed. Cannot run CLI test.', buildError);
        throw new Error('Build failed, cannot run CLI test.');
      }
    }

    // 2. Create a temporary directory for test outputs
    await fs.mkdir(tempTestDir, { recursive: true });

    // 3. Compile tests/example-worker.ts to temp_test_output/example-worker.js
    //    We need to use tsup or tsc directly here.
    //    Using tsup programmatically can be complex. Using execSync is simpler for now.
    //    Make sure tsup is accessible or use npx tsup.
    //    Using tsup programmatically can be complex. Using execSync is simpler for now.
    //    Make sure tsup is accessible or use npx tsup.
    //    Compile the test worker using tsc directly as tsup is having issues with path resolution.
    //    Match relevant compiler options from tsconfig.json and ensure ESM output.
    //    The output file will be in tempTestDir, preserving the original filename (e.g., example-worker.js).
    //    tsc will output .js files, so compiledWorkerPath should expect .js if this is used.
    //    However, extract-schema.ts uses dynamic import() which prefers .mjs for ESM.
    //    We need to ensure tsc outputs .mjs or that compiledWorkerPath is adjusted.
    //    For ESM with tsc, --module esnext and --outDir typically produce .js.
    //    Let's adjust compiledWorkerPath to expect '.js' from tsc for now.
    const tsconfigPath = path.resolve(projectRoot, 'tsconfig.json'); // Ensure tsconfig path is absolute
    const tscCommand = `npx tsc --project ${tsconfigPath} ${exampleWorkerSrcPath} --outDir ${tempTestDir} --module esnext --target es2022 --esModuleInterop --skipLibCheck --moduleResolution bundler --resolveJsonModule true --declaration false`;
    try {
      console.log(`Compiling test worker with tsc (cwd: ${projectRoot}): ${tscCommand}`);
      execSync(tscCommand, { cwd: projectRoot, stdio: 'inherit' });
      // IMPORTANT: Adjust compiledWorkerPath to expect a .js file from tsc
      // This is a temporary hack. Ideally, tsc output or cli.test.ts path handling needs to be smarter.
      // For now, this test will look for example-worker.js
      // compiledWorkerPath = path.join(tempTestDir, 'example-worker.js'); // Re-assign
    } catch (error) {
      console.error('Failed to compile example-worker.ts for test:', error);
      throw error; // Fail the test setup if compilation fails
    }
  });

  it('should extract schema from example-worker.js', async () => {
    // Ensure the compiled worker exists before trying to use it
    try {
      await fs.access(compiledWorkerPath);
    } catch (e) {
      throw new Error(`${compiledWorkerPath} not found. Compilation in beforeAll might have failed.`);
    }

    // Run the CLI script
    const command = `node ${cliScriptPath} -i ${compiledWorkerPath} -o ${outputSchemaPath}`;
    try {
      console.log(`Executing CLI: ${command}`);
      execSync(command, { cwd: projectRoot, stdio: 'inherit' });
    } catch (error) {
      console.error('CLI execution failed:', error);
      throw error; // Fail the test if CLI command fails
    }

    // Read and verify the output schema
    let schemaContent;
    try {
      schemaContent = await fs.readFile(outputSchemaPath, 'utf-8');
    } catch (error) {
      console.error('Failed to read output schema file:', error);
      throw error;
    }

    let schema;
    try {
      schema = JSON.parse(schemaContent);
    } catch (error) {
      console.error('Failed to parse output schema JSON:', error);
      throw error;
    }

    expect(schema).toBeTypeOf('object');
    expect(schema.openapi).toMatch(/^3\.[01]\.\d+$/); // Matches 3.0.x or 3.1.x
    expect(schema.paths).toHaveProperty('/hello');
    expect(schema.paths['/hello'].get).toBeTypeOf('object');
    expect(schema.paths['/hello'].get.summary).toBe('Say hello');
    expect(schema.paths['/hello'].get.parameters).toBeInstanceOf(Array);
    expect(schema.paths['/hello'].get.responses).toHaveProperty('200');
    expect(schema.paths['/hello'].get.responses['200'].description).toBe('Returns a greeting');
  });
});
