import { NextResponse } from "next/server";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

export async function POST(request: Request) {
  try {
    const { email, token, newPassword } = await request.json();

    if (!email || !token || !newPassword) {
      return NextResponse.json(
        { success: false, message: "Email, token, dan kata sandi baru wajib diisi." },
        { status: 400 }
      );
    }

    const backendResp = await fetch(`${API_BASE}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token, newPassword }),
    });

    const contentType = backendResp.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.error("Reset password backend returned non-JSON response:", contentType);
      return NextResponse.json(
        { success: false, message: "Server mengembalikan respons tidak valid. Hubungi administrator." },
        { status: 502 }
      );
    }

    const data = await backendResp.json();

    if (!backendResp.ok) {
      return NextResponse.json(
        { success: false, message: data?.message || "Gagal memperbarui kata sandi." },
        { status: backendResp.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("Reset Password API Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Terjadi kesalahan server saat memperbarui kata sandi." },
      { status: 500 }
    );
  }
}
