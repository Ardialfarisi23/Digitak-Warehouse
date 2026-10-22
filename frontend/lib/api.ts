"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;

export function useApi() {
  const router = useRouter();
  const { logout, isLoggingOut } = useAuth();

  const isLoggingOutRef = useRef(isLoggingOut);
  useEffect(() => {
    isLoggingOutRef.current = isLoggingOut;
  }, [isLoggingOut]);

  const doRefresh = useCallback(async (): Promise<string | null> => {
    const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        await res.json().catch(() => ({}));
        if (res.status === 401 || res.status === 403) {
          return "logout";
        }
        return null;
      }

      const resData = await res.json();
      const newToken = resData?.data?.token;
      if (newToken && typeof window !== "undefined") {
        localStorage.setItem("token", newToken);
      }
      return newToken;
    } catch {
      return "network_error";
    }
  }, []);

  const request = useCallback(
    async (url: string, options: FetchOptions = {}) => {
      const { skipAuth = false, ...fetchOptions } = options;

      const isFormData = fetchOptions.body instanceof FormData;
      const headers: Record<string, string> = {
        ...(fetchOptions.headers as Record<string, string> || {}),
      };

      if (!isFormData) {
        headers["Content-Type"] = "application/json";
      }

      const currentToken = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!skipAuth && currentToken) {
        headers["Authorization"] = `Bearer ${currentToken}`;
      }

      let response: Response;
      try {
        response = await fetch(url, {
          ...fetchOptions,
          headers,
        });
      } catch (networkErr) {
        const msg =
          networkErr instanceof Error
            ? networkErr.message
            : "Gagal terhubung ke server.";
        throw new Error(
          `Koneksi ke server gagal (${url}). Pastikan backend berjalan. Detail: ${msg}`
        );
      }

      if (response.status === 401) {
        const err = await response.clone().json().catch(() => null);

        if (err?.code === "ACCOUNT_DEACTIVATED") {
          window.dispatchEvent(new CustomEvent("app:account-deactivated"));
          return response;
        }

        const isAuthEndpoint = url.includes("/api/auth/login") || url.includes("/api/auth/refresh") || url.includes("/api/auth/logout") || url.includes("/api/auth/reset-password");

        if (isAuthEndpoint) {
          logout();
          if (!isLoggingOutRef.current) {
            sessionStorage.setItem("flash:session_expired", "Sesi Anda telah berakhir, silakan login kembali.");
            router.replace("/");
            throw new Error("Sesi berakhir. Silakan login kembali.");
          } else {
            router.replace("/");
          }
          return response;
        }

        if (!refreshPromise) {
          refreshPromise = doRefresh();
        }

        const refreshResult = await refreshPromise;
        refreshPromise = null;

        if (refreshResult === "logout") {
          logout();
          if (!isLoggingOutRef.current) {
            sessionStorage.setItem("flash:session_expired", "Sesi Anda telah berakhir, silakan login kembali.");
            router.replace("/");
            throw new Error("Sesi berakhir. Silakan login kembali.");
          } else {
            router.replace("/");
          }
          return response;
        }

        if (refreshResult === "network_error") {
          throw new Error("Gagal memperbarui token. Silakan coba lagi.");
        }

        if (refreshResult) {
          const latestToken = typeof window !== "undefined" ? localStorage.getItem("token") : null;
          if (latestToken && latestToken !== currentToken) {
            headers["Authorization"] = `Bearer ${latestToken}`;
            try {
              const retryResponse = await fetch(url, {
                ...fetchOptions,
                headers,
              });
              return retryResponse;
            } catch (retryErr) {
              const msg =
                retryErr instanceof Error
                  ? retryErr.message
                  : "Gagal terhubung ke server.";
              throw new Error(
                `Koneksi ke server gagal saat retry (${url}). Detail: ${msg}`
              );
            }
          }
        }

        logout();
        if (!isLoggingOutRef.current) {
          sessionStorage.setItem("flash:session_expired", "Sesi Anda telah berakhir, silakan login kembali.");
          router.replace("/");
          throw new Error("Sesi berakhir. Silakan login kembali.");
        } else {
          router.replace("/");
        }
      }

      if (response.status === 403) {
        console.warn(`[403 Forbidden] Akses ditolak untuk endpoint: ${url}`);
        try {
          const cloned = response.clone();
          const data = await cloned.json();
          if (data?.code === "MUST_CHANGE_PASSWORD") {
            router.replace("/dashboard/change-password");
          }
        } catch {}
        return response;
      }

      return response;
    },
    [logout, router, doRefresh]
  );

  const get = useCallback(
    (url: string, options?: FetchOptions) =>
      request(url, { ...options, method: "GET" }),
    [request]
  );

  const post = useCallback(
    (url: string, data?: unknown, options?: FetchOptions) =>
      request(url, {
        ...options,
        method: "POST",
        body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
        headers: data instanceof FormData ? { ...(options?.headers || {}) } : { ...(options?.headers || {}) },
      }),
    [request]
  );

  const put = useCallback(
    (url: string, data?: unknown, options?: FetchOptions) =>
      request(url, {
        ...options,
        method: "PUT",
        body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
        headers: data instanceof FormData ? { ...(options?.headers || {}) } : { ...(options?.headers || {}) },
      }),
    [request]
  );

  const del = useCallback(
    (url: string, options?: FetchOptions) =>
      request(url, { ...options, method: "DELETE" }),
    [request]
  );

  const patch = useCallback(
    (url: string, options?: FetchOptions) =>
      request(url, { ...options, method: "PATCH" }),
    [request]
  );

  return { request, get, post, put, patch, del };
}

/**
 * Ubah response gagal menjadi Error yang pesannya diambil dari body server.
 *
 * Dipakai halaman yang sebelumnya membuang pesan asli server dan menampilkan
 * string generik, sehingga penyebab sebenarnya (mis. 403 "Anda belum ditugaskan
 * ke gudang mana pun") ikut hilang dan sulit ditelusuri.
 *
 * Halaman baru memanggil `ensureOk(res, "pesan cadangan")` alih-alih
 * `if (!res.ok) throw new Error("pesan cadangan")`. Kalau response-nya sukses,
 * fungsi ini mengembalikan response sehingga bisa langsung dipakai berikutnya.
 */
export async function ensureOk(
  response: Response,
  pesanCadangan: string
): Promise<Response> {
  if (response.ok) return response;

  let pesanServer: string | null = null;

  try {
    const data = await response.clone().json();
    if (typeof data?.message === "string" && data.message.trim() !== "") {
      pesanServer = data.message;
    }
  } catch {
    pesanServer = null;
  }

  throw new Error(pesanServer ?? pesanCadangan);
}