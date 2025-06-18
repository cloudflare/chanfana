# Command Line Interface (CLI)

Chanfana provides a CLI tool to extract the OpenAPI schema from your Cloudflare Worker project. The `npx chanfana` command starts a local development server using `npx wrangler dev`, captures the server URL, fetches the OpenAPI schema from the `/openapi.json` endpoint, removes any paths marked with `x-ignore: true`, and writes the resulting schema to a file.
The `x-ignore` property can be added to your `OpenAPIRouteSchema` for type-hinting.

**Usage:**

```bash
npx chanfana [-o <path-to-output-schema.json>] [wrangler-options]
```

**Options:**
- `-o, --output <path>`: Specifies the output file path for the OpenAPI schema (optional, defaults to `./schema.json`).
- `[wrangler-options]`: Additional options passed to `npx wrangler dev` (e.g., `--port 8788`, `--env dev`).

**Example:**

To extract the schema and save it to `schema.json`:

```bash
npx chanfana
```

To use a custom output file and custom env:

```bash
npx chanfana -o custom_schema.json -e production
```

This will:
1. Run `npx wrangler dev` with any provided `wrangler` options in the current Worker project directory.
2. Wait for the server to start and capture the first URL from the "ready on" message (e.g., `http://0.0.0.0:8788`).
3. Fetch the OpenAPI schema from `<url>/openapi.json`.
4. Remove any paths in the schema where the `OpenAPIRouteSchema` for that path contains `x-ignore: true`.
5. Write the modified schema to `schema.json` (or the file specified with `-o`) in the current working directory.
6. Terminate the development server and exit.

**Notes:**
- Ensure your Worker project is configured correctly with a `wrangler.toml` file and exposes an `/openapi.json` endpoint.
- The output file path is relative to the current working directory. Parent directories must exist for nested paths (e.g., `output/schema.json`).
- If the schema fetch fails or the server doesn't start within 60 seconds, buffered output and error details are logged.
- The process is automatically cleaned up if interrupted (e.g., Ctrl+C) or if an error occurs.
