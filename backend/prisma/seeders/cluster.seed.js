async function seedClusters(prisma) {
  const admin = await prisma.user_account.findFirst({ where: { role: "admin_general" } });
  if (!admin) {
    throw new Error("Admin user belum tersedia. Jalankan user.seed.js lebih dulu.");
  }

  const projects = await prisma.project.findMany({
    where: { cluster_id: { not: null } },
    select: { project_id: true, cluster_id: true, nama_project: true },
  });

  let count = 0;
  for (const p of projects) {
    await prisma.cluster.upsert({
      where: { cluster_id: p.cluster_id },
      update: {
        project_id: p.project_id,
        nama_cluster: p.nama_project,
        status_aktif: true,
        created_by: admin.user_id,
        updated_by: admin.user_id,
      },
      create: {
        cluster_id: p.cluster_id,
        project_id: p.project_id,
        nama_cluster: p.nama_project,
        status_aktif: true,
        created_by: admin.user_id,
        updated_by: admin.user_id,
      },
    });
    count++;
    console.log(`✔ Cluster ${p.cluster_id} (${p.nama_project}) tersinkroni ke project_id=${p.project_id}.`);
  }

  console.log(`✔ Seeded ${count} cluster records`);
}

module.exports = seedClusters;
