"use client";

import { useCallback, useEffect, useState } from "react";
import { useApi } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type Warehouse = { id: string; nama_gudang: string };
type Project = { id: string; nama_project: string; area: string };
type ApprovalItem = {
  id: string;
  isOutbound: boolean;
  tag?: string;
  direction: string;
  partner: string;
  status: "Menunggu" | "Disetujui" | "Ditolak";
};
type ActivityLogItem = {
  time: string;
  activity: string;
  actor: string;
  result: string;
  resultTone: string;
};

const MOCK_WAREHOUSES: Warehouse[] = [
  { id: "wh-1", nama_gudang: "Gudang Utama" },
  { id: "wh-2", nama_gudang: "Gudang Transit" },
];

const MOCK_PROJECTS: Project[] = [
  { id: "prj-1", nama_project: "RW 05", area: "Jakarta Selatan" },
  { id: "prj-2", nama_project: "Backbone JKT", area: "Jakarta Pusat" },
];

const MOCK_APPROVAL_LIST: ApprovalItem[] = [
  { id: "SJ-2024001", isOutbound: false, direction: "Inbound", partner: "PT Supplier A", status: "Menunggu" },
  { id: "SJ-2024002", isOutbound: true, tag: "KRITIS", direction: "Outbound", partner: "Project RW 05", status: "Menunggu" },
  { id: "SJ-2024003", isOutbound: false, direction: "Inbound", partner: "Gudang Transit", status: "Menunggu" },
];

const MOCK_ACTIVITY_LOG: ActivityLogItem[] = [
  { time: "10:42 WIB", activity: "Approve SJ-2024000", actor: "Andi P.", result: "Sukses", resultTone: "bg-emerald-100 text-emerald-700" },
  { time: "10:15 WIB", activity: "Scan Inbound Pallet A", actor: "Budi", result: "Selesai", resultTone: "bg-emerald-100 text-emerald-700" },
];

export function useSupervisorDashboard() {
  const { get } = useApi();

  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [warehouses, setWarehouses] = useState<Warehouse[]>(MOCK_WAREHOUSES);
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [approvalList, setApprovalList] = useState<ApprovalItem[]>(MOCK_APPROVAL_LIST);
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>(MOCK_ACTIVITY_LOG);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await get(`${API_BASE}/api/dashboard/supervisor`);

        if (!res.ok) return;

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) return;

        const json = await res.json();

        if (!json) return;

        setWarehouses(json.warehouses?.length ? json.warehouses : MOCK_WAREHOUSES);
        setProjects(json.projects?.length ? json.projects : MOCK_PROJECTS);
        setApprovalList(json.approvalList?.length ? json.approvalList : MOCK_APPROVAL_LIST);
        setActivityLog(json.activityLog?.length ? json.activityLog : MOCK_ACTIVITY_LOG);
      } catch {
        // FALLBACK: keep mock data already in state
      }
    };

    void fetchData();
  }, [get]);

  const handleFilterChange = useCallback((type: "warehouse" | "project", value: string) => {
    if (type === "warehouse") {
      setSelectedWarehouse(value);
    } else {
      setSelectedProject(value);
    }
  }, []);

  const handleApprove = useCallback((id: string) => {
    setApprovalList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "Disetujui" } : item
      )
    );

    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")} WIB`;

    setActivityLog((prev) => [
      {
        time: timeString,
        activity: `Approve ${id}`,
        actor: "Anda",
        result: "Sukses",
        resultTone: "bg-emerald-100 text-emerald-700",
      },
      ...prev,
    ]);
  }, []);

  return {
    selectedWarehouse,
    selectedProject,
    warehouses,
    projects,
    approvalList,
    activityLog,
    handleFilterChange,
    handleApprove,
  };
}
