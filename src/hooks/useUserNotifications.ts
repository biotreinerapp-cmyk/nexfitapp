import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type UserNotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: any;
  created_at: string;
  read_at: string | null;
};

export function useUserNotifications(userId: string | null) {
  const queryClient = useQueryClient();

  const enabled = Boolean(userId);

  const notificationsQuery = useQuery<UserNotificationRow[]>({
    queryKey: ["user-notifications", userId],
    enabled,
    // Garante que alternar aba/foco não dispare hard loading.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_notifications")
        .select("id,user_id,type,title,body,data,created_at,read_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return ((data ?? []) as unknown) as UserNotificationRow[];
    },
  });

  const unreadCountQuery = useQuery<number>({
    queryKey: ["user-notifications-unread-count", userId],
    enabled,
    // Garante que alternar aba/foco não dispare hard loading.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("user_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_notifications", filter: `user_id=eq.${userId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["user-notifications", userId] });
          void queryClient.invalidateQueries({ queryKey: ["user-notifications-unread-count", userId] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!userId) return;
      const { error } = await (supabase as any)
        .from("user_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["user-notifications", userId] });
      await queryClient.invalidateQueries({ queryKey: ["user-notifications-unread-count", userId] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await (supabase as any)
        .from("user_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["user-notifications", userId] });
      await queryClient.invalidateQueries({ queryKey: ["user-notifications-unread-count", userId] });
    },
  });

  const hasUnread = useMemo(() => (unreadCountQuery.data ?? 0) > 0, [unreadCountQuery.data]);

  return {
    notifications: notificationsQuery.data ?? [],
    notificationsLoading: notificationsQuery.isLoading,
    unreadCount: unreadCountQuery.data ?? 0,
    hasUnread,
    markAsRead,
    markAllAsRead,
  };
}
