import { readFile } from "node:fs/promises";
import type { Express, Request } from "express";
import { appendWorkerLog, claimBuildForWorker, completeWorkerBuild, getWorkerSigningMaterial, heartbeatWorker, uploadWorkerArtifact } from "./buildforge-db";

function readWorkerToken(request: Request) {
  const authorization = request.header("authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7).trim();
  const bodyToken = typeof request.body?.token === "string" ? request.body.token : "";
  return bodyToken.trim();
}

function sendError(res: Parameters<Express["post"]>[1] extends (req: any, res: infer R) => any ? R : never, error: unknown) {
  const message = error instanceof Error ? error.message : "Operação de worker inválida.";
  res.status(message.includes("inválido") || message.includes("não está atribuído") ? 401 : 400).json({ error: message });
}

function getPublicBaseUrl(request: Request) {
  return process.env.PUBLIC_APP_URL?.replace(/\/$/, "") || `${request.protocol}://${request.get("host")}`;
}

async function loadDistributedWorkerScript() {
  const candidates = [new URL("../worker/buildforge-worker.mjs", import.meta.url), new URL("./worker/buildforge-worker.mjs", import.meta.url)];
  for (const candidate of candidates) {
    try { return await readFile(candidate, "utf8"); } catch { /* Attempt next location. */ }
  }
  throw new Error("O script do worker não está disponível neste ambiente.");
}

function doctorScript() {
  return `#!/usr/bin/env node
const { execFileSync } = require("node:child_process");
const checks = [["Node.js", "node", ["--version"]], ["Git", "git", ["--version"]], ["Java/JDK", "java", ["-version"]], ["Flutter", "flutter", ["--version"]], ["Android SDK", process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || "sdkmanager", ["--version"]]];
console.log("\\nBuildForge Doctor — diagnóstico do ambiente\\n");
let failed = 0;
for (const [name, command, args] of checks) { try { const output = execFileSync(command, args, { stdio: ["ignore", "pipe", "pipe"] }).toString().trim().split("\\n")[0]; console.log("✓ " + name + ": " + (output || "encontrado")); } catch { failed++; console.log("✗ " + name + ": não encontrado ou não configurado"); } }
console.log("\\n" + (failed ? "Corrija os itens marcados antes de executar builds reais." : "Ambiente pronto para conectar o worker."));
process.exitCode = failed ? 1 : 0;
`;
}

function githubWorkflow(baseUrl: string) {
  return [
    "name: BuildForge Worker", "on:", "  workflow_dispatch:", "  schedule:", "    - cron: \"*/15 * * * *\"", "jobs:", "  worker:", "    runs-on: ubuntu-latest", "    timeout-minutes: 55", "    steps:", "      - uses: actions/checkout@v4", "      - uses: actions/setup-java@v4", "        with: { distribution: temurin, java-version: \"17\" }", "      - uses: subosito/flutter-action@v2", "        with: { flutter-version: stable }", "      - uses: actions/setup-node@v4", "        with: { node-version: \"20\" }", "      - name: Run BuildForge worker", "        env:", "          BUILDFORGE_TOKEN: ${{ secrets.BUILDFORGE_TOKEN }}", "        run: |", `          curl -fsSL ${baseUrl}/api/worker/script -o buildforge-worker.mjs`, `          node buildforge-worker.mjs --server ${baseUrl} --token \"$BUILDFORGE_TOKEN\"`, "",
  ].join("\n");
}

export function registerWorkerApi(app: Express) {
  app.get("/api/worker/script", async (_req, res) => {
    try { res.type("application/javascript").setHeader("Content-Disposition", "attachment; filename=buildforge-worker.mjs").send(await loadDistributedWorkerScript()); }
    catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : "Não foi possível entregar o agente." }); }
  });
  app.get("/api/worker/doctor", (_req, res) => res.type("application/javascript").setHeader("Content-Disposition", "attachment; filename=buildforge-doctor.js").send(doctorScript()));
  app.get("/api/worker/github-workflow", (req, res) => res.type("text/yaml").setHeader("Content-Disposition", "attachment; filename=buildforge-worker.yml").send(githubWorkflow(getPublicBaseUrl(req))));
  app.get("/api/worker/installer", (req, res) => {
    const token = typeof req.query.token === "string" ? req.query.token.trim() : "";
    const os = req.query.os === "windows" ? "windows" : req.query.os === "mac" ? "mac" : "linux";
    if (token.length < 24) return res.status(400).json({ error: "Informe o token recém-gerado para criar o instalador." });
    const baseUrl = getPublicBaseUrl(req);
    if (os === "windows") {
      const script = `@echo off\r\nsetlocal\r\nset "SERVER=${baseUrl}"\r\nset "TOKEN=${token}"\r\nwhere node >nul 2>nul || (start "" "https://nodejs.org" & echo Instale Node.js e execute este arquivo novamente. & pause & exit /b 1)\r\necho Baixando agente BuildForge...\r\npowershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing '%SERVER%/api/worker/script' -OutFile '%~dp0buildforge-worker.mjs'"\r\nnode "%~dp0buildforge-worker.mjs" --server "%SERVER%" --token "%TOKEN%"\r\npause\r\n`;
      return res.type("text/plain").setHeader("Content-Disposition", "attachment; filename=BuildForge-Worker.bat").send(script);
    }
    const script = `#!/usr/bin/env bash\nset -euo pipefail\nSERVER='${baseUrl}'\nTOKEN='${token}'\ncommand -v node >/dev/null || { echo 'Instale Node.js 20+ e execute este arquivo novamente.'; exit 1; }\ncurl -fsSL "$SERVER/api/worker/script" -o "$HOME/buildforge-worker.mjs"\nnode "$HOME/buildforge-worker.mjs" --server "$SERVER" --token "$TOKEN"\n`;
    return res.type("text/plain").setHeader("Content-Disposition", `attachment; filename=BuildForge-Worker.${os === "mac" ? "command" : "sh"}`).send(script);
  });

  app.post("/api/worker/heartbeat", async (req, res) => {
    try { const token = readWorkerToken(req); if (!token) return res.status(401).json({ error: "Token de worker ausente." }); const activeBuilds = typeof req.body?.activeBuilds === "number" ? req.body.activeBuilds : undefined; return res.json(await heartbeatWorker({ token, activeBuilds })); }
    catch (error) { return sendError(res as never, error); }
  });
  app.post("/api/worker/claim", async (req, res) => {
    try { const token = readWorkerToken(req); if (!token) return res.status(401).json({ error: "Token de worker ausente." }); return res.json(await claimBuildForWorker(token)); }
    catch (error) { return sendError(res as never, error); }
  });
  app.post("/api/worker/log", async (req, res) => {
    try { const token = readWorkerToken(req); const { buildId, sequence, level, message, progress } = req.body ?? {}; if (!token || !Number.isInteger(buildId) || !Number.isInteger(sequence) || typeof level !== "string" || typeof message !== "string") return res.status(400).json({ error: "Payload de log inválido." }); await appendWorkerLog({ token, buildId, sequence, level, message, progress: typeof progress === "number" ? progress : undefined }); return res.json({ success: true }); }
    catch (error) { return sendError(res as never, error); }
  });
  app.post("/api/worker/complete", async (req, res) => {
    try { const token = readWorkerToken(req); const { buildId, status, summary, appliedFixIds, artifactId } = req.body ?? {}; if (!token || !Number.isInteger(buildId) || !["succeeded", "failed", "cancelled"].includes(status)) return res.status(400).json({ error: "Payload de conclusão inválido." }); await completeWorkerBuild({ token, buildId, status, summary: typeof summary === "string" ? summary : undefined, appliedFixIds: Array.isArray(appliedFixIds) ? appliedFixIds.filter((id) => Number.isInteger(id)).slice(0, 3) : undefined, artifactId: Number.isInteger(artifactId) ? artifactId : undefined }); return res.json({ success: true }); }
    catch (error) { return sendError(res as never, error); }
  });
  app.post("/api/worker/artifact", async (req, res) => {
    try { const token = readWorkerToken(req); const { buildId, type, filename, contentType, contentBase64 } = req.body ?? {}; if (!token || !Number.isInteger(buildId) || !["apk", "aab", "log"].includes(type) || typeof filename !== "string" || typeof contentType !== "string" || typeof contentBase64 !== "string") return res.status(400).json({ error: "Payload de artefato inválido." }); return res.json(await uploadWorkerArtifact({ token, buildId, type, filename, contentType, contentBase64 })); }
    catch (error) { return sendError(res as never, error); }
  });
  app.post("/api/worker/signing", async (req, res) => {
    try { const token = readWorkerToken(req); const { buildId } = req.body ?? {}; if (!token || !Number.isInteger(buildId)) return res.status(400).json({ error: "Payload de assinatura inválido." }); return res.json(await getWorkerSigningMaterial({ token, buildId })); }
    catch (error) { return sendError(res as never, error); }
  });
}
