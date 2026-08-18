/**
 * MCP tools for Freestyle Git.
 *
 * REST endpoints (base: https://api.freestyle.sh):
 *   POST   /git/v1/repo                          create a repository
 *   GET    /git/v1/repo                          list repositories
 *   DELETE /git/v1/repo/{repo}                   delete a repository
 *   GET    /git/v1/repo/{repo}/contents/{path}   get file/dir contents
 *   POST   /git/v1/repo/{repo}/commits           create a commit
 *   GET    /git/v1/repo/{repo}/git/refs/heads/   list branches
 *   POST   /git/v1/repo/{repo}/git/refs/heads/{*branch}  create a branch
 *   GET    /git/v1/repo/{repo}/git/commits       list commits
 *   GET    /git/v1/repo/{repo}/search            full-text search
 */

import { z } from "npm:zod@4";
import type { McpServer } from "npm:@modelcontextprotocol/server";
import type { FreestyleClient } from "../freestyle.ts";
import { err, ok } from "./helpers.ts";

export function registerGitTools(server: McpServer, client: FreestyleClient): void {
  // ---------------------------------------------------------------------------
  // Create a repository
  // ---------------------------------------------------------------------------
  server.registerTool(
    "freestyle_git_repo_create",
    {
      title: "Create a Freestyle Git repository",
      description:
        "Create a new Freestyle Git repository, optionally from a source " +
        "repository (e.g. a GitHub URL) to preserve its history.",
      inputSchema: z.object({
        name: z.string().optional().describe("Optional repository name."),
        public: z
          .boolean()
          .optional()
          .describe("Whether the repository is public (cloneable without auth)."),
        defaultBranch: z.string().optional().describe("Default branch name, e.g. main."),
        sourceUrl: z
          .string()
          .optional()
          .describe("Source repository URL to fork from, e.g. https://github.com/owner/repo.git."),
        sourceRev: z
          .string()
          .optional()
          .describe("Revision (branch/tag/commit) of the source repository."),
      }),
    },
    async (args) => {
      try {
        const body: Record<string, unknown> = {};
        if (args.name) body.name = args.name;
        if (args.public !== undefined) body.public = args.public;
        if (args.defaultBranch) body.defaultBranch = args.defaultBranch;
        if (args.sourceUrl || args.sourceRev) {
          body.source = {
            ...(args.sourceUrl ? { url: args.sourceUrl } : {}),
            ...(args.sourceRev ? { rev: args.sourceRev } : {}),
          };
        }
        const result = await client.post("/git/v1/repo", { body });
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // List repositories
  // ---------------------------------------------------------------------------
  server.registerTool(
    "freestyle_git_repo_list",
    {
      title: "List Freestyle Git repositories",
      description: "List Freestyle Git repositories with pagination.",
      inputSchema: z.object({
        limit: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Maximum number of repositories to return (default 10)."),
        cursor: z
          .string()
          .optional()
          .describe("Pagination cursor returned by a previous list call."),
      }),
    },
    async ({ limit, cursor }) => {
      try {
        const result = await client.get("/git/v1/repo", {
          query: { limit, offset: cursor },
        });
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Delete a repository
  // ---------------------------------------------------------------------------
  server.registerTool(
    "freestyle_git_repo_delete",
    {
      title: "Delete a Freestyle Git repository",
      description:
        "Permanently delete a Freestyle Git repository and all of its Git data.",
      inputSchema: z.object({
        repoId: z.string().describe("The id of the repository to delete."),
      }),
    },
    async ({ repoId }) => {
      try {
        const result = await client.delete("/git/v1/repo/{repo}", {
          params: { repo: repoId },
        });
        return ok(result ?? { deleted: true, repoId });
      } catch (error) {
        return err(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Get repository contents
  // ---------------------------------------------------------------------------
  server.registerTool(
    "freestyle_git_contents_get",
    {
      title: "Get Freestyle Git repository contents",
      description:
        "Get the contents of a file or directory in a Freestyle Git repository " +
        "at a given revision. File contents are base64-encoded; directory " +
        "responses include nested entries.",
      inputSchema: z.object({
        repoId: z.string().describe("The id of the repository."),
        path: z
          .string()
          .optional()
          .describe("Path to the file or directory (empty string for root)."),
        rev: z
          .string()
          .optional()
          .describe("Revision (branch, tag or commit SHA). Defaults to HEAD."),
      }),
    },
    async ({ repoId, path, rev }) => {
      try {
        const result = await client.get("/git/v1/repo/{repo}/contents/{path}", {
          params: { repo: repoId, path: path ?? "" },
          query: { rev },
        });
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Create a commit
  // ---------------------------------------------------------------------------
  server.registerTool(
    "freestyle_git_commit_create",
    {
      title: "Create a commit in a Freestyle Git repository",
      description:
        "Create a commit by writing file changes to a Freestyle Git repository. " +
        "Files can be added, modified (text content) or deleted.",
      inputSchema: z.object({
        repoId: z.string().describe("The id of the repository."),
        message: z.string().describe("Commit message."),
        branch: z.string().optional().describe("Branch to commit to (defaults to the default branch)."),
        files: z
          .array(
            z.object({
              path: z.string().describe("File path within the repository."),
              content: z
                .string()
                .optional()
                .describe("Text content of the file (omit when deleting)."),
              deleted: z
                .boolean()
                .optional()
                .describe("Set true to delete the file."),
            }),
          )
          .describe("File changes to include in the commit."),
        author: z
          .object({
            name: z.string().optional(),
            email: z.string().optional(),
          })
          .optional()
          .describe("Optional commit author."),
      }),
    },
    async ({ repoId, message, branch, files, author }) => {
      try {
        const result = await client.post("/git/v1/repo/{repo}/commits", {
          params: { repo: repoId },
          body: {
            message,
            files,
            ...(branch ? { branch } : {}),
            ...(author ? { author } : {}),
          },
        });
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // List branches
  // ---------------------------------------------------------------------------
  server.registerTool(
    "freestyle_git_branches_list",
    {
      title: "List branches in a Freestyle Git repository",
      description: "List all branches in a Freestyle Git repository.",
      inputSchema: z.object({
        repoId: z.string().describe("The id of the repository."),
      }),
    },
    async ({ repoId }) => {
      try {
        const result = await client.get("/git/v1/repo/{repo}/git/refs/heads/", {
          params: { repo: repoId },
        });
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Create a branch
  // ---------------------------------------------------------------------------
  server.registerTool(
    "freestyle_git_branch_create",
    {
      title: "Create a branch in a Freestyle Git repository",
      description:
        "Create a new branch in a Freestyle Git repository, optionally from a " +
        "specific commit SHA (defaults to the default branch).",
      inputSchema: z.object({
        repoId: z.string().describe("The id of the repository."),
        name: z.string().describe("Name of the branch to create, e.g. feature/new-flow."),
        sha: z
          .string()
          .optional()
          .describe("Optional commit SHA to branch from."),
      }),
    },
    async ({ repoId, name, sha }) => {
      try {
        const result = await client.post("/git/v1/repo/{repo}/git/refs/heads/{*branch}", {
          params: { repo: repoId, branch: name },
          body: { ...(sha ? { sha } : {}) },
        });
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // List commits
  // ---------------------------------------------------------------------------
  server.registerTool(
    "freestyle_git_commits_list",
    {
      title: "List commits in a Freestyle Git repository",
      description: "List commits in a Freestyle Git repository with optional filtering.",
      inputSchema: z.object({
        repoId: z.string().describe("The id of the repository."),
        branch: z.string().optional().describe("Filter commits by branch."),
        limit: z.number().int().positive().optional().describe("Maximum number of commits to return."),
      }),
    },
    async ({ repoId, branch, limit }) => {
      try {
        const result = await client.get("/git/v1/repo/{repo}/git/commits", {
          params: { repo: repoId },
          query: { branch, limit },
        });
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Search a repository
  // ---------------------------------------------------------------------------
  server.registerTool(
    "freestyle_git_search",
    {
      title: "Search a Freestyle Git repository",
      description:
        "Full-text search across all files in a Freestyle Git repository, " +
        "returning matching lines with context.",
      inputSchema: z.object({
        repoId: z.string().describe("The id of the repository."),
        query: z.string().describe("The text to search for in file contents."),
        rev: z
          .string()
          .optional()
          .describe("Revision (branch, tag or commit SHA) to search. Defaults to HEAD."),
        pathPattern: z
          .string()
          .optional()
          .describe("Glob pattern to filter file paths, e.g. *.ts or src/**."),
        maxResults: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Maximum number of matching files (default 100, max 1000)."),
      }),
    },
    async ({ repoId, query, rev, pathPattern, maxResults }) => {
      try {
        const result = await client.get("/git/v1/repo/{repo}/search", {
          params: { repo: repoId },
          query: {
            query,
            ref: rev,
            pathPattern,
            maxResults,
          },
        });
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );
}