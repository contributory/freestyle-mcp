/**
 * MCP tool for the Freestyle docs Bash API.
 *
 * Runs one-shot, stateless bash commands against the Freestyle docs virtual
 * filesystem (https://www.freestyle.sh/docs/bash). Useful for agents that need
 * to look up Freestyle documentation at runtime.
 */

import { z } from "npm:zod@4";
import type { FastMCP } from "npm:fastmcp";
import { err, ok } from "./helpers.ts";

const DOCS_BASH_URL = "https://www.freestyle.sh/docs/bash";

export function registerDocsTools(server: FastMCP): void {
  server.registerTool(
    "docs_bash",
    {
      title: "Run a command against the Freestyle docs",
      description:
        "Run a one-shot bash command against the Freestyle docs virtual " +
        "filesystem. Each request is stateless and starts in a fresh read-only " +
        "docs filesystem. Useful for reading Freestyle documentation. " +
        "Examples: 'ls /docs', 'cat /docs/quickstart.md', " +
        "'cat /api/docs.json | jq \".docs[].path\"'.",
      inputSchema: z.object({
        command: z
          .string()
          .describe(
            "The shell command to run (max 64000 bytes, 5000ms duration). " +
              "stdin is empty; pass file paths or pipe content between commands.",
          ),
      }),
    },
    async ({ command }) => {
      try {
        const res = await fetch(DOCS_BASH_URL, {
          method: "POST",
          headers: { Accept: "application/json" },
          body: command,
        });
        if (!res.ok) {
          throw new Error(`Docs bash API failed: ${res.status} ${res.statusText}`);
        }
        const result = await res.json();
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );
}