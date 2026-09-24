"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function useAccountStatusGuard(intervalMs = 15000) {
  const router = useRouter();
  const { logout } = useAuth();

  const [showDeactivatedModal, setShowDeactivatedModal] = useState(false);
  const pollRef = useRef<number | null>(null);

  const handleReturnToLogin = () => {
    logout();
    router.push("/login");
  };

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

    pollRef.current = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;

      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await fetch(`${baseUrl}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          const err = await response.json().catch(() => null);
          if (err?.code === "ACCOUNT_DEACTIVATED") {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setShowDeactivatedModal(true);
          }
        }
      } catch {
        // abaikan error polling
      }
    }, intervalMs);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [intervalMs]);

  return { showDeactivatedModal, handleReturnToLogin };
}
