import { describe, expect, it } from "vitest";
import { isBuildCleanupEligible, partitionProjectsForCleanup } from "./buildforge-db";

describe("regras de limpeza administrativa", () => {
  it("remove apenas builds concluídas, falhas ou canceladas", () => {
    expect(isBuildCleanupEligible("succeeded")).toBe(true);
    expect(isBuildCleanupEligible("failed")).toBe(true);
    expect(isBuildCleanupEligible("cancelled")).toBe(true);
    expect(isBuildCleanupEligible("queued")).toBe(false);
    expect(isBuildCleanupEligible("running")).toBe(false);
  });

  it("preserva projetos que ainda possuem builds em fila ou em execução", () => {
    expect(partitionProjectsForCleanup([
      { id: 1, activeBuilds: 0 },
      { id: 2, activeBuilds: 1 },
      { id: 3, activeBuilds: 0 },
    ])).toEqual({ removableIds: [1, 3], skipped: 1 });
  });
});
