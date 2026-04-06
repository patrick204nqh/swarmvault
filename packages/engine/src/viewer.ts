import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import mime from "mime-types";
import { loadVaultConfig } from "./config.js";
import { fileExists } from "./utils.js";

export async function startGraphServer(rootDir: string, port?: number): Promise<{ port: number; close: () => Promise<void> }> {
  const { config, paths } = await loadVaultConfig(rootDir);
  const effectivePort = port ?? config.viewer.port;

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `localhost:${effectivePort}`}`);
    if (url.pathname === "/api/graph") {
      if (!(await fileExists(paths.graphPath))) {
        response.writeHead(404, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "Graph artifact not found. Run `swarmvault compile` first." }));
        return;
      }
      response.writeHead(200, { "content-type": "application/json" });
      response.end(await fs.readFile(paths.graphPath, "utf8"));
      return;
    }

    const relativePath = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    const target = path.join(paths.viewerDistDir, relativePath);
    const fallback = path.join(paths.viewerDistDir, "index.html");
    const filePath = (await fileExists(target)) ? target : fallback;
    if (!(await fileExists(filePath))) {
      response.writeHead(503, { "content-type": "text/plain" });
      response.end("Viewer build not found. Run `pnpm build` first.");
      return;
    }

    response.writeHead(200, { "content-type": mime.lookup(filePath) || "text/plain" });
    response.end(await fs.readFile(filePath));
  });

  await new Promise<void>((resolve) => {
    server.listen(effectivePort, resolve);
  });

  return {
    port: effectivePort,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  };
}
