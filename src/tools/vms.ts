/**
 * MCP tools for Freestyle VMs.
 *
 * REST endpoints (base: https://api.freestyle.sh):
 *   POST   /v1/vms                          create a VM
 *   GET    /v1/vms                          list VMs
 *   GET    /v1/vms/{vm_id}                  get VM info
 *   DELETE /v1/vms/{vm_id}                  delete a VM
 *   POST   /v1/vms/{vm_id}/exec-await       run a command and wait
 *   POST   /v1/vms/{vm_id}/start            start a VM
 *   POST   /v1/vms/{vm_id}/stop             stop a VM
 *   POST   /v1/vms/{id}/resize              resize a VM
 *   POST   /v1/vms/{vm_id}/fork             fork a VM
 *   GET    /v1/vms/{vm_id}/files/{filepath} read a file
 *   PUT    /v1/vms/{vm_id}/files/{filepath} write a file
 */

import { z } from "npm:zod@4";
import type { McpServer } from "npm:@modelcontextprotocol/server";
import type { FreestyleClient } from "../freestyle.ts";
import { err, ok } from "./helpers.ts";

export function registerVmTools(server: McpServer, client: FreestyleClient): void {
  // ---------------------------------------------------------------------------
  // Create a VM
  // ---------------------------------------------------------------------------
  server.registerTool(
    "vm_create",
    {
      title: "Create a Freestyle VM",
      description:
        "Create a new Freestyle Linux VM. VMs start with 4 vCPU, 8 GB RAM and a " +
        "20 GB root filesystem by default; pass template options to size it. " +
        "Returns the VM id, domains and state.",
      inputSchema: z.object({
        name: z.string().optional().describe("Optional human-readable name for the VM."),
        baseImage: z
          .string()
          .optional()
          .describe("Base image to boot from (e.g. a Docker image reference)."),
        vcpuCount: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Number of vCPUs (must be a power of two)."),
        memSizeGb: z
          .number()
          .positive()
          .optional()
          .describe("Memory in GB (must be a power of two)."),
        rootfsSizeGb: z
          .number()
          .positive()
          .optional()
          .describe("Root filesystem size in GB."),
        snapshotId: z
          .string()
          .optional()
          .describe("Create the VM from an existing snapshot id."),
      }),
    },
    async (args) => {
      try {
        const body: Record<string, unknown> = {};
        if (args.name) body.name = args.name;
        if (args.snapshotId) body.snapshotId = args.snapshotId;

        const template: Record<string, unknown> = {};
        if (args.baseImage) template.baseImage = args.baseImage;
        if (args.vcpuCount) template.vcpuCount = args.vcpuCount;
        if (args.memSizeGb) template.memSizeGb = args.memSizeGb;
        if (args.rootfsSizeGb) template.rootfsSizeGb = args.rootfsSizeGb;
        if (Object.keys(template).length > 0) body.template = template;

        const result = await client.post("/v1/vms", { body });
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // List VMs
  // ---------------------------------------------------------------------------
  server.registerTool(
    "vm_list",
    {
      title: "List Freestyle VMs",
      description: "List all Freestyle VMs with their state and metadata.",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const result = await client.get("/v1/vms");
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Get VM info
  // ---------------------------------------------------------------------------
  server.registerTool(
    "vm_get",
    {
      title: "Get Freestyle VM info",
      description: "Get the current state and metadata of a single Freestyle VM.",
      inputSchema: z.object({
        vmId: z.string().describe("The id of the VM."),
      }),
    },
    async ({ vmId }) => {
      try {
        const result = await client.get("/v1/vms/{vm_id}", {
          params: { vm_id: vmId },
        });
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Delete a VM
  // ---------------------------------------------------------------------------
  server.registerTool(
    "vm_delete",
    {
      title: "Delete a Freestyle VM",
      description:
        "Permanently delete a Freestyle VM. Keep source code and important state " +
        "in Freestyle Git or another durable system before deleting.",
      inputSchema: z.object({
        vmId: z.string().describe("The id of the VM to delete."),
      }),
    },
    async ({ vmId }) => {
      try {
        const result = await client.delete("/v1/vms/{vm_id}", {
          params: { vm_id: vmId },
        });
        return ok(result ?? { deleted: true, vmId });
      } catch (error) {
        return err(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Execute a command in a VM
  // ---------------------------------------------------------------------------
  server.registerTool(
    "vm_exec",
    {
      title: "Execute a command in a Freestyle VM",
      description:
        "Run a shell command inside a Freestyle VM and wait for it to complete. " +
        "Returns stdout, stderr and the exit status code.",
      inputSchema: z.object({
        vmId: z.string().describe("The id of the VM to run the command in."),
        command: z.string().describe("The shell command to execute."),
        timeoutMs: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Optional timeout in milliseconds."),
      }),
    },
    async ({ vmId, command, timeoutMs }) => {
      try {
        const result = await client.post("/v1/vms/{vm_id}/exec-await", {
          params: { vm_id: vmId },
          body: {
            command,
            terminal: null,
            timeoutMs: timeoutMs ?? null,
          },
        });
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Start a VM
  // ---------------------------------------------------------------------------
  server.registerTool(
    "vm_start",
    {
      title: "Start a Freestyle VM",
      description:
        "Start a stopped Freestyle VM. Optionally configure an idle timeout so " +
        "Freestyle reclaims the VM when it has no network activity.",
      inputSchema: z.object({
        vmId: z.string().describe("The id of the VM to start."),
        idleTimeoutSeconds: z
          .number()
          .int()
          .positive()
          .nullable()
          .optional()
          .describe(
            "Idle timeout in seconds. Set to null for workloads that should stay " +
            "running until stopped or deleted.",
          ),
      }),
    },
    async ({ vmId, idleTimeoutSeconds }) => {
      try {
        const body: Record<string, unknown> = {};
        if (idleTimeoutSeconds !== undefined) body.idleTimeoutSeconds = idleTimeoutSeconds;
        const result = await client.post("/v1/vms/{vm_id}/start", {
          params: { vm_id: vmId },
          body,
        });
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Stop a VM
  // ---------------------------------------------------------------------------
  server.registerTool(
    "vm_stop",
    {
      title: "Stop a Freestyle VM",
      description:
        "Gracefully stop a Freestyle VM. Disk state is preserved but memory is not.",
      inputSchema: z.object({
        vmId: z.string().describe("The id of the VM to stop."),
      }),
    },
    async ({ vmId }) => {
      try {
        const result = await client.post("/v1/vms/{vm_id}/stop", {
          params: { vm_id: vmId },
        });
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Resize a VM
  // ---------------------------------------------------------------------------
  server.registerTool(
    "vm_resize",
    {
      title: "Resize a Freestyle VM",
      description:
        "Resize a Freestyle VM's CPU, memory and/or root filesystem. cpu and memory " +
        "must be powers of two; storage can grow but cannot shrink.",
      inputSchema: z.object({
        vmId: z.string().describe("The id of the VM to resize."),
        cpu: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Number of vCPUs (power of two)."),
        memory: z
          .number()
          .positive()
          .optional()
          .describe("Memory in GB (power of two)."),
        storage: z
          .number()
          .positive()
          .optional()
          .describe("Root filesystem size in GB (can only grow)."),
      }),
    },
    async ({ vmId, cpu, memory, storage }) => {
      try {
        const body: Record<string, unknown> = {};
        if (cpu !== undefined) body.vcpuCount = cpu;
        if (memory !== undefined) body.memSizeGb = memory;
        if (storage !== undefined) body.rootfsSizeGb = storage;
        const result = await client.post("/v1/vms/{id}/resize", {
          params: { id: vmId },
          body,
        });
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Fork a VM
  // ---------------------------------------------------------------------------
  server.registerTool(
    "vm_fork",
    {
      title: "Fork a Freestyle VM",
      description:
        "Fork a Freestyle VM from its current running state, e.g. to explore " +
        "multiple branches of work in parallel.",
      inputSchema: z.object({
        vmId: z.string().describe("The id of the VM to fork."),
        count: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Number of forks to create."),
        persistence: z
          .object({
            type: z.enum(["ephemeral", "persistent"]).optional(),
          })
          .optional()
          .describe("Fork persistence configuration."),
      }),
    },
    async ({ vmId, count, persistence }) => {
      try {
        const body: Record<string, unknown> = {};
        if (count !== undefined) body.count = count;
        if (persistence !== undefined) body.persistence = persistence;
        const result = await client.post("/v1/vms/{vm_id}/fork", {
          params: { vm_id: vmId },
          body,
        });
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Read a file from a VM
  // ---------------------------------------------------------------------------
  server.registerTool(
    "vm_read_file",
    {
      title: "Read a file from a Freestyle VM",
      description: "Read the contents of a file inside a Freestyle VM.",
      inputSchema: z.object({
        vmId: z.string().describe("The id of the VM."),
        filepath: z.string().describe("Absolute path of the file to read, e.g. /tmp/hello.txt."),
      }),
    },
    async ({ vmId, filepath }) => {
      try {
        const result = await client.get("/v1/vms/{vm_id}/files/{filepath}", {
          params: { vm_id: vmId, filepath },
        });
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Write a file to a VM
  // ---------------------------------------------------------------------------
  server.registerTool(
    "vm_write_file",
    {
      title: "Write a file to a Freestyle VM",
      description: "Write text content to a file inside a Freestyle VM.",
      inputSchema: z.object({
        vmId: z.string().describe("The id of the VM."),
        filepath: z.string().describe("Absolute path of the file to write, e.g. /tmp/hello.txt."),
        content: z.string().describe("The text content to write."),
      }),
    },
    async ({ vmId, filepath, content }) => {
      try {
        const result = await client.put("/v1/vms/{vm_id}/files/{filepath}", {
          params: { vm_id: vmId, filepath },
          body: { content },
        });
        return ok(result ?? { written: true, filepath });
      } catch (error) {
        return err(error);
      }
    },
  );
}