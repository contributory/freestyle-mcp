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

```bash
export FREESTYLE_API_KEY="your-api-key"
deno run --allow-net --allow-env --allow-import main.ts
```

The server listens on `http://localhost:3000`. Override the port with `PORT`:

```bash
PORT=8080 FREESTYLE_API_KEY="your-api-key" deno run --allow-net --allow-env --allow-import main.ts
```

> `--allow-import` is only needed because `deno.json` pulls in the Val Town
> type definitions. Remove the `types` entry from `deno.json` if you don't need
> them, then `--allow-import` can be dropped.

## Connect an MCP client

The endpoint is `http://localhost:3000` (or your `PORT`). Configure it in any
MCP client that supports the Streamable HTTP transport, for example in VS Code
(`.vscode/mcp.json`):

```json
{
  "servers": {
    "freestyle": {
      "type": "http",
      "url": "http://localhost:3000",
      "headers": {
        "Authorization": "Bearer your-api-key"
      }
    }
  }
}
```

Or with `mcp-remote`:

```bash
npx mcp-remote http://localhost:3000
```

## Tools

### VMs

| Tool                        | Description                                        |
| --------------------------- | -------------------------------------------------- |
| `freestyle_vm_create`       | Create a VM (name, baseImage, vcpu/mem/storage, snapshot) |
| `freestyle_vm_list`         | List all VMs                                        |
| `freestyle_vm_get`          | Get a VM's state and metadata                       |
| `freestyle_vm_delete`       | Permanently delete a VM                             |
| `freestyle_vm_exec`         | Run a shell command in a VM and wait for it         |
| `freestyle_vm_start`        | Start a VM (optional idle timeout)                  |
| `freestyle_vm_stop`         | Gracefully stop a VM                                |
| `freestyle_vm_resize`       | Resize CPU / memory / root filesystem               |
| `freestyle_vm_fork`         | Fork a VM from its current state                    |
| `freestyle_vm_read_file`    | Read a file from a VM                               |
| `freestyle_vm_write_file`   | Write a file to a VM                                |

### Git

| Tool                          | Description                              |
| ----------------------------- | ---------------------------------------- |
| `freestyle_git_repo_create`   | Create a repo (optionally from a source) |
| `freestyle_git_repo_list`     | List repos with pagination               |
| `freestyle_git_repo_delete`   | Delete a repo permanently                |
| `freestyle_git_contents_get`  | Get file/dir contents at a revision      |
| `freestyle_git_commit_create` | Create a commit with file changes        |
| `freestyle_git_branches_list` | List branches                            |
| `freestyle_git_branch_create` | Create a branch from a SHA               |
| `freestyle_git_commits_list`  | List commits                             |
| `freestyle_git_search`        | Full-text search across a repo           |

### Docs

| Tool                 | Description                                      |
| -------------------- | ------------------------------------------------ |
| `freestyle_docs_bash`| Run bash against the Freestyle docs filesystem   |

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
