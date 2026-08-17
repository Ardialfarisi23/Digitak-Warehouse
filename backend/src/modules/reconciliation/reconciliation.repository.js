const prisma = require("../../config/prisma");

const getInventory = async (filters = {}) => {
  const {
    search = "",
    projectId = "all",
    warehouseId = "all",
    status = "all",
  } = filters;

  const whereBoq = {
    boq: {
      status: { in: ["draft", "aktif"] },
    },
  };

  if (projectId !== "all") {
    whereBoq.boq.tiket = { project_id: BigInt(projectId) };
  }

  if (warehouseId !== "all") {
    whereBoq.gudang_tujuan_id = BigInt(warehouseId);
  }

  const boqItems = await prisma.boq_item.findMany({
    where: whereBoq,
    include: {
      boq: {
        include: {
          tiket: {
            select: {
              tiket_id: true,
              kode_tiket: true,
              project: {
                select: {
                  project_id: true,
                  nama_project: true,
                  area: true,
                  cluster_id: true,
                },
              },
            },
          },
        },
      },
      barang: {
        select: {
          kode_perangkat: true,
          nama_barang: true,
        },
      },
      satuan: {
        select: {
          kode_satuan: true,
        },
      },
      gudang_tujuan: {
        select: {
          nama_gudang: true,
        },
      },
    },
  });

  const shipmentWhere = {
    surat_jalan: {
      status: { in: ["disetujui", "diterima_didistribusikan"] },
    },
  };

  if (projectId !== "all") {
    shipmentWhere.surat_jalan.project_id = BigInt(projectId);
  }

  const shipmentItems = await prisma.surat_jalan_item.findMany({
    where: shipmentWhere,
    include: {
      surat_jalan: {
        select: {
          tipe: true,
          project_id: true,
          boq_id: true,
        },
      },
    },
  });

  const inboundByProjectBarang = new Map();
  const outboundByProjectBarang = new Map();
  const additionalByProjectBarang = new Map();

  for (const item of shipmentItems) {
    const projectIdNum = Number(item.surat_jalan?.project_id);
    const barangId = String(item.barang_id);
    const qty = Number(item.qty || 0);
    const key = `${projectIdNum}-${barangId}`;

    if (item.surat_jalan?.tipe === "inbound") {
      if (item.is_kelebihan) {
        additionalByProjectBarang.set(
          key,
          (additionalByProjectBarang.get(key) || 0) + qty
        );
      } else {
        inboundByProjectBarang.set(
          key,
          (inboundByProjectBarang.get(key) || 0) + qty
        );
      }
    }

    if (item.surat_jalan?.tipe === "outbound") {
      outboundByProjectBarang.set(
        key,
        (outboundByProjectBarang.get(key) || 0) + qty
      );
    }
  }

  let rows = boqItems.map((item) => {
    const tiket = item.boq?.tiket;
    const project = tiket?.project;
    const projectIdNum = Number(project?.project_id || 0);
    const barangId = String(item.barang_id);
    const key = `${projectIdNum}-${barangId}`;

    const boq = Number(item.qty_rencana || 0);
    const additional = Number(additionalByProjectBarang.get(key) || 0);
    const mosSistem = Number(inboundByProjectBarang.get(key) || 0);
    const mosMitra = Number(tiket?.mos || 0);
    const used = Number(outboundByProjectBarang.get(key) || 0);
    const remains = mosSistem - (boq + additional);
    const selisih = mosMitra - mosSistem;

    let recStatus = "berjalan";
    if (remains < 0) {
      recStatus = "perhatian";
    } else if (mosSistem >= boq + additional && boq > 0) {
      recStatus = "sesuai";
    }

    return {
      id: String(item.boq_item_id),
      project_id: String(projectIdNum),
      project_nama: project?.nama_project || "-",
      cluster_id: project?.cluster_id || "-",
      area: project?.area || "-",
      tiket_id: String(tiket?.tiket_id || ""),
      kode_tiket: tiket?.kode_tiket || "-",
      barang_id: barangId,
      kode_perangkat: item.barang?.kode_perangkat || "-",
      nama_barang: item.barang?.nama_barang || "-",
      gudang_nama: item.gudang_tujuan?.nama_gudang || "-",
      satuan: item.satuan?.kode_satuan || "-",
      boq,
      additional,
      mos_sistem: mosSistem,
      mos_mitra: mosMitra,
      selisih,
      used,
      remains,
      status: recStatus,
    };
  });

  if (search.trim()) {
    const q = search.toLowerCase();
    rows = rows.filter((row) =>
      [
        row.project_nama,
        row.kode_tiket,
        row.kode_perangkat,
        row.nama_barang,
        row.gudang_nama,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }

  if (status !== "all") {
    rows = rows.filter((row) => row.status === status);
  }

  return { data: rows };
};

module.exports = {
  getInventory,
};
