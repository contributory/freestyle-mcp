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
 * definitions. The server listens on http://localhost:3000, override with PORT.)
 */

import { FastMCP } from "npm:fastmcp";
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

const port = Number(Deno.env.get("PORT") ?? 3000);
const baseUrl = Deno.env.get("FREESTYLE_API_BASE") ?? undefined;

// ---------------------------------------------------------------------------
// MCP server + tools
// ---------------------------------------------------------------------------

const client = new FreestyleClient(apiKey, baseUrl);

const server = new FastMCP({
  name: "freestyle-mcp",
  version: "1.0.0",
});

registerVmTools(server, client);
registerGitTools(server, client);
registerDocsTools(server);

// ---------------------------------------------------------------------------
// Streamable HTTP transport
// ---------------------------------------------------------------------------

await server.start({
  transportType: "streamable-http",
  sseEndpoint: "/sse",
  endpoint: "/messages",
  port,
});

export default async (req: Request) => {
  return await server.handleRequest(req);
};
