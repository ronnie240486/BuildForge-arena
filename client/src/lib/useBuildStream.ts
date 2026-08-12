import { useEffect, useState } from "react";

type StreamLog = { sequence: number; level: string; message: string; createdAt: string };
type StreamState = { build: { status: "queued" | "running" | "succeeded" | "failed" | "cancelled"; progress: number; summary: string | null } | null; logs: StreamLog[] };

export function useBuildStream(buildId: number | null) {
  const [stream, setStream] = useState<StreamState>({ build: null, logs: [] });
  useEffect(() => {
    setStream({ build: null, logs: [] });
    if (!buildId) return;
    const source = new EventSource(`/api/builds/${buildId}/stream`);
    const onBuild = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as StreamState;
        setStream((current) => ({
          build: payload.build ?? current.build,
          logs: payload.logs?.length ? [...current.logs, ...payload.logs].filter((log, index, all) => all.findIndex((item) => item.sequence === log.sequence) === index).slice(-300) : current.logs,
        }));
      } catch { /* A tela mantém os dados consultados pelo tRPC caso o evento seja inválido. */ }
    };
    source.addEventListener("build", onBuild as EventListener);
    return () => source.close();
  }, [buildId]);
  return stream;
}
