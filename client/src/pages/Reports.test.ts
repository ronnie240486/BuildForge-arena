import { describe, expect, it } from "vitest";
import { matchesReportBuildFilters } from "./Reports";

describe("filtros de relatórios", () => {
  const now = Date.UTC(2026, 7, 14);

  it("filtra builds por cliente, projeto, status e período", () => {
    const build = { projectName: "Aplicativo Loja", clientId: 8, status: "succeeded", createdAt: new Date(now - 2 * 86_400_000) };

    expect(matchesReportBuildFilters(build, { project: "all", client: "8", status: "all", periodDays: "7" }, now)).toBe(true);
    expect(matchesReportBuildFilters(build, { project: "Aplicativo Loja", client: "8", status: "succeeded", periodDays: "7" }, now)).toBe(true);
    expect(matchesReportBuildFilters(build, { project: "Outro projeto", client: "8", status: "succeeded", periodDays: "7" }, now)).toBe(false);
    expect(matchesReportBuildFilters(build, { project: "all", client: "9", status: "all", periodDays: "all" }, now)).toBe(false);
    expect(matchesReportBuildFilters(build, { project: "all", client: "8", status: "failed", periodDays: "all" }, now)).toBe(false);
    expect(matchesReportBuildFilters(build, { project: "all", client: "8", status: "all", periodDays: "1" }, now)).toBe(false);
  });
});
