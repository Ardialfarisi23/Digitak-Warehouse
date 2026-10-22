const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resolveFromBoq(tx, boqId) {
  if (!boqId) return null;
  const row = await tx.boq.findUnique({ where: { boq_id: Number(boqId) }, select: { cluster_id: true } });
  return row?.cluster_id || null;
}

async function resolveFromTiket(tx, tiketId) {
  if (!tiketId) return null;
  const row = await tx.tiket_material.findUnique({ where: { tiket_id: Number(tiketId) }, select: { cluster_id: true } });
  return row?.cluster_id || null;
}

async function resolveFromSuratJalan(tx, suratJalanId) {
  if (!suratJalanId) return null;
  const row = await tx.surat_jalan.findUnique({ where: { surat_jalan_id: Number(suratJalanId) }, select: { cluster_id: true } });
  return row?.cluster_id || null;
}

async function resolveFromSuratJalanItem(tx, suratJalanItemId) {
  if (!suratJalanItemId) return null;
  const row = await tx.surat_jalan_item.findUnique({ where: { item_id: Number(suratJalanItemId) }, select: { cluster_id: true } });
  return row?.cluster_id || null;
}

async function resolveFromProjectSingleCluster(tx, projectId) {
  if (!projectId) return null;
  const count = await tx.cluster.count({ where: { project_id: Number(projectId) } });
  if (count !== 1) return null;
  const row = await tx.cluster.findFirst({ where: { project_id: Number(projectId) }, select: { cluster_id: true } });
  return row?.cluster_id || null;
}

async function assertClusterExists(tx, clusterId) {
  if (!clusterId) return;
  const row = await tx.cluster.findUnique({ where: { cluster_id: normalizeClusterId(clusterId) } });
  if (!row) {
    throw new Error(`Cluster ID "${clusterId}" tidak ditemukan.`);
  }
}

function normalizeClusterId(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (str === '' || str.toLowerCase() === 'null') return null;
  return str;
}

function warnNull(tabel, konteks) {
  console.warn(`[cluster_id NULL] tabel=${tabel}`, konteks || '');
}

async function ledgerClusterFor(tx, { suratJalanItemId, returnTransactionId }) {
  if (suratJalanItemId) {
    const row = await tx.surat_jalan_item.findUnique({ where: { item_id: Number(suratJalanItemId) }, select: { cluster_id: true } });
    if (row?.cluster_id) return row.cluster_id;
  }
  if (returnTransactionId) {
    const row = await tx.return_transaction.findUnique({ where: { return_id: Number(returnTransactionId) }, select: { cluster_id: true } });
    if (row?.cluster_id) return row.cluster_id;
  }
  return null;
}

module.exports = {
  normalizeClusterId,
  resolveFromBoq,
  resolveFromTiket,
  resolveFromSuratJalan,
  resolveFromSuratJalanItem,
  resolveFromProjectSingleCluster,
  assertClusterExists,
  warnNull,
  ledgerClusterFor,
};
