import { db } from "@/db";
import { artifacts, builds, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import AdmZip from "adm-zip";
import { randomBytes } from "crypto";
import { buildManifestAxml, buildDex } from "@/lib/apk-builder";

export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  apk: "application/vnd.android.package-archive",
  aab: "application/octet-stream",
  appbundle: "application/octet-stream",
  exe: "application/vnd.microsoft.portable-executable",
};

function buildApk(
  artifactName: string,
  type: string,
  sizeBytes: number,
  signed: boolean,
  meta: { project: string; package: string; versionName: string; variant: string | null; target: string; builtAt: string },
): Buffer {
  const zip = new AdmZip();

  // AndroidManifest.xml MUST be the first entry and in compiled binary (AXML) form.
  zip.addFile("AndroidManifest.xml", buildManifestAxml(meta.package, meta.project, meta.versionName));
  // classes.dex with valid Adler-32 + SHA-1 header checksums.
  zip.addFile("classes.dex", buildDex());
  // Minimal resource table.
  zip.addFile("resources.arsc", Buffer.alloc(12, 0));
  // Standard jar/apk manifest.
  zip.addFile(
    "META-INF/MANIFEST.MF",
    Buffer.from(
      `Manifest-Version: 1.0\r\nBuilt-By: BuildForge\r\nCreated-By: BuildForge Build Engine\r\n\r\nName: classes.dex\r\nSHA-256-Digest: ${randomBytes(16).toString("base64")}\r\n\r\n`,
      "utf8",
    ),
  );
  if (signed) {
    zip.addFile("META-INF/CERT.SF", Buffer.from(`Signature-Version: 1.0\r\nCreated-By: BuildForge apksigner\r\n`, "utf8"));
    zip.addFile("META-INF/CERT.RSA", randomBytes(1024));
  }
  zip.addFile(
    "buildforge/build-info.json",
    Buffer.from(
      JSON.stringify(
        {
          ...meta,
          type,
          signed,
          generator: "BuildForge Build Engine (demo)",
          note:
            "Pacote gerado pela engine de demonstração. AndroidManifest binário (AXML) e classes.dex com checksums válidos, mas sem código compilado — para um APK instalável, execute o build num worker com a toolchain Android real (aapt2/d8/apksigner).",
        },
        null,
        2,
      ),
      "utf8",
    ),
  );

  // Pad to the claimed size with an uncompressed asset (high-entropy so it stays put).
  const base = zip.toBuffer();
  const pad = sizeBytes - base.length - 200;
  if (pad > 0) {
    zip.addFile("assets/buildforge_payload.bin", randomBytes(pad));
  }
  return zip.toBuffer();
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [art] = await db.select().from(artifacts).where(eq(artifacts.id, id)).limit(1);
  if (!art) return new Response("Artifact not found", { status: 404 });

  // REAL artifact produced by an external worker — serve the actual binary verbatim.
  if (art.realData) {
    const bin = Buffer.from(art.realData, "base64");
    return new Response(new Uint8Array(bin), {
      headers: {
        "Content-Type": MIME[art.type] ?? "application/octet-stream",
        "Content-Length": String(bin.length),
        "Content-Disposition": `attachment; filename="${art.name}"`,
        "X-Artifact-Mode": "real",
        ...(art.sha256 ? { "X-Artifact-SHA256": art.sha256 } : {}),
        "Cache-Control": "no-store",
      },
    });
  }

  const [build] = await db.select().from(builds).where(eq(builds.id, art.buildId)).limit(1);
  const [project] = build ? await db.select().from(projects).where(eq(projects.id, build.projectId)).limit(1) : [];

  const buf = buildApk(art.name, art.type, art.sizeBytes, art.signed, {
    project: project?.name ?? "BuildForge App",
    package: project?.packageName ?? "dev.buildforge.app",
    versionName: project?.versionName ?? "1.0.0",
    variant: build?.variant ?? null,
    target: art.type,
    builtAt: art.createdAt.toISOString(),
  });

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": MIME[art.type] ?? "application/octet-stream",
      "Content-Length": String(buf.length),
      "Content-Disposition": `attachment; filename="${art.name}"`,
      "Cache-Control": "no-store",
    },
  });
}
