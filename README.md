# Freestyle MCP Server

An [MCP](https://modelcontextprotocol.io) server that exposes
[Freestyle](https://www.freestyle.sh) — fast Linux VMs for execution and
multi-tenant Git for storage — to AI agents and MCP clients, using the
**Streamable HTTP** transport.

Built with Deno and the official MCP TypeScript SDK
([`@modelcontextprotocol/server`](https://www.npmjs.com/package/@modelcontextprotocol/server)).

## Requirements

- [Deno](https://deno.com/) 1.40+
- A Freestyle API key from https://dash.freestyle.sh

## Run

`main.ts` exports a **stateless** Streamable HTTP handler that is meant to be
deployed as a Val Town HTTP val (e.g. `https://freestyle.val.run`). Because
val.town does not keep any process state between requests, every request builds
a fresh `McpServer` via `createMcpHandler` — nothing is held in memory between
calls, so the endpoint scales horizontally as-is.

```bash
export FREESTYLE_API_KEY="your-api-key"
deno run --allow-net --allow-env --allow-import main.ts
```

> `main.ts` does not bind a port itself — `export default` is the Val Town HTTP
> entry point. To serve it locally for testing, mount the default export with
> `Deno.serve`:
>
> ```ts
> import handler from "./main.ts";
> Deno.serve({ port: 3000 }, (req) => handler(req));
> ```

> `--allow-import` is only needed because `deno.json` pulls in the Val Town
> type definitions. Remove the `types` entry from `deno.json` if you don't need
> them, then `--allow-import` can be dropped.

## Connect an MCP client

The endpoint is the deployed Val Town URL, e.g. `https://freestyle.val.run`.
Configure it in any MCP client that supports the Streamable HTTP transport, for
example in VS Code (`.vscode/mcp.json`):

```json
{
  "servers": {
    "freestyle": {
      "type": "http",
      "url": "https://freestyle.val.run"
    }
  }
}
```

The server reads its API key from the `FREESTYLE_API_KEY` environment variable
(set on the Val Town deployment), so the client does not need to send an
`Authorization` header.

Or with `mcp-remote`:

```bash
npx mcp-remote https://freestyle.val.run
```

## Tools

### VMs

| Tool                        | Description                                        |
| --------------------------- | -------------------------------------------------- |
| `vm_create`       | Create a VM (name, baseImage, vcpu/mem/storage, snapshot) |
| `vm_list`         | List all VMs                                        |
| `vm_get`          | Get a VM's state and metadata                       |
| `vm_delete`       | Permanently delete a VM                             |
| `vm_exec`         | Run a shell command in a VM and wait for it         |
| `vm_start`        | Start a VM (optional idle timeout)                  |
| `vm_stop`         | Gracefully stop a VM                                |
| `vm_resize`       | Resize CPU / memory / root filesystem               |
| `vm_fork`         | Fork a VM from its current state                    |
| `vm_read_file`    | Read a file from a VM                               |
| `vm_write_file`   | Write a file to a VM                                |

### Git

| Tool                          | Description                              |
| ----------------------------- | ---------------------------------------- |
| `git_repo_create`   | Create a repo (optionally from a source) |
| `git_repo_list`     | List repos with pagination               |
| `git_repo_delete`   | Delete a repo permanently                |
| `git_contents_get`  | Get file/dir contents at a revision      |
| `git_commit_create` | Create a commit with file changes        |
| `git_branches_list` | List branches                            |
| `git_branch_create` | Create a branch from a SHA               |
| `git_commits_list`  | List commits                             |
| `git_search`        | Full-text search across a repo           |

### Docs

| Tool                 | Description                                      |
| -------------------- | ------------------------------------------------ |
| `docs_bash`| Run bash against the Freestyle docs filesystem   |

## Project layout

```
main.ts                 MCP server + Streamable HTTP transport
src/freestyle.ts        Freestyle REST client (https://api.freestyle.sh)
src/tools/vms.ts        VM tool definitions
src/tools/git.ts        Git tool definitions
src/tools/docs.ts       Docs bash tool
src/tools/helpers.ts    Tool result helpers
```

## References

- Freestyle docs: https://www.freestyle.sh/docs
- Freestyle docs bash API: https://www.freestyle.sh/docs/bash
- `freestyle` npm package (REST mapping): https://www.npmjs.com/package/freestyle
