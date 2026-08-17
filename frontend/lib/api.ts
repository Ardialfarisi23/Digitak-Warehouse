"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

export function useApi() {
  const router = useRouter();
  const { token, logout } = useAuth();

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
        (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      if (response.status === 401 || response.status === 403) {
        logout();
        sessionStorage.setItem("flash:session_expired", "Sesi Anda telah berakhir, silakan login kembali.");
        router.replace("/");
        throw new Error("Sesi berakhir. Silakan login kembali.");
      }

      return response;
    },
    [token, logout, router]
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