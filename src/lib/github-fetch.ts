import https from "node:https";
import zlib from "node:zlib";

export interface RepoFile {
  path: string;
  content: string;
}

const TEXT_EXTENSIONS = [".kt", ".kts", ".java", ".xml", ".gradle", ".pro", ".properties", ".toml", ".md"];
const BINARY_EXTENSIONS = [".jar", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".ttf", ".otf", ".so", ".keystore", ".jks", ".zip"];
const EXCLUDED_PATH_SEGMENTS = ["/build/", ".git/", ".gradle/", ".idea/", "gradle/wrapper/"];

const TOTAL_CHAR_BUDGET = 60_000;
const MAX_FILE_CHARS = 60_000; // per-file cap before it even enters prioritization

function isExcludedPath(p: string): boolean {
  const normalized = "/" + p.replace(/\\/g, "/");
  if (normalized.startsWith("/build/") || p.startsWith("build/")) return true;
  return EXCLUDED_PATH_SEGMENTS.some((seg) => normalized.includes("/" + seg) || normalized.startsWith("/" + seg));
}

function hasTextExtension(p: string): boolean {
  const lower = p.toLowerCase();
  return TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function hasBinaryExtension(p: string): boolean {
  const lower = p.toLowerCase();
  return BINARY_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

// Extrai um .tar (buffer ja descomprimido), em memoria — mesma logica do
// extractTar do worker (src/app/api/worker/script/route.ts), adaptada pra
// nao tocar em disco (essa busca roda no servidor, nao numa maquina do usuario).
function extractTarInMemory(buf: Buffer): { path: string; buffer: Buffer }[] {
  const out: { path: string; buffer: Buffer }[] = [];
  let off = 0;
  while (off + 512 <= buf.length) {
    const header = buf.subarray(off, off + 512);
    if (header.every((b) => b === 0)) break;
    let name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
    const prefix = header.subarray(345, 500).toString("utf8").replace(/\0.*$/, "");
    if (prefix) name = prefix + "/" + name;
    const sizeStr = header.subarray(124, 136).toString("utf8").replace(/\0.*$/, "").trim();
    const size = parseInt(sizeStr, 8) || 0;
    const type = String.fromCharCode(header[156]);
    off += 512;
    const data = buf.subarray(off, off + size);
    off += Math.ceil(size / 512) * 512;
    if (!name || type === "5") continue; // pula diretorios
    if (type === "0" || type === "\0" || type === "") {
      out.push({ path: name, buffer: Buffer.from(data) });
    }
  }
  return out;
}

function fetchBuffer(url: string, headers: Record<string, string>, redirects: number): Promise<Buffer | null> {
  return new Promise((resolve) => {
    https
      .get(url, { headers }, (res) => {
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location && redirects < 5) {
          res.resume();
          resolve(fetchBuffer(res.headers.location, headers, redirects + 1));
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          resolve(null);
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", () => resolve(null));
  });
}

// Pontua um arquivo por relevancia pra recriacao web (maior = mais prioritario).
function priorityOf(p: string, content: string): number {
  const lower = p.toLowerCase();
  const base = p.split("/").pop() || p;
  if (base === "AndroidManifest.xml") return 100;
  if (/\/app\/build\.gradle(\.kts)?$/.test("/" + lower) || base === "build.gradle" || base === "build.gradle.kts") return 90;
  if (/strings\.xml$/.test(lower) && lower.includes("res/values")) return 80;
  if (/activity\.kt$/i.test(base) || base === "MainActivity.kt") return 70;
  if (content.includes("@Composable") || content.includes("setContent")) return 60;
  if (/viewmodel|player|screen/i.test(base)) return 55;
  if (lower.endsWith(".kt") || lower.endsWith(".java")) return 40;
  if (lower.includes("res/layout/")) return 30;
  if (base === "build.gradle" || base === "build.gradle.kts" || base === "settings.gradle.kts") return 20;
  return 10;
}

/**
 * Busca (do lado do servidor) os arquivos de texto relevantes de um repositorio
 * GitHub, priorizados e cortados para caber num orcamento de contexto de IA.
 * Retorna null se o repositorio nao puder ser obtido (privado sem token, 404,
 * URL invalida, etc).
 */
export async function fetchRepoTextFiles(
  repoUrl: string,
  branch: string | null,
  githubToken: string | null,
): Promise<RepoFile[] | null> {
  const m = /github\.com[/:]([^/]+)\/([^/.?#]+)/i.exec(repoUrl || "");
  if (!m) return null;
  const owner = m[1];
  const repo = m[2].replace(/\.git$/, "");

  const headers: Record<string, string> = { "User-Agent": "BuildForge" };
  if (githubToken) headers.Authorization = "token " + githubToken;

  const branches = [branch || "main", "main", "master"];
  let raw: Buffer | null = null;
  for (const b of branches) {
    const url = `https://codeload.github.com/${owner}/${repo}/tar.gz/refs/heads/${b}`;
    const gz = await fetchBuffer(url, headers, 0);
    if (gz) {
      try {
        raw = zlib.gunzipSync(gz);
        break;
      } catch {
        // tenta a proxima branch
      }
    }
  }
  if (!raw) return null;

  const extracted = extractTarInMemory(raw);
  const candidates: { path: string; content: string; priority: number }[] = [];

  for (const entry of extracted) {
    // remove o prefixo "<repo>-<sha>/" que o tarball do GitHub sempre inclui
    const relPath = entry.path.replace(/^[^/]+\//, "");
    if (!relPath) continue;
    if (isExcludedPath(relPath)) continue;
    if (hasBinaryExtension(relPath)) continue;
    if (!hasTextExtension(relPath)) continue;

    let content: string;
    try {
      content = entry.buffer.toString("utf8");
    } catch {
      continue;
    }
    if (content.includes("�")) continue; // provavelmente binario
    if (content.length > MAX_FILE_CHARS) content = content.slice(0, MAX_FILE_CHARS) + "\n/* ...truncado... */";

    candidates.push({ path: relPath, content, priority: priorityOf(relPath, content) });
  }

  candidates.sort((a, b) => b.priority - a.priority);

  const included: RepoFile[] = [];
  const omitted: string[] = [];
  let usedChars = 0;
  for (const c of candidates) {
    if (usedChars + c.content.length > TOTAL_CHAR_BUDGET) {
      omitted.push(c.path);
      continue;
    }
    included.push({ path: c.path, content: c.content });
    usedChars += c.content.length;
  }

  if (omitted.length) {
    included.push({
      path: "__omitted_files_note.txt",
      content:
        "Os seguintes arquivos existem no projeto original mas foram omitidos por limite de tamanho " +
        "(o conteudo deles nao foi incluido no contexto): \n" + omitted.join("\n"),
    });
  }

  return included;
}
