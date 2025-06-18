#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import parser from "yargs-parser";

async function main() {
  const args = parser(process.argv.slice(2));

  const inputFile = args.i as string;
  const outputFile = args.o as string;

  if (!inputFile || !outputFile) {
    console.error("Usage: chanfana -i <input-file> -o <output-file>");
    process.exit(1);
  }

  try {
    const absoluteInputPath = path.resolve(inputFile);
    const worker = await import(absoluteInputPath);

    if (!worker.default || typeof worker.default !== "function") {
      if (!worker.fetch || typeof worker.fetch !== "function") {
        console.error(
          `Could not find a default export or a named 'fetch' export in ${inputFile}. The module should export a fetch-compatible function.`,
        );
        process.exit(1);
      }
    }

    const fetch = worker.default || worker.fetch;

    // Create a dummy Request object for the /openapi.json endpoint
    // Assuming the server is running at http://localhost (doesn't actually matter for this)
    const request = new Request("http://localhost/openapi.json", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await fetch(request);

    if (!response.ok) {
      console.error(`Error fetching schema from ${inputFile}: ${response.status} ${response.statusText}`);
      const body = await response.text();
      console.error("Response body:", body);
      process.exit(1);
    }

    const schema = await response.json();
    const schemaString = JSON.stringify(schema, null, 2);

    await fs.writeFile(outputFile, schemaString);
    console.log(`Successfully extracted schema from ${inputFile} to ${outputFile}`);
  } catch (error) {
    console.error("Error processing schema extraction:", error);
    process.exit(1);
  }
}

main();
