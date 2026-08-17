"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";
import { Plus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { mapRole } from "@/lib/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export default function AddUserPage() {
  const router = useRouter();
  const { post } = useApi();

  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("supervisor");
  const [password, setPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    if (!token || !user) {
      setError("Anda harus login sebagai Admin sebelum membuat pengguna.");
      setIsSaving(false);
      return;
    }

    if (mapRole(user.role) !== "admin") {
      setError("Hanya Admin General yang dapat membuat pengguna.");
      setIsSaving(false);
      return;
    }

    try {
      const body = { nama, email, role, password };
      const res = await post(`${API_BASE}/api/users`, body);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || "Gagal membuat pengguna.");
      }

      // Navigate back to list and force reload so new user appears
      router.push("/dashboard/users");
      setTimeout(() => window.location.reload(), 300);
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Tambah Pengguna</h1>
        <p className="mt-1 text-sm text-slate-500">Buat akun baru untuk sistem.</p>
      </header>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm max-w-2xl">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col">
            <span className="text-sm text-slate-600">Nama</span>
            <input
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="mt-1 rounded-md border border-slate-200 px-3 py-2"
              required
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm text-slate-600">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 rounded-md border border-slate-200 px-3 py-2"
              required
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm text-slate-600">Role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 rounded-md border border-slate-200 px-3 py-2"
            >
              <option value="admin_general">Admin General</option>
              <option value="supervisor">Supervisor</option>
              <option value="staf_gudang">Staf Gudang</option>
            </select>
          </label>

          <label className="flex flex-col">
            <span className="text-sm text-slate-600">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 rounded-md border border-slate-200 px-3 py-2"
              required
            />
          </label>
        </div>

        {error ? (
          <div className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
        ) : null}

        <div className="mt-6 flex items-center gap-3">
          <Button type="submit" variant="default" className="inline-flex items-center gap-2" disabled={isSaving}>
            <Plus size={14} /> {isSaving ? "Menyimpan..." : "Buat Pengguna"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard/users")}>Batal</Button>
        </div>
      </form>
    </div>
  );
}
