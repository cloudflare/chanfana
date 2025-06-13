#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import path from 'node:path'; // Using node: prefix
import fs from 'node:fs';   // Using node: prefix

// Main async function
async function main() {
  const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 <userScriptPath> [options]')
    .positional('userScriptPath', {
      describe: 'Path to the user script that exports the Chanfana/Hono app',
      type: 'string',
    })
    .option('o', {
      alias: 'output',
      describe: 'Output file path for the OpenAPI schema',
      type: 'string',
      default: 'openapi.json',
    })
    .demandOption(['userScriptPath'], 'Please provide the path to your script')
    .help()
    .alias('h', 'help')
    .parse(); // Use .parse() for async yargs

  console.log('Chanfana OpenAPI Exporter');
  console.log('User Script Path:', argv.userScriptPath);
  console.log('Output File:', argv.o);

  // Check if user script path exists
  if (!fs.existsSync(argv.userScriptPath)) {
    console.error(`Error: User script not found at path: ${argv.userScriptPath}`);
    process.exit(1);
  }

  try {
    const absoluteUserScriptPath = path.resolve(argv.userScriptPath);
    console.log(`Attempting to import: ${absoluteUserScriptPath}`);

    const userModule = await import(`file://${absoluteUserScriptPath}`);

    if (!userModule.default) {
      console.error('Error: The user script does not have a default export.');
      process.exit(1);
    }

    const app = userModule.default;

    if (!app || typeof app.fetch !== 'function') {
      console.error('Error: The default export from the user script is not a valid application with a fetch method.');
      process.exit(1);
    }

    console.log('Successfully imported user script and found app with fetch method.');
    console.log('Type of app.fetch:', typeof app.fetch);

    const openapiPath = '/openapi.json'; // Assuming this is the standard path
    console.log('OpenAPI schema will be fetched from:', openapiPath);

    const requestUrl = `http://localhost${openapiPath}`;
    const request = new Request(requestUrl);

    console.log(`Simulating request to: ${requestUrl}`);
    const response = await app.fetch(request);

    console.log('Response Status:', response.status, response.statusText);

    if (!response.ok) {
      console.error(`Error fetching OpenAPI schema: ${response.status} ${response.statusText}`);
      let responseBody = await response.text();
      console.error('Response Body:', responseBody);
      process.exit(1);
    }

    console.log('Successfully fetched OpenAPI schema.');

    const schemaJson = await response.json();
    const schemaString = JSON.stringify(schemaJson, null, 2); // Pretty print JSON

    const outputFilePath = path.resolve(argv.o); // argv.o is from yargs parsing

    fs.writeFileSync(outputFilePath, schemaString);
    console.log(`OpenAPI schema successfully exported to: ${outputFilePath}`);

  } catch (error) {
    console.error(`Error during OpenAPI schema export: ${error.message}`);
    if (error.stack) {
        console.error(error.stack);
    }
    process.exit(1);
  }
}

// Execute the main function
main().catch(error => {
  console.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});
