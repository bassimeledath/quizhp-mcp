#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createQuizServer } from "./quiz-server.js";
import { GameStore } from "./game-store.js";
import { getTemplatesForQuestions } from "./template-store.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function log(message: string, data?: unknown): void {
  const ts = new Date().toISOString();
  if (data !== undefined) {
    console.error(`[quizhp-stdio ${ts}] ${message}`, JSON.stringify(data));
  } else {
    console.error(`[quizhp-stdio ${ts}] ${message}`);
  }
}

/** Load the bundled single-file HTML widget */
async function getWidgetHtml(): Promise<string> {
  const htmlPath = join(__dirname, "..", "view", "index.html");
  try {
    return await readFile(htmlPath, "utf-8");
  } catch {
    log("Widget HTML not found at " + htmlPath);
    return `<!DOCTYPE html><html><body><p>Quiz widget not built. Run <code>npm run build:view</code></p></body></html>`;
  }
}

async function main(): Promise<void> {
  log("Starting stdio MCP server");
  const gameStore = new GameStore();

  const connectDomains = (process.env.CONNECT_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);

  const server = createQuizServer({ gameStore, getWidgetHtml, getTemplates: getTemplatesForQuestions, connectDomains });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  log("Server ready");

  process.on("unhandledRejection", (err) => {
    log("Unhandled rejection", { error: err instanceof Error ? err.message : String(err) });
  });

  process.on("uncaughtException", (err) => {
    log("Uncaught exception", { error: err.message });
  });

  process.on("SIGINT", async () => {
    await server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await server.close();
    process.exit(0);
  });

  process.stdin.resume();

  const keepalive = setInterval(() => {}, 30000);
  keepalive.unref();

  process.stdin.on("end", () => {
    clearInterval(keepalive);
  });

  process.stdin.on("error", (err) => {
    log("stdin error", { error: err.message });
  });
}

main().catch((error) => {
  log("Failed to start", { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
