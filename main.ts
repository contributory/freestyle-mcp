/**
 * Freestyle MCP Server
 *
 * Exposes Freestyle (https://www.freestyle.sh) — fast Linux VMs and
 * multi-tenant Git — as an MCP server over the Streamable HTTP transport.
 *
 * Run:
 *   FREESTYLE_API_KEY=your-api-key deno run --allow-net --allow-env --allow-import main.ts
 *
 * (--allow-import is only required because deno.json pulls in Val Town type
 * definitions. `export default` is the Val Town HTTP entry point.)
 *
 * Stateless by design: val.town does not keep any process state between
 * requests, so every request gets a fresh McpServer built by createMcpHandler's
 * per-request factory — nothing is stored in memory between calls.
 */

import { createMcpHandler, McpServer } from "npm:@modelcontextprotocol/server";
import { FreestyleClient } from "./src/freestyle.ts";
import { registerVmTools } from "./src/tools/vms.ts";
import { registerGitTools } from "./src/tools/git.ts";
import { registerDocsTools } from "./src/tools/docs.ts";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const apiKey = Deno.env.get("FREESTYLE_API_KEY");
if (!apiKey) {
  console.error(
    "FREESTYLE_API_KEY environment variable is required. " +
      "Get one at https://dash.freestyle.sh and export it, e.g.:\n" +
      "  export FREESTYLE_API_KEY=your-api-key",
  );
  Deno.exit(1);
}

const baseUrl = Deno.env.get("FREESTYLE_API_BASE") ?? undefined;

// ---------------------------------------------------------------------------
// MCP server + tools
// ---------------------------------------------------------------------------

// Freestyle REST client — created once at module scope and shared by every
// per-request server instance (the factory only closes over it).
const client = new FreestyleClient(apiKey, baseUrl);

// Stateless Streamable HTTP handler. The factory runs once per HTTP request
// and builds a fresh McpServer, so nothing is held in memory between requests.
// This matches val.town's stateless execution model.
const handler = createMcpHandler(() => {
  const server = new McpServer({
    name: "freestyle-mcp",
    version: "1.0.0",
  });

  registerVmTools(server, client);
  registerGitTools(server, client);
  registerDocsTools(server);

  return server;
});

// Val Town HTTP entry point.
export default handler.fetch;
