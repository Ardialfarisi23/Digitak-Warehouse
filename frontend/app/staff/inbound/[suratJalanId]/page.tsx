"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function InboundDetailPage() {
  const params = useParams<{ suratJalanId: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace("/staff/inbound");
  }, [router]);

  return (
    <div className="px-8 py-6">
      <p className="text-gray-500">Mengalihkan ke daftar Inbound...</p>
      <Button
        onClick={() => router.push("/staff/inbound")}
        className="mt-3 text-sm font-semibold text-[#E8632C] hover:underline"
      >
        Kembali ke daftar Inbound
      </Button>
    </div>
  );
}
