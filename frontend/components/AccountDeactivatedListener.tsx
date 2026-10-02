"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ConfirmModal } from "@/components/ConfirmModal";

export function AccountDeactivatedListener() {
  const router = useRouter();
  const { logout } = useAuth();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    function handleAccountDeactivated() {
      setShowModal(true);
    }

    window.addEventListener("app:account-deactivated", handleAccountDeactivated);

    return () => {
      window.removeEventListener("app:account-deactivated", handleAccountDeactivated);
    };
  }, []);

  return (
    <ConfirmModal
      open={showModal}
      onConfirm={() => {
        logout();
        router.push("/login");
      }}
      onClose={() => {}}
      title="Akun Anda Dinonaktifkan"
      description="Akun Anda telah dinonaktifkan oleh admin. Anda akan diarahkan ke halaman login."
      confirmText="Kembali ke Login"
      cancelText=""
      dismissProof
    />
  );
}
