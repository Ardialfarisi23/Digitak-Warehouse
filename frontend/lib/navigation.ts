import {
  LayoutDashboard,
  Database,
  ClipboardList,
  Truck,
  Warehouse,
  RefreshCw,
  FileBarChart,
  UserCog,
  ClipboardCheck,
  Home,
  PackageCheck,
  MapPin,
  LucideIcon,
} from "lucide-react";

export type UserRole = "admin" | "supervisor" | "staff";

const ROLE_BACKEND_TO_FRONTEND: Record<string, UserRole> = {
  admin_general: "admin",
  supervisor: "supervisor",
  staf_gudang: "staff",
};

export function mapRole(role?: string): UserRole {
  if (!role) return "staff";
  return ROLE_BACKEND_TO_FRONTEND[role.toLowerCase()] || "staff";
}

export function formatRole(role?: string): string {
  const mapped = mapRole(role);
  const labels: Record<UserRole, string> = {
    admin: "Admin General",
    supervisor: "Supervisor",
    staff: "Staf Gudang",
  };
  return labels[mapped] || role || "User";
}

export interface NavItem {
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
  section?: string;
}

export const navigationConfig: NavItem[] = [
  {
    id: "dashboard-admin",
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin"],
    section: "utama",
  },
  {
    id: "master-data-admin",
    title: "Master Data",
    href: "/master-data",
    icon: Database,
    roles: ["admin"],
    section: "master",
  },
  {
    id: "boq-admin",
    title: "BOQ & Tiket",
    href: "/dashboard/boq",
    icon: ClipboardList,
    roles: ["admin"],
    section: "operasional",
  },
  {
    id: "delivery-admin",
    title: "Surat Jalan",
    href: "/dashboard/delivery",
    icon: Truck,
    roles: ["admin"],
    section: "operasional",
  },
  {
    id: "delivery-supervisor",
    title: "Surat Jalan",
    href: "/dashboard/supervisor/delivery", 
    icon: Truck,
    roles: ["supervisor"], 
    section: "operasional",
  },
  {
    id: "warehouse-admin",
    title: "Gudang & Layout",
    href: "/dashboard/warehouse",
    icon: Warehouse,
    roles: ["admin"],
    section: "operasional",
  },
  {
    id: "reconciliation-admin",
    title: "Rekonsiliasi",
    href: "/dashboard/reconciliation",
    icon: RefreshCw,
    roles: ["admin"],
    section: "operasional",
  },
  {
    id: "reports-admin",
    title: "Laporan & Audit",
    href: "/dashboard/reports",
    icon: FileBarChart,
    roles: ["admin"],
    section: "laporan",
  },
  {
    id: "users-admin",
    title: "Manajemen Pengguna",
    href: "/dashboard/users",
    icon: UserCog,
    roles: ["admin"],
    section: "admin",
  },
  {
    id: "dashboard-supervisor",
    title: "Dashboard Supervisor",
    href: "/dashboard/supervisor",
    icon: LayoutDashboard,
    roles: ["supervisor"],
    section: "utama",
  },
  {
    id: "approvals-supervisor",
    title: "Approval",
    href: "/dashboard/supervisor/approval",
    icon: ClipboardCheck,
    roles: ["supervisor"],
    section: "operasional",
  },
  {
    id: "operational-supervisor",
    title: "Data Operasional & Tim",
    href: "/dashboard/supervisor/operasional",
    icon: UserCog,
    roles: ["supervisor"],
    section: "operasional",
  },
  {
    id: "master-data-supervisor",
    title: "Master Data",
    href: "/master-data",
    icon: Database,
    roles: ["supervisor"],
    section: "data",
  },
  {
    id: "reconciliation-supervisor",
    title: "Rekonsiliasi & Area",
    href: "/dashboard/supervisor/reconciliation",
    icon: RefreshCw,
    roles: ["supervisor"],
    section: "rekonsiliasi",
  },
  {
    id: "tasks-staff",
    title: "Tugas Saya",
    href: "/staff/dashboard",
    icon: Home,
    roles: ["staff"],
    section: "utama",
  },
  {
    id: "outbound-staff",
    title: "Surat Jalan",
    href: "/staff/outbound",
    icon: Truck,
    roles: ["staff"],
    section: "operasional",
  },
  {
    id: "inbound-staff",
    title: "Penerimaan",
    href: "/staff/inbound",
    icon: PackageCheck,
    roles: ["staff"],
    section: "operasional",
  },
  {
    id: "putaway-staff",
    title: "Lokasi & Rak",
    href: "/staff/putaway",
    icon: MapPin,
    roles: ["staff"],
    section: "operasional",
  },
];