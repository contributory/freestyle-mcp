/**
 * Shared helpers for building MCP tool results.
 */

/** A successful tool result with both human-readable text and structured data. */
export function ok(data: unknown): {
  content: { type: "text"; text: string }[];
  structuredContent: unknown;
} {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

/** An error result, returned as a normal (non-error) response. */
export function err(error: unknown): {
  content: { type: "text"; text: string }[];
} {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text", text: `Error: ${message}` }],
  };
}