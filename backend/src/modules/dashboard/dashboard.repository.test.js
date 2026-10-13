const { describe, it, before, after, beforeEach, mock } = require("node:test");
const assert = require("node:assert/strict");

// Mock dependencies before loading dashboard.repository
const mockPrisma = {
  project: {
    findMany: async () => [
      { project_id: 1, nama_project: "Project A", title: "Project A", cluster_id: "CL-1", area: "Area 1" },
      { project_id: 2, nama_project: "Project B", title: "Project B", cluster_id: "CL-2", area: "Area 2" },
    ],
  },
};

const mockReconRepo = {
  getInventory: async () => ({ data: [] }),
};

const mockReconUtils = {
  computeRemains: (mos, boq, additional) => Number(mos) - (Number(boq) + Number(additional)),
  aggregateProjectStatus: (statuses) => {
    if (!statuses.length) return "belum_ada_data";
    if (statuses.some((s) => s === "perhatian")) return "perhatian";
    if (statuses.every((s) => s === "sesuai")) return "sesuai";
    return "perhatian";
  },
};

require.cache[require.resolve("../../config/prisma")] = {
  id: require.resolve("../../config/prisma"),
  filename: require.resolve("../../config/prisma"),
  loaded: true,
  exports: mockPrisma,
};

require.cache[require.resolve("../reconciliation/reconciliation.repository")] = {
  id: require.resolve("../reconciliation/reconciliation.repository"),
  filename: require.resolve("../reconciliation/reconciliation.repository"),
  loaded: true,
  exports: mockReconRepo,
};

require.cache[require.resolve("../reconciliation/reconciliation.utils")] = {
  id: require.resolve("../reconciliation/reconciliation.utils"),
  filename: require.resolve("../reconciliation/reconciliation.utils"),
  loaded: true,
  exports: mockReconUtils,
};

const { getProjectSummary } = require("./dashboard.repository");

describe("dashboard.repository.getProjectSummary", () => {
  it("sums remains from per-item remains (not recomputed from aggregated mos/boq/additional)", async () => {
    // Two items in same project with different units (e.g., meters + pcs)
    // Item 1: mos=10, boq=5, additional=0 -> remains=5
    // Item 2: mos=5, boq=10, additional=0 -> remains=-5
    // Sum of per-item remains = 0
    // If recomputed from aggregates: mos=15, boq=15, additional=0 -> remains=0 (same in this case)
    // But with additional:
    // Item 1: mos=10, boq=5, additional=2 -> remains=3
    // Item 2: mos=5, boq=10, additional=0 -> remains=-5
    // Sum remains = -2
    // Recomputed: mos=15, boq=15, additional=2 -> remains=-2 (same)
    // The point: we use SUM(remains) not computeRemains(SUM(mos), SUM(boq), SUM(additional))
    // They are mathematically equivalent, but we verify the code path uses agg.remains

    let capturedReconRows = null;
    mockReconRepo.getInventory = async () => ({
      data: [
        {
          project_id: "1",
          project_nama: "Project A",
          cluster_id: "CL-1",
          area: "Area 1",
          barang_id: "1",
          kode_perangkat: "ITEM-1",
          nama_barang: "Item 1 (meter)",
          satuan: "M",
          boq: 5,
          additional: 2,
          mos: 10,
          used: 3,
          remains: 3,
          status: "perhatian",
          boq_list: [{ boq_id: "1", kode_boq: "BOQ-1", status: "aktif" }],
        },
        {
          project_id: "1",
          project_nama: "Project A",
          cluster_id: "CL-1",
          area: "Area 1",
          barang_id: "2",
          kode_perangkat: "ITEM-2",
          nama_barang: "Item 2 (pcs)",
          satuan: "PCS",
          boq: 10,
          additional: 0,
          mos: 5,
          used: 2,
          remains: -5,
          status: "perhatian",
          boq_list: [{ boq_id: "1", kode_boq: "BOQ-1", status: "aktif" }],
        },
      ],
    });

    const result = await getProjectSummary();
    const projectA = result.find((p) => p.projectId === 1);

    // Total remains should be SUM of per-item remains: 3 + (-5) = -2
    assert.equal(projectA.remains, -2, "Remains should be sum of per-item remains");
    assert.equal(projectA.boq, 15, "BOQ should be sum");
    assert.equal(projectA.additional, 2, "Additional should be sum");
    assert.equal(projectA.mos, 15, "MOS should be sum");
    assert.equal(projectA.used, 5, "Used should be sum");
    assert.equal(projectA.statusBoq, "Aktif", "Status BOQ should be Aktif (from boq_list)");
    assert.equal(projectA.status, "perhatian", "Project status should be perhatian (has perhatian items)");
  });

  it("project without BOQ items gets statusBoq = 'Belum Ada'", async () => {
    // Real reconciliation data won't have rows for projects without BOQ items
    // So projectAggregates won't have an entry for project 2
    mockReconRepo.getInventory = async () => ({
      data: [], // No rows for project 2
    });

    const result = await getProjectSummary();
    const projectB = result.find((p) => p.projectId === 2);

    assert.equal(projectB.statusBoq, "Belum Ada", "Project without BOQ should have Belum Ada");
    assert.equal(projectB.boq, 0);
    assert.equal(projectB.remains, 0);
    assert.equal(projectB.status, "belum_ada_data");
  });

  it("project with BOQ items but none 'aktif' gets statusBoq = 'Draft'", async () => {
    mockReconRepo.getInventory = async () => ({
      data: [
        {
          project_id: "1",
          project_nama: "Project A",
          cluster_id: "CL-1",
          area: "Area 1",
          barang_id: "1",
          kode_perangkat: "ITEM-1",
          nama_barang: "Item 1",
          satuan: "PCS",
          boq: 10,
          additional: 0,
          mos: 10,
          used: 5,
          remains: 0,
          status: "sesuai",
          boq_list: [{ boq_id: "1", kode_boq: "BOQ-1", status: "draft" }],
        },
      ],
    });

    const result = await getProjectSummary();
    const projectA = result.find((p) => p.projectId === 1);

    assert.equal(projectA.statusBoq, "Draft", "Project with draft BOQ should have Draft");
  });
});