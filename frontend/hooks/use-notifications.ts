"use client";

import { useEffect, useState, useCallback } from "react";
import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface NotificationItem {
  id: number;
  user_id: number | null;
  role: string | null;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

interface UseNotificationsResult {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotifications(): UseNotificationsResult {
  const { get, request } = useApi();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const res = await get(`${API_BASE}/api/notifications/unread-count`);
      if (res.ok) {
        const json = await res.json();
        if (json?.success && json?.data?.count !== undefined) {
          setUnreadCount(json.data.count);
        }
      }
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  }, [get, isAuthenticated]);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const res = await get(`${API_BASE}/api/notifications?limit=10`);
      if (res.ok) {
        const json = await res.json();
        if (json?.success && Array.isArray(json?.data?.items)) {
          setNotifications(json.data.items);
        }
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [get, isAuthenticated]);

  const markAsRead = useCallback(async (id: number) => {
    if (!isAuthenticated) return;

    try {
      const res = await request(`${API_BASE}/api/notifications/${id}/read`, {
        method: "PATCH",
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  }, [request, isAuthenticated]);

  const markAllAsRead = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const res = await request(`${API_BASE}/api/notifications/read-all`, {
        method: "PATCH",
        body: JSON.stringify({ is_read: true }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
        );
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  }, [request, isAuthenticated]);

  const refresh = useCallback(async () => {
    await Promise.all([fetchUnreadCount(), fetchNotifications()]);
  }, [fetchUnreadCount, fetchNotifications]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      return;
    }

    // Initial fetch on mount / auth change
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();

    const interval = setInterval(() => {
      fetchUnreadCount();
      fetchNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [authLoading, isAuthenticated, refresh, fetchUnreadCount, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh,
  };
}
