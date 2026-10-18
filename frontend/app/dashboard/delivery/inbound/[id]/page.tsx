"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { mapRole } from "@/lib/navigation";
import { ArrowLeft } from "lucide-react";
import { SuratJalanInboundDetailView } from "@/components/surat-jalan/SuratJalanInboundDetailView";

const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

interface InboundDetail {
  nomor_surat_jalan?: string;
  status?: string;
  tipe?: string;
  tanggal?: string;
  [key: string]: unknown;
}

export default function AdminInboundDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { get } = useApi();
  const [detail, setDetail] = useState<InboundDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!user) return;
    const currentRole = mapRole(user.role);
    if (currentRole !== "admin") {
      router.replace("/dashboard/delivery");
    }
  }, [user, router]);

  useEffect(() => {
    let mounted = true;
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      setNotFound(false);
      try {
        const resp = await get(`${apiBase}/api/surat-jalan/${params.id}`);
        const json = await resp.json();
        if (!mounted) return;
        if (!json?.data) {
          setNotFound(true);
          setDetail(null);
        } else {
          setDetail(json.data);
        }
      } catch (err) {
        if (!mounted) return;
        console.error(err);
        if ((err as { status?: number })?.status === 404) setNotFound(true);
        else setError("Gagal memuat detail surat jalan.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchDetail();
    return () => {
      mounted = false;
    };
  }, [get, params.id]);

  const goBack = () => router.push("/dashboard/delivery?tab=INBOUND");

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-8 py-6">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#E8632C]" />
      </div>
    );
  }

  if (notFound || !detail) {
    return (
      <div className="px-8 py-6">
        <p className="text-slate-500">
          {notFound ? "Detail surat jalan tidak ditemukan." : error || "Detail surat jalan tidak ditemukan."}
        </p>
        <Button onClick={goBack} className="mt-4 rounded-xl bg-[#E8632C] px-4 py-2 text-sm text-white">
          Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] p-8 text-slate-800 mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={goBack}
          className="p-2.5 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm text-slate-600 cursor-pointer"
          title="Kembali"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Detail Surat Jalan</h1>
          <p className="mt-1 text-sm text-slate-500">{detail.nomor_surat_jalan as string}</p>
        </div>
      </div>
      <SuratJalanInboundDetailView data={detail as never} />
    </div>
  );
}
