"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

export function useApi() {
  const router = useRouter();
  const { token, logout, isLoggingOut } = useAuth();

  const isLoggingOutRef = useRef(isLoggingOut);
  useEffect(() => {
    isLoggingOutRef.current = isLoggingOut;
  }, [isLoggingOut]);

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

      if (!skipAuth && token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      // 1. Sesi kadaluarsa / Token invalid -> Redirect ke login
      if (response.status === 401) {
        logout();
        if (!isLoggingOutRef.current) {
          sessionStorage.setItem(
            "flash:session_expired",
            "Sesi Anda telah berakhir, silakan login kembali."
          );
          router.replace("/");
          throw new Error("Sesi berakhir. Silakan login kembali.");
        } else {
          router.replace("/");
        }
      }

      // 2. Akses ditolak (Role tidak diizinkan) -> Jangan logout, biarkan UI menangani
      if (response.status === 403) {
        console.warn(`[403 Forbidden] Akses ditolak untuk endpoint: ${url}`);
        return response;
      }

      return response;
    },
    [token, logout, isLoggingOut, router]
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

  return { request, get, post, put, del };
}