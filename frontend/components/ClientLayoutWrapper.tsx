"use client";

import { usePathname } from "next/navigation";
import { GlobalHeader } from "@/components/GlobalHeader";

const AUTH_PATHS = ["/", "/forgot-password"];

export function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage = AUTH_PATHS.includes(pathname);

  return (
    <>
      {!isAuthPage && <GlobalHeader />}
      {children}
    </>
  );
}
