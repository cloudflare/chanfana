#!/usr/bin/env node
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const READY_KEYWORD = "ready on";
const URL_REGEX = /ready on\s+(https?:\/\/[\w\.-]+:\d+)/i;

// Parse command-line arguments
let outputFile = "schema.json";
const wranglerArgs: string[] = ["wrangler", "dev"];
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "-o" || args[i] === "--output") {
    if (i + 1 >= args.length) {
      console.error("Error: -o/--output requires a file path");
      process.exit(1);
    }
    const filePath = args[i + 1];
    if (!filePath) {
      console.error("Error: -o/--output file path cannot be empty");
      process.exit(1);
    }
    outputFile = filePath;
    i++;
  } else {
    wranglerArgs.push(args[i] as string);
  }
}

// Resolve output file path relative to current working directory
const resolvedOutputFile: string = join(process.cwd(), outputFile);

// Spawn the 'npx wrangler dev' command with custom arguments
const childProcess = spawn("npx", wranglerArgs, {
  cwd: process.cwd(),
  stdio: ["inherit", "pipe", "pipe"],
  shell: true,
});

// Buffer stdout and stderr lines in memory
const outputBuffer: string[] = [];

// Read stdout line by line
childProcess.stdout.on("data", (data: Buffer) => {
  const line = data.toString().trim();
  outputBuffer.push(line);
});

// Read stderr line by line
childProcess.stderr.on("data", (data: Buffer) => {
  const line = data.toString().trim();
  outputBuffer.push(`Error: ${line}`);
});

// Process stdout for "ready on" and fetch schema
childProcess.stdout.on("data", async (data: Buffer) => {
  const line = data.toString().trim();

  if (line.toLowerCase().includes(READY_KEYWORD)) {
    const match = line.match(URL_REGEX);
    if (match?.[1]) {
      const url = match[1];
      const request = new Request(`${url}/openapi.json`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      try {
        const response = await fetch(request);

        if (!response.ok) {
          console.error(`Error fetching schema: ${response.status} ${response.statusText}`);
          const body = await response.text();
          console.error("Response body:", body);
          console.error("Buffered output:", outputBuffer.join("\n"));
          childProcess.kill("SIGTERM");
          process.exit(1);
        }

        const schema: any = await response.json();

        // Remove paths with x-ignore: true
        if (schema.paths) {
          for (const path in schema.paths) {
            const pathObj = schema.paths[path];
            for (const method in pathObj) {
              if (pathObj[method]["x-ignore"] === true) {
                delete schema.paths[path];
                break;
              }
            }
          }
        }

        const schemaString = JSON.stringify(schema, null, 2);

        try {
          await writeFile(resolvedOutputFile, schemaString);
          console.log(`Schema written to ${resolvedOutputFile}`);
        } catch (err: unknown) {
          console.error(`Error writing schema to ${resolvedOutputFile}: ${(err as Error).message}`);
          console.error("Buffered output:", outputBuffer.join("\n"));
          childProcess.kill("SIGTERM");
          process.exit(1);
        }

        console.log("Successfully extracted schema");
        childProcess.kill("SIGTERM");
        process.exit(0);
      } catch (err: unknown) {
        console.error(`Fetch error: ${(err as Error).message}`);
        console.error("Buffered output:", outputBuffer.join("\n"));
        childProcess.kill("SIGTERM");
        process.exit(1);
      }
    } else {
      console.error(`No URL found in "ready on" line: ${line}`);
      console.error("Buffered output:", outputBuffer.join("\n"));
    }
  }
});

// Terminate after 60 seconds if not ready
const timeoutId = setTimeout(() => {
  childProcess.kill("SIGTERM");
  console.error(`Command "npx wrangler dev" was never ready, exiting...`);
  console.error("Buffered output:", outputBuffer.join("\n"));
  process.exit(1);
}, 60000);

// Handle parent process exit scenarios
const cleanup = () => {
  clearTimeout(timeoutId);
  if (!childProcess.killed) {
    childProcess.kill("SIGTERM");
    console.log("Cleaning up child process on exit");
  }
};

process.on("exit", cleanup);
process.on("SIGINT", () => {
  console.log("Received SIGINT (Ctrl+C), exiting...");
  cleanup();
  process.exit(0);
});
process.on("SIGTERM", () => {
  console.log("Received SIGTERM, exiting...");
  cleanup();
  process.exit(0);
});
process.on("uncaughtException", (err: unknown) => {
  console.error("Uncaught Exception:", (err as Error).message);
  console.error("Buffered output:", outputBuffer.join("\n"));
  cleanup();
  process.exit(1);
});
