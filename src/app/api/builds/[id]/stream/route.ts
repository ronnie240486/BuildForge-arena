import { db } from "@/db";
import { builds } from "@/db/schema";
import { eq } from "drizzle-orm";
import { executeBuild } from "@/lib/build-runner";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [build] = await db.select().from(builds).where(eq(builds.id, id)).limit(1);
  if (!build) return new Response("Build not found", { status: 404 });

  // Only DEMO builds run the in-app simulation. REAL builds are driven by an
  // external worker that posts logs/progress — we just relay the DB state.
  if (build.mode !== "real" && (build.status === "queued" || build.status === "running")) {
    void executeBuild(id);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      let emitted = 0;
      let lastProgress = -1;
      let lastStatus = "";

      // Guard: demo builds finish fast; real builds can take 20-40 min (npm+gradle).
      // ~0.45s por iteracao: 4000 iteracoes ~= 30 min por conexao SSE.
      const maxIterations = build.mode === "real" ? 4000 : 120;
      for (let i = 0; i < maxIterations; i++) {
        const [b] = await db.select().from(builds).where(eq(builds.id, id)).limit(1);
        if (!b) break;

        const lines = b.log ? b.log.split("\n") : [];
        for (let j = emitted; j < lines.length; j++) {
          if (lines[j]) send({ type: "line", line: lines[j] });
        }
        emitted = lines.length;

        if (b.progress !== lastProgress || b.status !== lastStatus) {
          send({ type: "progress", progress: b.progress, status: b.status });
          lastProgress = b.progress;
          lastStatus = b.status;
        }

        if (["success", "failed", "canceled"].includes(b.status)) {
          send({ type: "done", status: b.status, summary: b.summary });
          break;
        }
        await sleep(450);
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
