#!/usr/bin/env node
import { detectProject } from "./project-detector.mjs";
import { resolveBuildStrategy } from "./build-strategies.mjs";

const source = process.argv[2];
if (!source) throw new Error("Uso: node worker/inspect-project.mjs <diretório> [apk|aab]");
const artifact = process.argv[3] === "aab" ? "aab" : "apk";
const project = await detectProject(source);
const strategy = resolveBuildStrategy(project, artifact);
process.stdout.write(`${JSON.stringify({ framework: project.framework, projectRoot: project.projectRoot, relativeRoot: project.relativeRoot, strategy: strategy.id, packageManager: project.packageManager, lockfile: project.lockfile, artifact, confidence: Number(project.confidence.toFixed(3)), evidence: project.evidence, versions: project.versions, steps: strategy.steps, searchRoots: strategy.searchRoots, unsupportedReason: strategy.unsupportedReason ?? null }, null, 2)}\n`);
