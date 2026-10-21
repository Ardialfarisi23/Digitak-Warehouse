"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { navigationConfig, UserRole } from "@/lib/navigation";
import { useSidebar } from "@/components/sidebar-context";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const SECTION_LABELS: Record<string, string> = {
  utama: "Utama",
  operasional: "Operasional",
  master: "Master Data",
  laporan: "Laporan & Audit",
  admin: "Administrasi",
  data: "Data",
  rekonsiliasi: "Rekonsiliasi",
};

const SUPERVISOR_ORDER = [
  "/dashboard/supervisor",
  "/master-data",
  "/dashboard/supervisor/boq",
  "/dashboard/supervisor/approval",
  "/dashboard/supervisor/operasional",
  "/dashboard/supervisor/warehousespv",
  "/dashboard/supervisor/reconciliation",
];

interface CompactSidebarProps {
  userRole: UserRole;
}

export function CompactSidebar({ userRole }: CompactSidebarProps) {
  const pathname = usePathname();
  const { collapsed, toggle, isMobile, mobileOpen, setMobileOpen } = useSidebar();
  const [hoveredItem, setHoveredItem] = useState<{ title: string; top: number; left: number } | null>(null);

  let filteredNav = navigationConfig.filter((item) =>
    item.roles.includes(userRole)
  );

  if (userRole === "supervisor") {
    filteredNav = filteredNav.sort((a, b) => {
      const aIndex = SUPERVISOR_ORDER.indexOf(a.href);
      const bIndex = SUPERVISOR_ORDER.indexOf(b.href);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }

  let activeRoute = filteredNav.reduce((matched, item) => {
    if (pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`))) {
      return item.href.length > matched.length ? item.href : matched;
    }
    return matched;
  }, "");

  if (
    pathname === "/dashboard/supervisor/delivery" ||
    pathname.startsWith("/dashboard/supervisor/delivery") ||
    pathname.startsWith("/dashboard/supervisor/approval/outbound")
  ) {
    const approvalItem = filteredNav.find((item) => item.href === "/dashboard/supervisor/approval");
    if (approvalItem) {
      activeRoute = approvalItem.href;
    }
  }

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isMobile && mobileOpen) {
        setMobileOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobile, mobileOpen, setMobileOpen]);

  const grouped = filteredNav.reduce<Record<string, typeof filteredNav>>((acc, item) => {
    let section = item.section || "lainnya";
    if (userRole === "supervisor") {
      section = "utama";
    }
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {});

  const sectionOrder = Object.keys(grouped);

const renderNavItems = (isMobileSidebar: boolean) => (
    <>
      <div className={`flex w-full flex-col ${isMobileSidebar ? "" : "items-center"}`}>
        {sectionOrder.map((section, idx) => (
          <div key={section} className="flex w-full flex-col">
            {!collapsed && !isMobileSidebar && SECTION_LABELS[section] && (
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {SECTION_LABELS[section]}
              </p>
            )}
            {isMobileSidebar && SECTION_LABELS[section] && (
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {SECTION_LABELS[section]}
              </p>
            )}
            <div className={`flex w-full flex-col justify-start gap-2 ${isMobileSidebar ? "" : collapsed ? "items-center" : ""}`}>
              {grouped[section].map((item) => {
                const Icon = item.icon;
                const isActive = item.href === activeRoute;

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => isMobileSidebar && setMobileOpen(false)}
                    className={`group relative flex items-center rounded-xl transition-all duration-200 ${
                      isMobileSidebar
                        ? `w-full px-3 py-2.5 ${
                            isActive
                              ? "bg-[#FF5500] text-white shadow-md shadow-orange-500/30"
                              : "text-slate-600 hover:bg-stone-200/60 hover:text-[#FF5500]"
                          }`
                        : collapsed
                          ? `h-11 w-11 items-center justify-center ${
                              isActive
                                ? "bg-[#FF5500] text-white shadow-md shadow-orange-500/30"
                                : "text-slate-500 hover:bg-stone-200/60 hover:text-[#FF5500]"
                            }`
                          : `w-full px-3 py-2.5 justify-start ${
                              isActive
                                ? "bg-[#FF5500]/10 text-[#FF5500] shadow-sm"
                                : "text-slate-600 hover:bg-stone-200/60 hover:text-[#FF5500]"
                            }`
                    }`}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        window.location.href = item.href;
                      }
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredItem({ title: item.title, top: rect.top + rect.height / 2, left: rect.right + 8 });
                    }}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    {!collapsed && !isMobileSidebar && isActive && (
                      <div className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-[#FF5500]" />
                    )}
                    <Icon
                      className={`h-5 w-5 shrink-0 ${!collapsed && !isMobileSidebar ? "mr-3" : ""}`}
                      strokeWidth={2.2}
                    />
                    {!collapsed && !isMobileSidebar && (
                      <span className="truncate text-sm font-medium">{item.title}</span>
                    )}
                    {isMobileSidebar && (
                      <span className="truncate text-sm font-medium">{item.title}</span>
                    )}
                  </Link>
                );
              })}
            </div>
            {isMobileSidebar && idx < sectionOrder.length - 1 && (
              <div className="my-3 border-t border-stone-200/60" />
            )}
          </div>
        ))}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <aside
          className={`fixed left-0 top-0 z-50 h-dvh w-64 transform bg-[#F5F3EF] transition-transform duration-300 ease-in-out md:hidden ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-16 items-center justify-center border-b border-stone-200/60">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/40 shadow-sm ring-1 ring-stone-200/70">
              <Image
                src="/logo-digitak.png"
                alt="Digitak Logo"
                width={28}
                height={28}
                className="object-contain"
                priority
              />
            </div>
          </div>
          <nav className="flex h-[calc(100dvh-4rem)] flex-col overflow-hidden px-3 py-[clamp(8px,2vh,16px)] gap-[clamp(3px,0.8vh,6px)]">
            {renderNavItems(true)}
          </nav>
        </aside>
        {hoveredItem && typeof document !== "undefined" && createPortal(
          <div
            style={{
              position: "fixed",
              top: hoveredItem.top,
              left: hoveredItem.left,
              transform: "translateY(-50%)",
              zIndex: 9999,
            }}
            className="pointer-events-none whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-xs text-white shadow-lg"
          >
            {hoveredItem.title}
          </div>,
          document.body
        )}
      </>
    );
  }

  return (
    <>
      <aside
        className={`hidden md:flex fixed left-0 top-0 z-30 h-screen flex-col bg-[#F5F3EF] border-r border-stone-200/60 shadow-xs transition-all duration-300 ease-in-out overflow-hidden ${
          collapsed ? "w-20" : "w-60"
        }`}
      >
        <div className="flex h-16 w-full items-center justify-center border-b border-stone-200/60 shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/40 shadow-sm ring-1 ring-stone-200/70">
            <Image
              src="/logo-digitak.png"
              alt="Digitak Logo"
              width={28}
              height={28}
              className="object-contain"
              priority
            />
          </div>
        </div>

        <nav className="flex w-full flex-1 flex-col justify-start items-center overflow-hidden px-2 py-2 gap-2">
          {renderNavItems(false)}
        </nav>

        <div className="flex w-full shrink-0 justify-center border-t border-stone-200/60 py-3">
          <button
            type="button"
            onClick={toggle}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-stone-200/60 hover:text-[#FF5500] transition-all duration-200"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>
      </aside>
      {hoveredItem && typeof document !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed",
            top: hoveredItem.top,
            left: hoveredItem.left,
            transform: "translateY(-50%)",
            zIndex: 9999,
          }}
          className="pointer-events-none whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-xs text-white shadow-lg"
        >
          {hoveredItem.title}
        </div>,
        document.body
      )}
    </>
  );
}
